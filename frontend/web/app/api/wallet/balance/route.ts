

import { NextRequest, NextResponse } from 'next/server';
import { networkProvider } from '@/lib/lumenVault';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address') || searchParams.get('publicKey');

        if (!address) {
            return NextResponse.json(
                { error: 'Address or publicKey parameter required' },
                { status: 400 }
            );
        }


        if (!address.startsWith('G') || address.length !== 56) {
            return NextResponse.json(
                { error: 'Invalid Stellar address format' },
                { status: 400 }
            );
        }


        const result = await networkProvider.getAccountBalances(address);

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 404 }
            );
        }

        return NextResponse.json(result.balances);
    } catch (error: any) {
        console.error('Balance fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch balances' },
            { status: 500 }
        );
    }
}
