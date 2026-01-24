import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { offchainLedgerService } from '../services/offchainLedgerService';
import { LedgerType } from '@prisma/client';

/**
 * Ledger Routes
 * 
 * Handles off-chain ledger operations:
 * - GET /ledger/balance - Get off-chain balances
 * - POST /ledger/transfer - Internal off-chain transfer
 * - GET /ledger/transactions - Get transaction history
 */

const router = Router();

/**
 * GET /ledger/balance
 * Get all off-chain balances for authenticated user
 */
router.get('/balance', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.publicKey;
        const balances = await offchainLedgerService.getAllBalances(walletAddress);

        res.json({
            success: true,
            walletAddress,
            balances,
        });
    } catch (error: any) {
        console.error('Get balance error:', error);
        res.status(500).json({
            error: 'Failed to get balances',
            message: error.message,
        });
    }
});

/**
 * GET /ledger/balance/:asset
 * Get specific asset balance
 */
router.get('/balance/:asset', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.publicKey;
        const { asset } = req.params;

        const balance = await offchainLedgerService.getBalance(walletAddress, asset);

        res.json({
            success: true,
            ...balance,
        });
    } catch (error: any) {
        console.error('Get balance error:', error);
        res.status(500).json({
            error: 'Failed to get balance',
            message: error.message,
        });
    }
});

/**
 * POST /ledger/transfer
 * Transfer off-chain balance to another user
 * Instant, gasless, internal transfer
 */
router.post('/transfer', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const fromWallet = req.user!.publicKey;
        const { toWallet, amount, asset = 'XLM', memo } = req.body;

        if (!toWallet || !amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'toWallet and amount are required',
            });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                error: 'Invalid amount',
                message: 'Amount must be a positive number',
            });
        }

        const result = await offchainLedgerService.transfer({
            fromWallet,
            toWallet,
            amount,
            asset,
            memo,
        });

        if (!result.success) {
            return res.status(400).json({
                error: 'Transfer failed',
                message: result.error,
            });
        }

        res.json({
            success: true,
            transactionId: result.transactionId,
            message: 'Off-chain transfer completed',
        });
    } catch (error: any) {
        console.error('Transfer error:', error);
        res.status(500).json({
            error: 'Transfer failed',
            message: error.message,
        });
    }
});

/**
 * GET /ledger/transactions
 * Get transaction history for authenticated user
 */
router.get('/transactions', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.publicKey;
        const { limit, ledger } = req.query;

        const transactions = await offchainLedgerService.getTransactionHistory(
            walletAddress,
            {
                limit: limit ? parseInt(limit as string) : undefined,
                ledger: ledger as LedgerType | undefined,
            }
        );

        res.json({
            success: true,
            transactions,
        });
    } catch (error: any) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            error: 'Failed to get transactions',
            message: error.message,
        });
    }
});

export default router;
