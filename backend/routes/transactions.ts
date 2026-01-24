import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { walletService } from '../services/walletService';
import { TxRelayService } from '../services/txRelayService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

/**
 * Transaction Routes
 * 
 * Handles transaction building and submission:
 * - POST /transactions/build-payment - Build unsigned payment
 * - POST /transactions/submit - Submit signed transaction
 * - GET /transactions/:hash/status - Get transaction status
 */

const router = Router();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const txRelayService = new TxRelayService(supabase);

/**
 * POST /transactions/build-payment
 * Build an unsigned payment transaction
 * Requires authentication
 */
router.post('/build-payment', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { to, amount, assetCode, assetIssuer } = req.body;
        const from = req.user!.publicKey;

        if (!to || !amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'to and amount are required',
            });
        }

        const result = await walletService.buildUnsignedPayment(
            from,
            to,
            amount,
            assetCode,
            assetIssuer
        );

        res.json({
            success: true,
            xdr: result.xdr,
            network: result.network,
        });
    } catch (error: any) {
        console.error('Build payment error:', error);
        res.status(500).json({
            error: 'Failed to build transaction',
            message: error.message,
        });
    }
});

/**
 * POST /transactions/submit
 * Submit a signed transaction to Horizon
 * Requires authentication
 */
router.post('/submit', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { signedXDR, to, amount, assetCode, assetIssuer } = req.body;
        const from = req.user!.publicKey;
        const userId = req.user!.userId;

        if (!signedXDR) {
            return res.status(400).json({
                error: 'Missing signedXDR',
            });
        }

        // Validate transaction
        try {
            walletService.validateSignedTransaction(signedXDR);
        } catch (error: any) {
            return res.status(400).json({
                error: 'Invalid transaction',
                message: error.message,
            });
        }

        // Submit to Horizon
        const result = await txRelayService.submitSignedTransaction(signedXDR);

        if (!result.success) {
            return res.status(400).json({
                error: 'Transaction submission failed',
                message: result.error,
            });
        }

        // Record transaction in database
        if (to && amount) {
            await txRelayService.recordTransaction(
                userId,
                result.hash!,
                from,
                to,
                amount,
                assetCode || 'XLM',
                assetIssuer
            );
        }

        res.json({
            success: true,
            hash: result.hash,
            ledger: result.ledger,
        });
    } catch (error: any) {
        console.error('Submit transaction error:', error);
        res.status(500).json({
            error: 'Failed to submit transaction',
            message: error.message,
        });
    }
});

/**
 * GET /transactions/:hash/status
 * Get transaction status from Horizon
 */
router.get('/:hash/status', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { hash } = req.params;

        if (!hash) {
            return res.status(400).json({
                error: 'Missing transaction hash',
            });
        }

        const status = await txRelayService.getTransactionStatus(hash);

        res.json(status);
    } catch (error: any) {
        console.error('Get transaction status error:', error);
        res.status(500).json({
            error: 'Failed to get transaction status',
            message: error.message,
        });
    }
});

/**
 * GET /transactions/user/:publicKey
 * Get all transactions for a user by their public key
 * Requires authentication
 */
router.get('/user/:publicKey', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { publicKey } = req.params;

        if (!publicKey) {
            return res.status(400).json({
                error: 'Missing public key',
            });
        }

        // Query unified transactions where user is sender or receiver
        const transactions = await prisma.unifiedTransaction.findMany({
            where: {
                OR: [
                    { walletAddress: publicKey },
                    { fromAddress: publicKey },
                    { toAddress: publicKey }
                ]
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100
        });

        res.json({
            success: true,
            transactions: transactions || [],
            count: transactions?.length || 0,
        });
    } catch (error: any) {
        console.error('Get user transactions error:', error);
        res.status(500).json({
            error: 'Failed to get transactions',
            message: error.message,
        });
    }
});

/**
 * GET /transactions/account/:publicKey
 * Get account balances (convenience endpoint)
 */
router.get('/account/:publicKey', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { publicKey } = req.params;

        const details = await walletService.getAccountDetails(publicKey);

        res.json(details);
    } catch (error: any) {
        console.error('Get account details error:', error);
        res.status(500).json({
            error: 'Failed to get account details',
            message: error.message,
        });
    }
});

export default router;
