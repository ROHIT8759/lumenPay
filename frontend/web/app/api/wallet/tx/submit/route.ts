import { NextRequest, NextResponse } from 'next/server';
import { walletService } from '@/lib/walletService';
import { jwtVerify } from 'jose';
import { supabase } from '@/lib/supabaseClient';
import { notifyPaymentSent, notifyTransactionFailed } from '@/lib/telegramService';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'lumenpay-jwt-secret-change-in-production'
);

interface SubmitTransactionRequest {
    signedXdr: string;
}

export async function POST(request: NextRequest) {
    try {
        // Verify JWT token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authorization required' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        let userAddress: string;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            userAddress = payload.address as string;
        } catch {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const body: SubmitTransactionRequest = await request.json();
        const { signedXdr } = body;

        if (!signedXdr || typeof signedXdr !== 'string') {
            return NextResponse.json(
                { error: 'Missing signedXdr' },
                { status: 400 }
            );
        }

        // Submit to Stellar network
        const result = await walletService.submitSignedTransaction(signedXdr);

        if (!result.success) {
            await notifyTransactionFailed(userAddress, result.error || 'Unknown error');
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        // Record transaction in database
        try {
            await supabase.from('transactions').insert({
                user_id: userAddress,
                tx_hash: result.txHash,
                tx_type: 'payment_out',
                status: 'success',
                created_at: new Date().toISOString(),
                confirmed_at: new Date().toISOString(),
            });
        } catch (dbError) {
            console.warn('Failed to record transaction:', dbError);
            // Don't fail the request if DB write fails
        }

        await notifyPaymentSent(userAddress, 'N/A', 'XLM', 'N/A', result.txHash);

        return NextResponse.json({
            success: true,
            txHash: result.txHash,
            message: 'Transaction submitted successfully',
        });

    } catch (error: any) {
        console.error('Transaction submit error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to submit transaction' },
            { status: 500 }
        );
    }
}
