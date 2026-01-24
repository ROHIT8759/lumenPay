import { NextRequest, NextResponse } from 'next/server';
import { walletService } from '@/lib/walletService';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'lumenpay-jwt-secret-change-in-production'
);

interface BuildPaymentRequest {
    destination: string;
    amount: string;
    asset: 'native' | 'usdc';
    memo?: string;
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
        let sourceAddress: string;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            sourceAddress = payload.address as string;
        } catch {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const body: BuildPaymentRequest = await request.json();
        const { destination, amount, asset, memo } = body;

        // Validate required fields
        if (!destination || !amount || !asset) {
            return NextResponse.json(
                { error: 'Missing required fields: destination, amount, asset' },
                { status: 400 }
            );
        }

        // Validate destination address
        if (!walletService.isValidPublicKey(destination)) {
            return NextResponse.json(
                { error: 'Invalid destination address' },
                { status: 400 }
            );
        }

        // Validate amount
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // Build unsigned transaction
        const result = await walletService.buildPaymentTransaction({
            sourcePublicKey: sourceAddress,
            destinationPublicKey: destination,
            amount: amount,
            asset: asset,
            memo: memo,
        });

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            transaction: result.transaction,
            message: 'Sign this transaction with your wallet',
        });

    } catch (error: any) {
        console.error('Transaction build error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to build transaction' },
            { status: 500 }
        );
    }
}
