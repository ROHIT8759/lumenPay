import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { LoanStatus, CollateralType } from '@prisma/client';

const router = Router();

/**
 * Billing Routes - Loan Management
 * Full implementation with Prisma database operations
 */

// Asset prices for collateral valuation
const ASSET_PRICES: Record<string, number> = {
    'USDC': 1.00,
    'XLM': 0.12,
    'REALTY01': 100.00,
    'TBOND01': 1000.00,
    'GOLD01': 65.00,
};

/**
 * GET /api/billing/loans
 * Get user's loans
 */
router.get('/loans', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.walletAddress;
        const status = req.query.status as LoanStatus | undefined;

        const whereClause: any = { walletAddress };
        if (status) {
            whereClause.status = status;
        }

        const loans = await prisma.loan.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                collateral: true,
            },
        });

        // Calculate summary
        const activeLoans = loans.filter(l => l.status === 'ACTIVE');
        const totalBorrowed = activeLoans.reduce((sum, l) => sum + l.principalAmount, 0);
        const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.amountOutstanding, 0);
        const totalCollateralValue = activeLoans.reduce((sum, l) => {
            const collateralSum = (l.collateral || []).reduce(
                (cs, c) => cs + (c.currentValue || c.valueAtDeposit),
                0
            );
            return sum + collateralSum;
        }, 0);

        const healthFactor = totalOutstanding > 0
            ? (totalCollateralValue / totalOutstanding)
            : 999;

        res.json({
            success: true,
            loans,
            summary: {
                active_loans: activeLoans.length,
                total_borrowed: totalBorrowed,
                total_outstanding: totalOutstanding,
                total_collateral: totalCollateralValue,
                health_factor: healthFactor.toFixed(2),
                is_healthy: healthFactor > 1.25,
            }
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

        // Calculate collateral value
        let totalCollateralValue = 0;
        for (const c of collateral) {
            const price = ASSET_PRICES[c.assetCode] || 1;
            totalCollateralValue += c.amount * price;
        }

        // Check LTV ratio (max 70%)
        const ltvRatio = (principalAmount / totalCollateralValue) * 100;
        if (ltvRatio > 70) {
            const requiredCollateral = principalAmount / 0.7;
            return res.status(400).json({
                error: 'Insufficient collateral. Maximum LTV is 70%',
                details: {
                    required_collateral_value: requiredCollateral.toFixed(2),
                    current_collateral_value: totalCollateralValue.toFixed(2),
                    current_ltv: ltvRatio.toFixed(2),
                    max_borrowable: (totalCollateralValue * 0.7).toFixed(2),
                }
            });
        }

        // Calculate interest rate (base 10% + risk premium)
        let interestRateBps = 1000;
        if (ltvRatio > 40) {
            interestRateBps += Math.floor((ltvRatio - 40) / 10) * 200;
        }
        interestRateBps = Math.min(interestRateBps, 2500);

        // Calculate fees and amounts
        const originationFee = principalAmount * 0.005;
        const loanAmount = principalAmount - originationFee;
        const interestAmount = principalAmount * (interestRateBps / 10000) * (tenureDays / 365);
        const amountOutstanding = principalAmount + interestAmount;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + tenureDays);

        // Create loan and collateral in transaction
        const loan = await prisma.$transaction(async (tx) => {
            const newLoan = await tx.loan.create({
                data: {
                    walletAddress,
                    loanType: 'COLLATERAL',
                    principalAmount,
                    loanAmount,
                    interestRateBps,
                    tenureDays,
                    amountOutstanding,
                    status: 'ACTIVE',
                    ltvRatio,
                    liquidationThreshold: 80,
                    dueDate,
                    disbursedAt: new Date(),
                },
            });

            // Create collateral records
            for (const c of collateral) {
                const collateralType: CollateralType =
                    c.assetCode === 'XLM' ? 'XLM' :
                        c.assetCode === 'USDC' ? 'USDC' : 'RWA';

                await tx.loanCollateral.create({
                    data: {
                        loanId: newLoan.id,
                        walletAddress,
                        collateralType,
                        assetCode: c.assetCode,
                        amount: c.amount,
                        valueAtDeposit: c.amount * (ASSET_PRICES[c.assetCode] || 1),
                        currentValue: c.amount * (ASSET_PRICES[c.assetCode] || 1),
                        isLocked: true,
                    },
                });
            }

            return newLoan;
        });

        res.json({
            success: true,
            message: 'Loan approved and disbursed',
            loan: {
                id: loan.id,
                principal_amount: principalAmount,
                loan_amount: loanAmount,
                origination_fee: originationFee,
                interest_rate: `${(interestRateBps / 100).toFixed(2)}%`,
                tenure_days: tenureDays,
                amount_to_repay: amountOutstanding.toFixed(2),
                due_date: dueDate.toISOString(),
                ltv_ratio: ltvRatio.toFixed(2),
                collateral_locked: totalCollateralValue.toFixed(2),
            }
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
        const walletAddress = req.user!.walletAddress;
        const loanId = req.params.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid repayment amount' });
        }

        const loan = await prisma.loan.findFirst({
            where: { id: loanId, walletAddress },
            include: { collateral: true },
        });

        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        if (loan.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Loan is not active' });
        }

        const repaymentAmount = Math.min(amount, loan.amountOutstanding);
        const newOutstanding = loan.amountOutstanding - repaymentAmount;
        const isFullyRepaid = newOutstanding <= 0.01;

        await prisma.$transaction(async (tx) => {
            // Update loan
            await tx.loan.update({
                where: { id: loanId },
                data: {
                    amountRepaid: { increment: repaymentAmount },
                    amountOutstanding: Math.max(0, newOutstanding),
                    status: isFullyRepaid ? 'REPAID' : 'ACTIVE',
                    repaidAt: isFullyRepaid ? new Date() : undefined,
                },
            });

            // Unlock collateral if fully repaid
            if (isFullyRepaid) {
                await tx.loanCollateral.updateMany({
                    where: { loanId },
                    data: { isLocked: false },
                });
            }
        });

        res.json({
            success: true,
            message: isFullyRepaid ? 'Loan fully repaid, collateral released' : 'Partial repayment recorded',
            repayment: {
                amount_paid: repaymentAmount,
                remaining_balance: Math.max(0, newOutstanding).toFixed(2),
                fully_repaid: isFullyRepaid,
            }
        });

    } catch (error: any) {
        console.error('Loan repayment error:', error);
        res.status(500).json({ error: 'Failed to process repayment', message: error.message });
    }
});

export default router;
