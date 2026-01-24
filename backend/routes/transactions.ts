import { Router, Response } from 'express';
import { walletService } from '../services/walletService';
import { txRelayService } from '../services/txRelayService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

/**
 * Transaction Routes
 * 
 * Handles transaction building and submission:
 * - POST /transactions/build-payment - Build unsigned payment
 * - POST /transactions/submit - Submit signed transaction
 * - GET /transactions/:hash/status - Get transaction status
 * - GET /transactions/user/:publicKey - Get user's transactions
 */

const router = Router();

/**
 * POST /transactions/build-payment
 * Build an unsigned payment transaction
 * Requires authentication
 */
router.post('/build-payment', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { to, amount, assetCode, assetIssuer, memo } = req.body;
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
            assetIssuer,
            memo
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
                from,
                result.hash!,
                from,
                to,
                amount,
                assetCode || 'XLM',
                assetIssuer,
                'PAYMENT',
                result.ledger
            );
        }

        res.json({
            success: true,
            hash: result.hash,
            ledger: result.ledger,
            explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
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

        // If transaction is successful, update DB
        if (status.status === 'success') {
            await txRelayService.updateTransactionStatus(hash, 'SUCCESS', status.ledger);
        } else if (status.status === 'failed') {
            await txRelayService.updateTransactionStatus(hash, 'FAILED');
        }

        res.json({
            ...status,
            explorerUrl: `https://stellar.expert/explorer/testnet/tx/${hash}`,
        });
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
        const limit = parseInt(req.query.limit as string) || 50;

        if (!publicKey) {
            return res.status(400).json({
                error: 'Missing public key',
            });
        }

        const transactions = await txRelayService.getUserTransactions(publicKey, limit);

        // Transform to frontend format
        const formattedTransactions = transactions.map(tx => ({
            id: tx.id,
            tx_hash: tx.txHash,
            from_address: tx.fromAddress,
            to_address: tx.toAddress,
            amount: tx.amount,
            asset_code: tx.assetCode,
            asset_issuer: tx.assetIssuer,
            type: tx.type,
            status: tx.status.toLowerCase(),
            ledger: tx.ledger,
            memo: tx.memo,
            created_at: tx.createdAt,
            explorerUrl: `https://stellar.expert/explorer/testnet/tx/${tx.txHash}`,
        }));

        res.json({
            success: true,
            transactions: formattedTransactions,
            count: formattedTransactions.length,
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

/**
 * GET /transactions/history/:publicKey
 * Get transaction history directly from Horizon (real-time)
 */
router.get('/history/:publicKey', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { publicKey } = req.params;
        const limit = parseInt(req.query.limit as string) || 20;

        const history = await walletService.getTransactionHistory(publicKey, limit);

        res.json({
            success: true,
            transactions: history,
            count: history.length,
        });
    } catch (error: any) {
        console.error('Get transaction history error:', error);
        res.status(500).json({
            error: 'Failed to get transaction history',
            message: error.message,
        });
    }
});

export default router;
