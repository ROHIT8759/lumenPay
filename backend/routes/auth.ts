import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../services/authService';
import { tokenService } from '../services/tokenService';

/**
 * Authentication Routes
 * 
 * Handles wallet-based authentication:
 * - GET /auth/nonce - Request nonce for signing
 * - POST /auth/verify - Verify signature and issue JWT
 */

const router = Router();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const authService = new AuthService(supabase);

/**
 * GET /auth/nonce
 * Request a nonce for wallet signing
 * Query params: publicKey (Stellar public key)
 */
router.get('/nonce', async (req: Request, res: Response) => {
    try {
        const { publicKey } = req.query;

        if (!publicKey || typeof publicKey !== 'string') {
            return res.status(400).json({
                error: 'Missing publicKey parameter',
            });
        }

        const nonceData = await authService.generateNonce(publicKey);

        res.json({
            nonce: nonceData.nonce,
            expiresAt: nonceData.expiresAt,
            message: `Sign this nonce to authenticate: ${nonceData.nonce}`,
        });
    } catch (error: any) {
        console.error('Nonce generation error:', error);
        res.status(500).json({
            error: 'Failed to generate nonce',
            message: error.message,
        });
    }
});

/**
 * POST /auth/verify
 * Verify signed nonce and issue JWT
 * Body: { publicKey, signature, nonce }
 */
router.post('/verify', async (req: Request, res: Response) => {
    try {
        const { publicKey, signature, nonce } = req.body;

        if (!publicKey || !signature || !nonce) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'publicKey, signature, and nonce are required',
            });
        }

        // Verify signature
        const verifyResult = await authService.verifySignature(
            publicKey,
            signature,
            nonce
        );

        if (!verifyResult.success) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: verifyResult.error,
            });
        }

        // Ensure user exists in database
        const { userId } = await authService.ensureUserExists(publicKey);

        // Issue JWT token
        const token = tokenService.issueToken(publicKey, userId);

        res.json({
            success: true,
            token,
            user: {
                id: userId,
                publicKey,
            },
        });
    } catch (error: any) {
        console.error('Authentication verification error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            message: error.message,
        });
    }
});

/**
 * GET /auth/cleanup
 * Cleanup expired nonces (can be called by a cron job)
 */
router.get('/cleanup', async (req: Request, res: Response) => {
    try {
        const count = await authService.cleanupExpiredNonces();
        res.json({
            success: true,
            cleaned: count,
        });
    } catch (error: any) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            error: 'Cleanup failed',
            message: error.message,
        });
    }
});

export default router;
