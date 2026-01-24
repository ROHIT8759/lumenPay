

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  buildPaymentTransaction,
  signAndSubmitTransaction,
  recordTransaction,
  resolvePayId,
  getWalletForUser,
} from "@/lib/stellarService";
import { walletService } from "@/lib/walletService";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


const rateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count < 10) {
    limit.count++;
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    if (action === "initiate") {
      return await initiatePayment(userId, body);
    } else if (action === 'confirm') {
      return await confirmPayment(userId, body);
    } else if (action === 'status') {
      return await getPaymentStatus(userId, body);
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Payment API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


async function initiatePayment(userId: string, data: any) {
  try {
    const { recipientAddress, amount, asset, memo } = data;

    
    if (!recipientAddress || !amount || !asset) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    
    const publicKey = await walletService.getWalletPublicKey(userId);
    if (!publicKey) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    
    const { data: kycData } = await supabase
      .from('kyc_status')
      .select('is_verified')
      .eq('user_id', userId)
      .single();

    if (!kycData?.is_verified && parseFloat(amount) > 10000) {
      return NextResponse.json(
        { error: 'Unverified users cannot send more than 10,000 units' },
        { status: 403 }
      );
    }

    
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_limit, spending_today')
      .eq('id', userId)
      .single();

    if (
      profile &&
      profile.spending_today + parseFloat(amount) > profile.daily_limit
    ) {
      return NextResponse.json(
        {
          error: `Daily limit exceeded. Available: ${profile.daily_limit - profile.spending_today
            }`
        },
        { status: 403 }
      );
    }

    
    const txResult = await walletService.buildPaymentTransaction({
      sourcePublicKey: publicKey,
      destinationPublicKey: recipientAddress,
      amount,
      asset: asset === 'usdc' ? 'usdc' : 'native',
      memo
    });

    if (txResult.error) {
      return NextResponse.json({ error: txResult.error }, { status: 400 });
    }

    
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', userId)
      .single();

    const senderDisplayName = senderProfile?.display_name || senderProfile?.full_name || null;

    
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount,
        asset_code: asset.toUpperCase(),
        tx_type: 'payment_out',
        recipient_address: recipientAddress,
        sender_address: publicKey,
        sender_display_name: senderDisplayName,
        memo: memo,
        status: 'pending',
        meta_data: { xdr: txResult.xdr }
      })
      .select('id')
      .single();

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    return NextResponse.json({
      transactionId: txData.id,
      xdr: txResult.xdr,
      message: 'Transaction ready for confirmation'
    });
  } catch (error: any) {
    console.error('Initiate payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


async function confirmPayment(userId: string, data: any) {
  try {
    const { transactionId } = data;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (txError || !tx) {
      return NextResponse.json(
        { error: 'Transaction not found or already processed' },
        { status: 404 }
      );
    }

    
    const submitResult = await walletService.signAndSubmitTransaction({
      userId,
      transactionXdr: tx.meta_data.xdr
    });

    if (submitResult.error) {
      
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          error_message: submitResult.error
        })
        .eq('id', transactionId);

      return NextResponse.json(
        { error: submitResult.error },
        { status: 400 }
      );
    }

    
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        tx_hash: submitResult.txHash,
        status: 'processing',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    
    await supabase
      .from('profiles')
      .update({
        spending_today: tx.spending_today + parseFloat(tx.amount)
      })
      .eq('id', userId);

    
    await supabase
      .from('contacts')
      .upsert({
        user_id: userId,
        contact_address: tx.recipient_address,
        contact_name: tx.recipient_name || tx.recipient_address,
        contact_type: 'recent',
        last_transacted_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      txHash: submitResult.txHash,
      message: 'Payment submitted to Stellar network'
    });
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


async function getPaymentStatus(userId: string, data: any) {
  try {
    const { transactionId } = data;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    const { data: tx, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (error || !tx) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    
    if (tx.status === 'processing' && tx.tx_hash) {
      const txDetails = await walletService.getTransactionDetails(tx.tx_hash);
      if (txDetails) {
        await supabase
          .from('transactions')
          .update({ status: 'success' })
          .eq('id', transactionId);

        return NextResponse.json({
          status: 'success',
          transaction: tx
        });
      }
    }

    return NextResponse.json({
      status: tx.status,
      transaction: tx
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
