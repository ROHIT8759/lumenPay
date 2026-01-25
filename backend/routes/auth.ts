import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { tokenService } from '../services/tokenService';
import prisma from '../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

/**
 * Authentication Routes
 * 
 * Handles wallet-based authentication:
 * - GET /auth/nonce - Request nonce for signing
 * - POST /auth/verify - Verify signature and issue JWT
 */

const router = Router();
const authService = new AuthService(prisma);

/**
 * GET /auth/nonce
 * Request a nonce for wallet signing
 * Query params: walletAddress (Stellar public key)
 */
router.get('/nonce', async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.query;

        if (!walletAddress || typeof walletAddress !== 'string') {
            return res.status(400).json({
                error: 'Missing walletAddress parameter',
            });
        }

        const nonceData = await authService.generateNonce(walletAddress);

        res.json({
            nonce: nonceData.nonce,
            expiresAt: nonceData.expiresAt,
            message: nonceData.nonce,
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
 * Body: { walletAddress, signature, nonce }
 */
router.post('/verify', async (req: Request, res: Response) => {
    try {
        const { walletAddress, signature, nonce } = req.body;

        if (!walletAddress || !signature || !nonce) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'walletAddress, signature, and nonce are required',
            });
        }

        // Verify signature
        const verifyResult = await authService.verifySignature(
            walletAddress,
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
        const { userId } = await authService.ensureUserExists(walletAddress);

        // Issue JWT token
        const token = tokenService.issueToken(walletAddress);

        res.json({
            success: true,
            token,
            user: {
                walletAddress: userId,
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
 * GET /auth/session
 * Validate JWT and return session metadata
 */
router.get('/session', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const payload = req.user;
    const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now();
    res.json({
        success: true,
        walletAddress: payload?.walletAddress,
        expiresAt,
    });
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
