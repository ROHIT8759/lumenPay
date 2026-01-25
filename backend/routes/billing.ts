import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * Billing Routes - Loan Management
 * 
 * Note: These routes return placeholder responses until the Prisma schema
 * is extended with Loan and LoanCollateral models. The structure is ready
 * for when database models are added.
 */

/**
 * GET /api/billing/loans
 * Get user's loans
 */
router.get('/loans', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.walletAddress;

        // TODO: Replace with Prisma query when Loan model is added
        // Currently returns empty array since loans table doesn't exist yet
        res.json({
            success: true,
            loans: [],
            summary: {
                active_loans: 0,
                total_borrowed: 0,
                total_outstanding: 0,
                total_collateral: 0,
                health_factor: '999.00',
                is_healthy: true,
            },
            message: 'Loan functionality coming soon - smart contracts deployed',
        });
    } catch (error: any) {
        console.error('Get loans error:', error);
        res.status(500).json({ error: 'Failed to fetch loans', message: error.message });
    }
});

/**
 * POST /api/billing/loans
 * Create a new collateral loan
 */
router.post('/loans', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.walletAddress;
        const { principalAmount, tenureDays, collateral } = req.body;

        // Validation
        if (!principalAmount || !tenureDays) {
            return res.status(400).json({ error: 'Missing required fields: principalAmount, tenureDays' });
        }

        if (!collateral || collateral.length === 0) {
            return res.status(400).json({ error: 'Collateral required' });
        }

        if (principalAmount < 10) {
            return res.status(400).json({ error: 'Minimum loan amount is $10' });
        }

        // TODO: Implement loan creation when Loan model is added
        // For now, return a placeholder response showing the contract is ready
        res.status(501).json({
            success: false,
            error: 'Loan creation not yet implemented in database',
            message: 'Use the LOAN_CONTRACT_ID smart contract for on-chain loans',
            contract: process.env.LOAN_CONTRACT_ID || 'CDVW547TOZI4LTABJ7QDMIVGMW5FBH6KZY4WGRAIYNY2LHFTI7TO2ZQK',
            requested: {
                walletAddress,
                principalAmount,
                tenureDays,
                collateral,
            },
        });
    } catch (error: any) {
        console.error('Loan creation error:', error);
        res.status(500).json({ error: 'Failed to create loan', message: error.message });
    }
});

/**
 * POST /api/billing/loans/:id/repay
 * Repay a loan
 */
router.post('/loans/:id/repay', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const loanId = req.params.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid repayment amount' });
        }

        // TODO: Implement repayment when Loan model is added
        res.status(501).json({
            success: false,
            error: 'Loan repayment not yet implemented in database',
            message: 'Use the LOAN_CONTRACT_ID smart contract for on-chain repayments',
            contract: process.env.LOAN_CONTRACT_ID || 'CDVW547TOZI4LTABJ7QDMIVGMW5FBH6KZY4WGRAIYNY2LHFTI7TO2ZQK',
            loanId,
            amount,
        });
    } catch (error: any) {
        console.error('Loan repayment error:', error);
        res.status(500).json({ error: 'Failed to process repayment', message: error.message });
    }
});

export default router;
