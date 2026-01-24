

import { NextRequest, NextResponse } from 'next/server';
import { walletAbstraction } from '@/lib/walletAbstraction';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = new TextEncoder().encode(
    process.env.WALLET_JWT_SECRET || 'lumenvault-dev-secret-key-change-in-prod'
);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authorization required' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        let walletAddress: string;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            walletAddress = payload.address as string;
        } catch {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'initiate') {
            return await initiatePayment(walletAddress, body);
        } else if (action === 'record') {
            return await recordPayment(walletAddress, body);
        } else {
            return NextResponse.json(
                { error: 'Invalid action. Use "initiate" or "record"' },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error('Payment orchestrator error:', error);
        return NextResponse.json(
            { error: error.message || 'Payment failed' },
            { status: 500 }
        );
    }
}


async function initiatePayment(walletAddress: string, data: any) {
    const { recipientAddress, amount, assetCode, memo, network = 'testnet' } = data;

    if (!recipientAddress || !amount) {
        return NextResponse.json(
            { error: 'Missing required fields: recipientAddress, amount' },
            { status: 400 }
        );
    }

    const { data: kycData } = await supabase
        .from('kyc_status')
        .select('is_verified, kyc_level')
        .eq('wallet_address', walletAddress)
        .single();

    const kycLevel = kycData?.kyc_level || 0;
    const amountNum = parseFloat(amount);

    if (kycLevel < 1 && amountNum > 10000) {
        return NextResponse.json(
            { error: 'KYC verification required for payments over 10,000' },
            { status: 403 }
        );
    }

    walletAbstraction.setNetwork(network);

    const buildResult = await walletAbstraction.buildPaymentTransaction({
        sourcePublicKey: walletAddress,
        destinationPublicKey: recipientAddress,
        amount,
        assetCode,
        memo,
    });

    if (buildResult.error) {
        return NextResponse.json(
            { error: buildResult.error },
            { status: 400 }
        );
    }

    const { data: pendingTx, error: insertError } = await supabase
        .from('transactions')
        .insert({
            sender_wallet: walletAddress,
            receiver_wallet: recipientAddress,
            amount,
            asset_code: assetCode || 'XLM',
            tx_type: 'payment_out',
            tx_direction: 'out',
            status: 'pending',
            memo,
            meta_data: {
                xdr: buildResult.xdr,
                network,
            },
        })
        .select('id')
        .single();

    if (insertError) {
        return NextResponse.json(
            { error: 'Failed to create payment intent' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        paymentId: pendingTx.id,
        xdr: buildResult.xdr,
        metadata: buildResult.metadata,
        message: 'Sign this transaction with your wallet',
    });
}


async function recordPayment(walletAddress: string, data: any) {
    const { paymentId, txHash, success, errorMessage } = data;

    if (!paymentId) {
        return NextResponse.json(
            { error: 'Missing paymentId' },
            { status: 400 }
        );
    }

    const { data: payment, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', paymentId)
        .eq('sender_wallet', walletAddress)
        .single();

    if (fetchError || !payment) {
        return NextResponse.json(
            { error: 'Payment not found or unauthorized' },
            { status: 404 }
        );
    }

    if (payment.status !== 'pending') {
        return NextResponse.json(
            { error: 'Payment already processed' },
            { status: 400 }
        );
    }

    const { error: updateError } = await supabase
        .from('transactions')
        .update({
            tx_hash: txHash || null,
            status: success ? 'success' : 'failed',
            error_message: errorMessage || null,
            confirmed_at: success ? new Date().toISOString() : null,
        })
        .eq('id', paymentId);

    if (updateError) {
        return NextResponse.json(
            { error: 'Failed to record payment' },
            { status: 500 }
        );
    }

    if (success && payment.receiver_wallet) {
        await supabase.from('contacts').upsert({
            user_wallet: walletAddress,
            contact_address: payment.receiver_wallet,
            contact_type: 'recent',
            last_transacted_at: new Date().toISOString(),
        }, {
            onConflict: 'user_wallet,contact_address',
        });
    }

    return NextResponse.json({
        success: true,
        paymentId,
        status: success ? 'success' : 'failed',
    });
}
