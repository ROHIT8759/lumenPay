

import { NextRequest, NextResponse } from 'next/server';
import { walletService } from '@/lib/walletService';
import { supabase } from '@/lib/supabaseClient';
import { jwtVerify } from 'jose';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');

    
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'lumenpay-jwt-secret-change-in-production');
    let userAddress: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      userAddress = payload.address as string;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (action === 'info') {
      return await getWalletInfo(userAddress);
    } else if (action === 'balance') {
      return await getWalletBalance(userAddress);
    } else if (action === 'transactions') {
      return await getTransactions(userAddress);
    } else {
      return NextResponse.json(
        { error: 'Unknown action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Wallet API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


async function getWalletInfo(userId: string) {
  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('public_key, wallet_type, created_at')
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    return NextResponse.json({
      publicKey: wallet.public_key,
      walletType: wallet.wallet_type,
      createdAt: wallet.created_at
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


async function getWalletBalance(userId: string) {
  try {
    const publicKey = await walletService.getWalletPublicKey(userId);
    if (!publicKey) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const balances = await walletService.getBalance(publicKey);
    if (balances.error) {
      return NextResponse.json({ error: balances.error }, { status: 500 });
    }

    
    await supabase
      .from('wallets')
      .update({
        balance_native: balances.native,
        balance_usdc: balances.usdc,
        last_sync_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return NextResponse.json({
      native: balances.native,
      usdc: balances.usdc,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


async function getTransactions(userId: string) {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      transactions: transactions || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
