

import { NextRequest, NextResponse } from 'next/server';
import { networkProvider } from '@/lib/lumenVault';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : 20;

        if (!address) {
            return NextResponse.json(
                { error: 'Address parameter required' },
                { status: 400 }
            );
        }

        
        if (!address.startsWith('G') || address.length !== 56) {
            return NextResponse.json(
                { error: 'Invalid Stellar address format' },
                { status: 400 }
            );
        }

        
        const result = await networkProvider.getTransactionHistory(address, limit);

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 404 }
            );
        }

        return NextResponse.json({
            transactions: result.transactions,
        });
    } catch (error: any) {
        console.error('History fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transaction history' },
            { status: 500 }
        );
    }
}
