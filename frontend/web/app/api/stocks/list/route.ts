

import { NextRequest, NextResponse } from 'next/server';
import { stockService } from '@/lib/stockService';

export async function GET(request: NextRequest) {
    try {
        const stocks = await stockService.getStockList();

        return NextResponse.json({
            success: true,
            count: stocks.length,
            stocks: stocks.map(stock => ({
                symbol: stock.symbol,
                name: stock.name,
                type: stock.type,
                description: stock.description,
                exchange: stock.exchange,
            })),
        });
    } catch (error) {
        console.error('Error fetching stock list:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch stock list' },
            { status: 500 }
        );
    }
}
