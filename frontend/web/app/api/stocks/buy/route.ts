

import { NextRequest, NextResponse } from 'next/server';
import { stockService } from '@/lib/stockService';
import { permissionService } from '@/lib/permissionService';

interface BuyRequest {
    wallet_address: string;
    symbol: string;
    amount: number; 
}

export async function POST(request: NextRequest) {
    try {
        const body: BuyRequest = await request.json();

        
        if (!body.wallet_address || !body.symbol || !body.amount) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: wallet_address, symbol, amount' },
                { status: 400 }
            );
        }

        
        if (!body.wallet_address.startsWith('G') || body.wallet_address.length !== 56) {
            return NextResponse.json(
                { success: false, error: 'Invalid Stellar wallet address' },
                { status: 400 }
            );
        }

        
        if (body.amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Amount must be greater than 0' },
                { status: 400 }
            );
        }

        if (body.amount < 1) {
            return NextResponse.json(
                { success: false, error: 'Minimum investment is $1' },
                { status: 400 }
            );
        }

        
        const permission = await permissionService.canAccessStocks(body.wallet_address);
        if (!permission.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: permission.reason,
                    required_kyc_level: permission.required_kyc_level,
                    current_kyc_level: permission.current_kyc_level,
                },
                { status: 403 }
            );
        }

        
        const result = await stockService.buyStock(
            body.wallet_address,
            body.symbol.toUpperCase(),
            body.amount
        );

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Stock position opened',
            investment: {
                id: result.investment!.id,
                symbol: result.investment!.symbol,
                units: result.investment!.units,
                price_at_buy: result.investment!.price_at_buy,
                amount_invested: result.investment!.amount_invested,
                created_at: result.investment!.created_at,
            },
        });
    } catch (error) {
        console.error('Error buying stock:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process stock purchase' },
            { status: 500 }
        );
    }
}
