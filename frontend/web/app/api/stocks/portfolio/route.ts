

import { NextRequest, NextResponse } from 'next/server';
import { stockService } from '@/lib/stockService';
import { permissionService } from '@/lib/permissionService';

export async function GET(request: NextRequest) {
    try {
        const walletAddress = request.nextUrl.searchParams.get('wallet');

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Missing wallet parameter' },
                { status: 400 }
            );
        }

        
        if (!walletAddress.startsWith('G') || walletAddress.length !== 56) {
            return NextResponse.json(
                { success: false, error: 'Invalid Stellar wallet address' },
                { status: 400 }
            );
        }

        
        const permission = await permissionService.canAccessStocks(walletAddress);
        if (!permission.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: permission.reason,
                    required_kyc_level: permission.required_kyc_level,
                },
                { status: 403 }
            );
        }

        
        const portfolio = await stockService.getPortfolio(walletAddress);

        
        const history = await stockService.getInvestmentHistory(walletAddress);

        return NextResponse.json({
            success: true,
            portfolio: {
                positions: portfolio.positions.map(pos => ({
                    id: pos.id,
                    symbol: pos.symbol,
                    asset_type: pos.asset_type,
                    units: pos.units,
                    amount_invested: pos.amount_invested,
                    price_at_buy: pos.price_at_buy,
                    current_price: pos.current_price,
                    current_value: pos.current_value,
                    unrealized_pnl: pos.unrealized_pnl,
                    unrealized_pnl_percent: ((pos.current_value - pos.amount_invested) / pos.amount_invested * 100).toFixed(2),
                    created_at: pos.created_at,
                })),
                summary: {
                    total_invested: portfolio.total_invested,
                    total_value: portfolio.total_value,
                    total_pnl: portfolio.total_pnl,
                    total_pnl_percent: portfolio.total_invested > 0
                        ? ((portfolio.total_pnl / portfolio.total_invested) * 100).toFixed(2)
                        : '0.00',
                    position_count: portfolio.positions.length,
                },
            },
            history: history.map(inv => ({
                id: inv.id,
                symbol: inv.symbol,
                units: inv.units,
                amount_invested: inv.amount_invested,
                price_at_buy: inv.price_at_buy,
                close_price: inv.close_price,
                pnl: inv.pnl,
                created_at: inv.created_at,
                closed_at: inv.closed_at,
            })),
        });
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch portfolio' },
            { status: 500 }
        );
    }
}
