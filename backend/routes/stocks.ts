import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { LedgerType, TxStatus, TxType } from '@prisma/client';

/**
 * Stocks / RWA Routes
 * 
 * Handles tokenized stock/RWA positions:
 * - GET /stocks/list - List available stocks
 * - POST /stocks/buy - Buy stock position
 * - POST /stocks/sell - Sell stock position
 * - GET /stocks/portfolio - Get user's portfolio
 * - GET /stocks/position/:symbol - Get specific position
 */

const router = Router();

// Mock stock data (in production, fetch from real API like Alpha Vantage)
const AVAILABLE_STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 178.50, change: 2.3 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.20, change: -0.5 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.90, change: 1.8 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.30, change: 0.9 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: -1.2 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.30, change: 3.5 },
    { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2890.50, change: 0.8 },
    { symbol: 'TCS', name: 'Tata Consultancy', price: 3650.25, change: -0.3 },
];

// Get current stock price (mock)
const getStockPrice = (symbol: string): number | null => {
    const stock = AVAILABLE_STOCKS.find(s => s.symbol === symbol);
    return stock?.price || null;
};

/**
 * GET /stocks/list
 * List all available tokenized stocks
 */
router.get('/list', async (req, res: Response) => {
    try {
        res.json({
            success: true,
            stocks: AVAILABLE_STOCKS.map(stock => ({
                symbol: stock.symbol,
                name: stock.name,
                price: stock.price,
                priceFormatted: `$${stock.price.toFixed(2)}`,
                change24h: stock.change,
                changeFormatted: `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%`,
            })),
            count: AVAILABLE_STOCKS.length,
            updatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('List stocks error:', error);
        res.status(500).json({
            error: 'Failed to list stocks',
            message: error.message,
        });
    }
});

/**
 * GET /stocks/quote/:symbol
 * Get current price for a specific stock
 */
router.get('/quote/:symbol', async (req, res: Response) => {
    try {
        const { symbol } = req.params;
        const stock = AVAILABLE_STOCKS.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());

        if (!stock) {
            return res.status(404).json({
                error: 'Stock not found',
            });
        }

        res.json({
            success: true,
            quote: {
                symbol: stock.symbol,
                name: stock.name,
                price: stock.price,
                change24h: stock.change,
            },
        });
    } catch (error: any) {
        console.error('Get quote error:', error);
        res.status(500).json({
            error: 'Failed to get quote',
            message: error.message,
        });
    }
});

/**
 * POST /stocks/buy
 * Buy tokenized stock position
 * Body: { symbol, units, paymentAsset }
 */
router.post('/buy', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { symbol, units, paymentAsset = 'USDC' } = req.body;
        const walletAddress = req.user!.walletAddress;

        if (!symbol || !units || units <= 0) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'symbol and positive units are required',
            });
        }

        const currentPrice = getStockPrice(symbol.toUpperCase());
        if (!currentPrice) {
            return res.status(404).json({
                error: 'Stock not found',
            });
        }

        const totalCost = currentPrice * units;

        // Check if user already has position in this stock
        const existingPosition = await prisma.stockPosition.findUnique({
            where: {
                walletAddress_symbol: {
                    walletAddress,
                    symbol: symbol.toUpperCase(),
                },
            },
        });

        let position;
        if (existingPosition) {
            // Update existing position (average in)
            const totalUnits = existingPosition.units + units;
            const avgPrice = (existingPosition.entryPrice * existingPosition.units + totalCost) / totalUnits;

            position = await prisma.stockPosition.update({
                where: { id: existingPosition.id },
                data: {
                    units: totalUnits,
                    entryPrice: avgPrice,
                    currentPrice,
                },
            });
        } else {
            // Create new position
            position = await prisma.stockPosition.create({
                data: {
                    walletAddress,
                    symbol: symbol.toUpperCase(),
                    name: AVAILABLE_STOCKS.find(s => s.symbol === symbol.toUpperCase())?.name,
                    units,
                    entryPrice: currentPrice,
                    currentPrice,
                },
            });
        }

        // Record transaction
        await prisma.unifiedTransaction.create({
            data: {
                walletAddress,
                txHash: `STOCK_BUY_${Date.now()}`,
                fromAddress: walletAddress,
                toAddress: 'STOCK_ESCROW',
                amount: totalCost,
                asset: paymentAsset,
                type: TxType.STOCK,
                status: TxStatus.CONFIRMED,
                memo: `Buy ${units} ${symbol}`,
                ledger: LedgerType.OFFCHAIN,
            },
        });

        res.json({
            success: true,
            position: {
                id: position.id,
                symbol: position.symbol,
                name: position.name,
                units: position.units,
                entryPrice: position.entryPrice,
                currentPrice: position.currentPrice,
                valueUSD: position.units * (position.currentPrice || position.entryPrice),
            },
            transaction: {
                type: 'BUY',
                units,
                pricePerUnit: currentPrice,
                totalCost,
            },
        });
    } catch (error: any) {
        console.error('Buy stock error:', error);
        res.status(500).json({
            error: 'Failed to buy stock',
            message: error.message,
        });
    }
});

/**
 * POST /stocks/sell
 * Sell tokenized stock position
 * Body: { symbol, units }
 */
router.post('/sell', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { symbol, units } = req.body;
        const walletAddress = req.user!.walletAddress;

        if (!symbol || !units || units <= 0) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'symbol and positive units are required',
            });
        }

        // Get existing position
        const position = await prisma.stockPosition.findUnique({
            where: {
                walletAddress_symbol: {
                    walletAddress,
                    symbol: symbol.toUpperCase(),
                },
            },
        });

        if (!position) {
            return res.status(404).json({
                error: 'Position not found',
            });
        }

        if (position.units < units) {
            return res.status(400).json({
                error: 'Insufficient units',
                message: `You only have ${position.units} units`,
            });
        }

        const currentPrice = getStockPrice(symbol.toUpperCase()) || position.entryPrice;
        const saleValue = currentPrice * units;
        const remainingUnits = position.units - units;

        if (remainingUnits === 0) {
            // Delete position
            await prisma.stockPosition.delete({
                where: { id: position.id },
            });
        } else {
            // Update position
            await prisma.stockPosition.update({
                where: { id: position.id },
                data: {
                    units: remainingUnits,
                    currentPrice,
                },
            });
        }

        // Record transaction
        await prisma.unifiedTransaction.create({
            data: {
                walletAddress,
                txHash: `STOCK_SELL_${Date.now()}`,
                fromAddress: 'STOCK_ESCROW',
                toAddress: walletAddress,
                amount: saleValue,
                asset: 'USDC',
                type: TxType.STOCK,
                status: TxStatus.CONFIRMED,
                memo: `Sell ${units} ${symbol}`,
                ledger: LedgerType.OFFCHAIN,
            },
        });

        // Calculate P&L
        const costBasis = position.entryPrice * units;
        const pnl = saleValue - costBasis;
        const pnlPercent = (pnl / costBasis) * 100;

        res.json({
            success: true,
            transaction: {
                type: 'SELL',
                symbol,
                units,
                pricePerUnit: currentPrice,
                saleValue,
                costBasis,
                pnl,
                pnlPercent: pnlPercent.toFixed(2),
            },
            remainingPosition: remainingUnits > 0 ? {
                units: remainingUnits,
                entryPrice: position.entryPrice,
            } : null,
        });
    } catch (error: any) {
        console.error('Sell stock error:', error);
        res.status(500).json({
            error: 'Failed to sell stock',
            message: error.message,
        });
    }
});

/**
 * GET /stocks/portfolio
 * Get user's stock portfolio
 */
router.get('/portfolio', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.walletAddress;

        const positions = await prisma.stockPosition.findMany({
            where: { walletAddress },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate portfolio metrics
        let totalValue = 0;
        let totalCost = 0;

        const enrichedPositions = positions.map(position => {
            const currentPrice = getStockPrice(position.symbol) || position.entryPrice;
            const value = position.units * currentPrice;
            const cost = position.units * position.entryPrice;
            const pnl = value - cost;
            const pnlPercent = (pnl / cost) * 100;

            totalValue += value;
            totalCost += cost;

            return {
                id: position.id,
                symbol: position.symbol,
                name: position.name,
                units: position.units,
                entryPrice: position.entryPrice,
                currentPrice,
                value,
                cost,
                pnl,
                pnlPercent: pnlPercent.toFixed(2),
            };
        });

        const totalPnl = totalValue - totalCost;
        const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

        res.json({
            success: true,
            portfolio: {
                positions: enrichedPositions,
                summary: {
                    totalValue,
                    totalCost,
                    totalPnl,
                    totalPnlPercent: totalPnlPercent.toFixed(2),
                    positionCount: positions.length,
                },
            },
        });
    } catch (error: any) {
        console.error('Get portfolio error:', error);
        res.status(500).json({
            error: 'Failed to get portfolio',
            message: error.message,
        });
    }
});

export default router;
