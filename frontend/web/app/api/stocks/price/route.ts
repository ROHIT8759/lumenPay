

import { NextRequest, NextResponse } from 'next/server';
import { stockService } from '@/lib/stockService';

export async function GET(request: NextRequest) {
    try {
        const symbol = request.nextUrl.searchParams.get('symbol');

        if (!symbol) {
            return NextResponse.json(
                { success: false, error: 'Missing symbol parameter' },
                { status: 400 }
            );
        }

        
        const stocks = await stockService.getStockList();
        const validSymbol = stocks.find(s => s.symbol === symbol.toUpperCase());

        if (!validSymbol) {
            return NextResponse.json(
                { success: false, error: `Invalid symbol: ${symbol}. Supported symbols: ${stocks.map(s => s.symbol).join(', ')}` },
                { status: 400 }
            );
        }

        const price = await stockService.getStockPrice(symbol.toUpperCase());

        return NextResponse.json({
            success: true,
            symbol: price.symbol,
            price: price.price,
            change: price.change,
            changePercent: price.changePercent,
            high: price.high,
            low: price.low,
            volume: price.volume,
            timestamp: price.timestamp,
        });
    } catch (error) {
        console.error('Error fetching stock price:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch stock price' },
            { status: 500 }
        );
    }
}
