import { Router, Response } from 'express';
import { escrowService } from '../services/escrowService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

/**
 * Escrow Routes
 * 
 * Handles Soroban escrow operations:
 * - POST /escrow/build-lock - Build unsigned lock collateral invocation
 * - POST /escrow/build-release - Build unsigned release collateral invocation
 * - GET /escrow/:loanId - Get escrow status
 */

const router = Router();

/**
 * POST /escrow/build-lock
 * Build unsigned Soroban invocation to lock collateral
 * Requires authentication
 */
router.post('/build-lock', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            loanId,
            lender,
            collateralToken,
            collateralAmount,
            loanAmount,
            durationSeconds,
        } = req.body;

        const borrower = req.user!.walletAddress;

        if (!loanId || !lender || !collateralToken || !collateralAmount || !loanAmount || !durationSeconds) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'loanId, lender, collateralToken, collateralAmount, loanAmount, and durationSeconds are required',
            });
        }

        const result = await escrowService.buildLockCollateral(
            parseInt(loanId),
            borrower,
            lender,
            collateralToken,
            BigInt(collateralAmount),
            BigInt(loanAmount),
            parseInt(durationSeconds)
        );

        res.json({
            success: true,
            xdr: result.xdr,
            network: result.network,
        });
    } catch (error: any) {
        console.error('Build lock collateral error:', error);
        res.status(500).json({
            error: 'Failed to build lock collateral invocation',
            message: error.message,
        });
    }
});

/**
 * POST /escrow/build-release
 * Build unsigned Soroban invocation to release collateral
 * Requires authentication (must be lender)
 */
router.post('/build-release', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { loanId } = req.body;
        const lender = req.user!.walletAddress;

        if (!loanId) {
            return res.status(400).json({
                error: 'Missing loanId',
            });
        }

        const result = await escrowService.buildReleaseCollateral(
            parseInt(loanId),
            lender
        );

        res.json({
            success: true,
            xdr: result.xdr,
            network: result.network,
        });
    } catch (error: any) {
        console.error('Build release collateral error:', error);
        res.status(500).json({
            error: 'Failed to build release collateral invocation',
            message: error.message,
        });
    }
});

/**
 * GET /escrow/:loanId
 * Get escrow status from Soroban contract
 */
router.get('/:loanId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { loanId } = req.params;

        if (!loanId) {
            return res.status(400).json({
                error: 'Missing loanId',
            });
        }

        const status = await escrowService.getEscrowStatus(parseInt(loanId));

        res.json(status);
    } catch (error: any) {
        console.error('Get escrow status error:', error);
        res.status(500).json({
            error: 'Failed to get escrow status',
            message: error.message,
        });
    }
});

export default router;
