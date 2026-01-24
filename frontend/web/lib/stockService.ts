

import { supabase } from './supabaseClient';





export interface Stock {
    symbol: string;
    name: string;
    type: 'STOCK' | 'ETF' | 'CRYPTO_STOCK';
    description: string;
    exchange?: string;
}

export interface StockPrice {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    high?: number;
    low?: number;
    volume?: number;
    timestamp: string;
}

export interface Investment {
    id: string;
    wallet_address: string;
    symbol: string;
    asset_type: string;
    amount_invested: number;
    units: number;
    price_at_buy: number;
    status: 'OPEN' | 'CLOSED';
    created_at: string;
    closed_at?: string;
    close_price?: number;
    pnl?: number;
}

export interface Portfolio {
    positions: (Investment & { current_price: number; current_value: number; unrealized_pnl: number })[];
    total_invested: number;
    total_value: number;
    total_pnl: number;
}





const SUPPORTED_STOCKS: Stock[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', description: 'Technology company', exchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'STOCK', description: 'Electric vehicles & clean energy', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', description: 'Technology conglomerate', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK', description: 'Technology company', exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'STOCK', description: 'E-commerce & cloud computing', exchange: 'NASDAQ' },
    { symbol: 'COIN', name: 'Coinbase Global', type: 'CRYPTO_STOCK', description: 'Cryptocurrency exchange', exchange: 'NASDAQ' },
    { symbol: 'MSTR', name: 'MicroStrategy Inc.', type: 'CRYPTO_STOCK', description: 'Bitcoin holding company', exchange: 'NASDAQ' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETF', description: 'S&P 500 Index tracking ETF', exchange: 'NYSE' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF', description: 'Nasdaq-100 Index tracking ETF', exchange: 'NASDAQ' },
];


const DEMO_PRICES: Record<string, { price: number; change: number }> = {
    'AAPL': { price: 178.50, change: 1.25 },
    'TSLA': { price: 248.30, change: -2.15 },
    'GOOGL': { price: 141.80, change: 0.85 },
    'MSFT': { price: 378.90, change: 2.30 },
    'AMZN': { price: 178.25, change: 1.10 },
    'COIN': { price: 225.40, change: 5.20 },
    'MSTR': { price: 1485.00, change: 45.50 },
    'SPY': { price: 498.50, change: 1.80 },
    'QQQ': { price: 425.30, change: 2.10 },
};





class StockService {
    private alphaVantageApiKey: string;
    private coingeckoUrl: string;
    private cacheTimeout: number = 5 * 60 * 1000; 

    constructor() {
        this.alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
        this.coingeckoUrl = process.env.COINGECKO_URL || 'https://api.coingecko.com/api/v3';
    }

    
    async getStockList(): Promise<Stock[]> {
        return SUPPORTED_STOCKS;
    }

    
    async getStockPrice(symbol: string): Promise<StockPrice> {
        
        const cached = await this.getCachedPrice(symbol);
        if (cached) {
            return cached;
        }

        
        const override = await this.getAdminOverride(symbol);
        if (override) {
            return override;
        }

        
        if (this.alphaVantageApiKey) {
            try {
                const price = await this.fetchAlphaVantagePrice(symbol);
                if (price) {
                    await this.cachePrice(symbol, price);
                    return price;
                }
            } catch (error) {
                console.error(`Alpha Vantage API error for ${symbol}:`, error);
            }
        }

        
        return this.getDemoPrice(symbol);
    }

    
    private async fetchAlphaVantagePrice(symbol: string): Promise<StockPrice | null> {
        try {
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageApiKey}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data['Global Quote']) {
                const quote = data['Global Quote'];
                return {
                    symbol,
                    price: parseFloat(quote['05. price']),
                    change: parseFloat(quote['09. change']),
                    changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
                    high: parseFloat(quote['03. high']),
                    low: parseFloat(quote['04. low']),
                    volume: parseInt(quote['06. volume']),
                    timestamp: new Date().toISOString(),
                };
            }
            return null;
        } catch (error) {
            console.error('Alpha Vantage fetch error:', error);
            return null;
        }
    }

    
    private getDemoPrice(symbol: string): StockPrice {
        const demo = DEMO_PRICES[symbol] || { price: 100, change: 0 };

        
        const variance = (Math.random() - 0.5) * 0.01;
        const price = demo.price * (1 + variance);
        const change = demo.change + (Math.random() - 0.5) * 0.5;

        return {
            symbol,
            price: Math.round(price * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round((change / price) * 10000) / 100,
            timestamp: new Date().toISOString(),
        };
    }

    
    private async getCachedPrice(symbol: string): Promise<StockPrice | null> {
        const { data, error } = await supabase
            .from('stock_price_cache')
            .select('*')
            .eq('symbol', symbol)
            .single();

        if (error || !data) return null;

        
        const lastUpdated = new Date(data.last_updated).getTime();
        if (Date.now() - lastUpdated > this.cacheTimeout) {
            return null;
        }

        return {
            symbol: data.symbol,
            price: data.price,
            change: data.change || 0,
            changePercent: data.change_percent || 0,
            high: data.high,
            low: data.low,
            volume: data.volume,
            timestamp: data.last_updated,
        };
    }

    
    private async cachePrice(symbol: string, price: StockPrice): Promise<void> {
        await supabase
            .from('stock_price_cache')
            .upsert({
                symbol,
                price: price.price,
                change: price.change,
                change_percent: price.changePercent,
                high: price.high,
                low: price.low,
                volume: price.volume,
                last_updated: new Date().toISOString(),
            });
    }

    
    private async getAdminOverride(symbol: string): Promise<StockPrice | null> {
        const { data, error } = await supabase
            .from('admin_overrides')
            .select('*')
            .eq('override_type', 'PRICE')
            .eq('target_id', symbol)
            .eq('active', true)
            .single();

        if (error || !data) return null;

        const override = data.override_value as { price: number; change?: number };
        return {
            symbol,
            price: override.price,
            change: override.change || 0,
            changePercent: override.change ? (override.change / override.price) * 100 : 0,
            timestamp: new Date().toISOString(),
        };
    }

    
    async buyStock(
        walletAddress: string,
        symbol: string,
        amountUSD: number
    ): Promise<{ success: boolean; investment?: Investment; error?: string }> {
        
        const stock = SUPPORTED_STOCKS.find(s => s.symbol === symbol);
        if (!stock) {
            return { success: false, error: 'Invalid stock symbol' };
        }

        
        const price = await this.getStockPrice(symbol);
        if (!price || price.price <= 0) {
            return { success: false, error: 'Unable to get stock price' };
        }

        
        const units = amountUSD / price.price;

        
        const { data, error } = await supabase
            .from('investments')
            .insert({
                wallet_address: walletAddress,
                symbol,
                asset_type: stock.type,
                amount_invested: amountUSD,
                units,
                price_at_buy: price.price,
                status: 'OPEN',
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating investment:', error);
            return { success: false, error: 'Failed to create investment' };
        }

        return { success: true, investment: data as Investment };
    }

    
    async sellStock(
        investmentId: string,
        walletAddress: string
    ): Promise<{ success: boolean; pnl?: number; error?: string }> {
        
        const { data: investment, error: fetchError } = await supabase
            .from('investments')
            .select('*')
            .eq('id', investmentId)
            .eq('wallet_address', walletAddress)
            .eq('status', 'OPEN')
            .single();

        if (fetchError || !investment) {
            return { success: false, error: 'Investment not found' };
        }

        
        const price = await this.getStockPrice(investment.symbol);
        if (!price) {
            return { success: false, error: 'Unable to get current price' };
        }

        
        const currentValue = investment.units * price.price;
        const pnl = currentValue - investment.amount_invested;

        
        const { error: updateError } = await supabase
            .from('investments')
            .update({
                status: 'CLOSED',
                closed_at: new Date().toISOString(),
                close_price: price.price,
                pnl,
            })
            .eq('id', investmentId);

        if (updateError) {
            return { success: false, error: 'Failed to close investment' };
        }

        return { success: true, pnl };
    }

    
    async getPortfolio(walletAddress: string): Promise<Portfolio> {
        const { data, error } = await supabase
            .from('investments')
            .select('*')
            .eq('wallet_address', walletAddress)
            .eq('status', 'OPEN')
            .order('created_at', { ascending: false });

        if (error || !data) {
            return {
                positions: [],
                total_invested: 0,
                total_value: 0,
                total_pnl: 0,
            };
        }

        
        const positions = await Promise.all(
            data.map(async (inv: Investment) => {
                const price = await this.getStockPrice(inv.symbol);
                const current_price = price?.price || inv.price_at_buy;
                const current_value = inv.units * current_price;
                const unrealized_pnl = current_value - inv.amount_invested;

                return {
                    ...inv,
                    current_price,
                    current_value,
                    unrealized_pnl,
                };
            })
        );

        const total_invested = positions.reduce((sum, p) => sum + p.amount_invested, 0);
        const total_value = positions.reduce((sum, p) => sum + p.current_value, 0);
        const total_pnl = total_value - total_invested;

        return {
            positions,
            total_invested,
            total_value,
            total_pnl,
        };
    }

    
    async getInvestmentHistory(walletAddress: string): Promise<Investment[]> {
        const { data, error } = await supabase
            .from('investments')
            .select('*')
            .eq('wallet_address', walletAddress)
            .eq('status', 'CLOSED')
            .order('closed_at', { ascending: false });

        return (data as Investment[]) || [];
    }
}

export const stockService = new StockService();
