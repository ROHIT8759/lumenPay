import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { rampService } from '../services/rampService';

/**
 * Ramp Routes
 * 
 * Handles on-ramp (INR -> Crypto) and off-ramp (Crypto -> INR):
 * 
 * ON-RAMP:
 * - POST /ramp/on/create - Create on-ramp intent
 * - POST /ramp/on/:id/confirm-inr - Confirm INR payment (admin)
 * - POST /ramp/on/:id/build-onchain - Build on-chain tx
 * - POST /ramp/on/:id/complete - Complete on-ramp
 * - GET /ramp/on/:id - Get intent status
 * 
 * OFF-RAMP:
 * - POST /ramp/off/create - Create off-ramp intent
 * - POST /ramp/off/:id/confirm-lock - Confirm crypto locked
 * - POST /ramp/off/:id/payout - Trigger INR payout
 * - POST /ramp/off/:id/complete - Complete off-ramp
 * - GET /ramp/off/:id - Get intent status
 * 
 * GENERAL:
 * - GET /ramp/history - Get user's ramp history
 */

const router = Router();

// =========================================================================
// ON-RAMP (INR -> Crypto)
// =========================================================================

/**
 * POST /ramp/on/create
 * Create a new on-ramp intent
 */
router.post('/on/create', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.publicKey;
        const { inrAmount, asset } = req.body;

        if (!inrAmount || inrAmount <= 0) {
            return res.status(400).json({
                error: 'Invalid INR amount',
            });
        }

        const intent = await rampService.createOnRampIntent({
            walletAddress,
            inrAmount,
            asset,
        });

        res.json({
            success: true,
            ...intent,
        });
    } catch (error: any) {
        console.error('Create on-ramp error:', error);
        res.status(500).json({
            error: 'Failed to create on-ramp intent',
            message: error.message,
        });
    }
});

/**
 * POST /ramp/on/:id/confirm-inr
 * Confirm INR payment received (admin/webhook endpoint)
 */
router.post('/on/:id/confirm-inr', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentRef, adminSecret } = req.body;

        // Simple admin auth - in production use proper admin middleware
        if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (!paymentRef) {
            return res.status(400).json({ error: 'Payment reference required' });
        }

        const result = await rampService.confirmInrPayment(id, paymentRef);

        res.json(result);
    } catch (error: any) {
        console.error('Confirm INR error:', error);
        res.status(500).json({
            error: 'Failed to confirm INR payment',
            message: error.message,
        });
    }
});

/**
 * POST /ramp/on/:id/build-onchain
 * Build on-chain transaction for moving funds after off-chain credit
 */
router.post('/on/:id/build-onchain', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const toAddress = req.user!.publicKey;

        const result = await rampService.buildOnRampOnChainTx(id, toAddress);

        res.json(result);
    } catch (error: any) {
        console.error('Build on-chain error:', error);
        res.status(500).json({
            error: 'Failed to build on-chain transaction',
            message: error.message,
        });
    }
});

/**
 * POST /ramp/on/:id/complete
 * Complete on-ramp after on-chain tx confirmed
 */
router.post('/on/:id/complete', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { txHash } = req.body;

        if (!txHash) {
            return res.status(400).json({ error: 'Transaction hash required' });
        }

        const result = await rampService.completeOnRamp(id, txHash);

        res.json(result);
    } catch (error: any) {
        console.error('Complete on-ramp error:', error);
        res.status(500).json({
            error: 'Failed to complete on-ramp',
            message: error.message,
        });
    }
});

/**
 * GET /ramp/on/:id
 * Get on-ramp intent status
 */
router.get('/on/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const intent = await rampService.getOnRampIntent(id);

        if (!intent) {
            return res.status(404).json({ error: 'Intent not found' });
        }

        // Verify ownership
        if (intent.walletAddress !== req.user!.publicKey) {
            return res.status(403).json({ error: 'Not your intent' });
        }

        res.json({
            success: true,
            intent,
        });
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to get intent',
            message: error.message,
        });
    }
});

// =========================================================================
// OFF-RAMP (Crypto -> INR)
// =========================================================================

/**
 * POST /ramp/off/create
 * Create a new off-ramp intent
 */
router.post('/off/create', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.publicKey;
        const { cryptoAmount, asset, bankAccountNo, bankIfsc, upiId } = req.body;

        if (!cryptoAmount || cryptoAmount <= 0) {
            return res.status(400).json({
                error: 'Invalid crypto amount',
            });
        }

        const intent = await rampService.createOffRampIntent({
            walletAddress,
            cryptoAmount,
            asset,
            bankAccountNo,
            bankIfsc,
            upiId,
        });

        res.json({
            success: true,
            ...intent,
        });
    } catch (error: any) {
        console.error('Create off-ramp error:', error);
        res.status(500).json({
            error: 'Failed to create off-ramp intent',
            message: error.message,
        });
    }
});

/**
 * POST /ramp/off/:id/confirm-lock
 * Confirm crypto locked on-chain (called by indexer)
 */
router.post('/off/:id/confirm-lock', async (req, res) => {
    try {
        const { id } = req.params;
        const { lockTxHash, adminSecret } = req.body;

        // Simple admin auth
        if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (!lockTxHash) {
            return res.status(400).json({ error: 'Lock transaction hash required' });
        }

        const result = await rampService.confirmCryptoLocked(id, lockTxHash);

        res.json(result);
    } catch (error: any) {
        console.error('Confirm lock error:', error);
        res.status(500).json({
            error: 'Failed to confirm crypto lock',
            message: error.message,
        });
    }
});

/**
 * POST /ramp/off/:id/payout
 * Trigger INR payout
 */
router.post('/off/:id/payout', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminSecret } = req.body;

        // Simple admin auth
        if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await rampService.triggerInrPayout(id);

        res.json(result);
    } catch (error: any) {
        console.error('Payout error:', error);
        res.status(500).json({
            error: 'Failed to trigger payout',
            message: error.message,
        });
    }
});

/**
 * POST /ramp/off/:id/complete
 * Complete off-ramp after INR confirmed
 */
router.post('/off/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminSecret } = req.body;

        // Simple admin auth
        if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await rampService.completeOffRamp(id);

        res.json(result);
    } catch (error: any) {
        console.error('Complete off-ramp error:', error);
        res.status(500).json({
            error: 'Failed to complete off-ramp',
            message: error.message,
        });
    }
});

/**
 * GET /ramp/off/:id
 * Get off-ramp intent status
 */
router.get('/off/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const intent = await rampService.getOffRampIntent(id);

        if (!intent) {
            return res.status(404).json({ error: 'Intent not found' });
        }

        // Verify ownership
        if (intent.walletAddress !== req.user!.publicKey) {
            return res.status(403).json({ error: 'Not your intent' });
        }

        res.json({
            success: true,
            intent,
        });
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to get intent',
            message: error.message,
        });
    }
});

// =========================================================================
// GENERAL
// =========================================================================

/**
 * GET /ramp/history
 * Get user's ramp history
 */
router.get('/history', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.publicKey;
        const history = await rampService.getUserRampHistory(walletAddress);

        res.json({
            success: true,
            ...history,
        });
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to get ramp history',
            message: error.message,
        });
    }
});

export default router;
