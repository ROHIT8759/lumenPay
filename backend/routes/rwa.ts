import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { AssetStatus, RwaAssetType, RiskLevel } from '@prisma/client';

const router = Router();

/**
 * RWA Routes - Real World Asset Management
 * Full implementation with Prisma database operations
 */

/**
 * GET /api/rwa/assets
 * List available RWA assets
 */
router.get('/assets', async (req: Request, res: Response) => {
    try {
        const { type, featured, risk, minYield, kycLevel } = req.query;

        const whereClause: any = {
            status: 'ACTIVE' as AssetStatus,
        };

        if (type) whereClause.assetType = type as RwaAssetType;
        if (featured === 'true') whereClause.isFeatured = true;
        if (risk) whereClause.riskLevel = risk as RiskLevel;
        if (minYield) whereClause.annualYieldPercent = { gte: parseFloat(minYield as string) };
        if (kycLevel) whereClause.minKycLevel = { lte: parseInt(kycLevel as string) };

        const assets = await prisma.rwaAsset.findMany({
            where: whereClause,
            orderBy: [
                { isFeatured: 'desc' },
                { createdAt: 'desc' },
            ],
        });

        res.json({
            success: true,
            assets,
            count: assets.length,
        });
    } catch (error: any) {
        console.error('RWA assets error:', error);
        res.status(500).json({ error: 'Failed to fetch assets', message: error.message });
    }
});

/**
 * GET /api/rwa/assets/:id
 * Get single RWA asset details
 */
router.get('/assets/:id', async (req: Request, res: Response) => {
    try {
        const assetId = req.params.id;

        const asset = await prisma.rwaAsset.findUnique({
            where: { id: assetId },
        });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json({
            success: true,
            asset,
        });
    } catch (error: any) {
        console.error('RWA asset detail error:', error);
        res.status(500).json({ error: 'Failed to fetch asset', message: error.message });
    }
});

/**
 * GET /api/rwa/holdings
 * Get user's RWA holdings (requires auth)
 */
router.get('/holdings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.walletAddress;

        const holdings = await prisma.rwaHolding.findMany({
            where: { walletAddress },
            include: {
                asset: {
                    select: {
                        assetCode: true,
                        name: true,
                        assetType: true,
                        unitPrice: true,
                        annualYieldPercent: true,
                        yieldFrequency: true,
                        riskLevel: true,
                        imageUrl: true,
                    },
                },
            },
            orderBy: { lastTransactionAt: 'desc' },
        });

        // Calculate portfolio metrics
        const holdingsWithValues = holdings.map(holding => {
            const currentValue = holding.quantity * (holding.asset?.unitPrice || holding.averageBuyPrice);
            const unrealizedGain = currentValue - holding.totalInvested;
            const unrealizedGainPercent = holding.totalInvested > 0
                ? (unrealizedGain / holding.totalInvested) * 100
                : 0;

            return {
                ...holding,
                currentValue,
                unrealizedGain,
                unrealizedGainPercent: unrealizedGainPercent.toFixed(2),
            };
        });

        const totalInvested = holdingsWithValues.reduce((sum, h) => sum + h.totalInvested, 0);
        const totalCurrentValue = holdingsWithValues.reduce((sum, h) => sum + h.currentValue, 0);
        const totalYieldEarned = holdingsWithValues.reduce((sum, h) => sum + h.totalYieldEarned, 0);
        const totalPendingYield = holdingsWithValues.reduce((sum, h) => sum + h.pendingYield, 0);

        res.json({
            success: true,
            holdings: holdingsWithValues,
            portfolio: {
                total_invested: totalInvested,
                current_value: totalCurrentValue,
                total_gain: totalCurrentValue - totalInvested,
                total_gain_percent: totalInvested > 0
                    ? (((totalCurrentValue - totalInvested) / totalInvested) * 100).toFixed(2)
                    : '0.00',
                total_yield_earned: totalYieldEarned,
                pending_yield: totalPendingYield,
                holdings_count: holdingsWithValues.length
            }
        });
    } catch (error: any) {
        console.error('RWA holdings error:', error);
        res.status(500).json({ error: 'Failed to fetch holdings', message: error.message });
    }
});

/**
 * POST /api/rwa/buy
 * Buy RWA tokens (initiates purchase record)
 */
router.post('/buy', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.walletAddress;
        const { assetId, quantity, paymentAsset = 'USDC' } = req.body;

        if (!assetId || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Invalid request: assetId and quantity required' });
        }

        const asset = await prisma.rwaAsset.findUnique({
            where: { id: assetId },
        });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (asset.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Asset is not available for purchase' });
        }

        const totalCost = quantity * asset.unitPrice;

        if (asset.minInvestment && totalCost < asset.minInvestment) {
            return res.status(400).json({
                error: `Minimum investment is $${asset.minInvestment}`,
                minInvestment: asset.minInvestment,
            });
        }

        if (asset.maxInvestment && totalCost > asset.maxInvestment) {
            return res.status(400).json({
                error: `Maximum investment is $${asset.maxInvestment}`,
                maxInvestment: asset.maxInvestment,
            });
        }

        if (quantity > asset.availableSupply) {
            return res.status(400).json({
                error: 'Insufficient supply available',
                availableSupply: asset.availableSupply,
            });
        }

        // Check KYC if required
        if (asset.requiresKyc) {
            const user = await prisma.user.findUnique({
                where: { walletAddress },
                select: { kycStatus: true },
            });

            if (!user || user.kycStatus !== 'APPROVED') {
                return res.status(403).json({
                    error: 'KYC verification required',
                    requiredLevel: asset.minKycLevel,
                });
            }
        }

        // Create pending purchase record
        const purchase = await prisma.rwaPurchase.create({
            data: {
                walletAddress,
                assetId,
                quantity,
                pricePerUnit: asset.unitPrice,
                totalCost,
                paymentAsset,
                status: 'PENDING',
            },
        });

        res.json({
            success: true,
            message: 'Purchase initiated',
            purchase: {
                id: purchase.id,
                asset: asset.name,
                quantity,
                price_per_unit: asset.unitPrice,
                total_cost: totalCost,
                payment_asset: paymentAsset,
                status: 'PENDING',
            },
            next_step: 'Sign and submit the transaction to complete purchase',
        });

    } catch (error: any) {
        console.error('RWA purchase error:', error);
        res.status(500).json({ error: 'Failed to initiate purchase', message: error.message });
    }
});

/**
 * POST /api/rwa/buy/:id/confirm
 * Confirm RWA purchase after on-chain transaction
 */
router.post('/buy/:id/confirm', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.walletAddress;
        const purchaseId = req.params.id;
        const { txHash } = req.body;

        const purchase = await prisma.rwaPurchase.findFirst({
            where: { id: purchaseId, walletAddress, status: 'PENDING' },
            include: { asset: true },
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Pending purchase not found' });
        }

        // Update purchase and create/update holding
        await prisma.$transaction(async (tx) => {
            // Mark purchase as confirmed
            await tx.rwaPurchase.update({
                where: { id: purchaseId },
                data: {
                    status: 'CONFIRMED',
                    txHash,
                    completedAt: new Date(),
                },
            });

            // Update or create holding
            const existingHolding = await tx.rwaHolding.findUnique({
                where: {
                    walletAddress_assetId: {
                        walletAddress,
                        assetId: purchase.assetId,
                    },
                },
            });

            if (existingHolding) {
                const newQuantity = existingHolding.quantity + purchase.quantity;
                const newTotalInvested = existingHolding.totalInvested + purchase.totalCost;
                const newAvgPrice = newTotalInvested / newQuantity;

                await tx.rwaHolding.update({
                    where: { id: existingHolding.id },
                    data: {
                        quantity: newQuantity,
                        totalInvested: newTotalInvested,
                        averageBuyPrice: newAvgPrice,
                        lastTransactionAt: new Date(),
                    },
                });
            } else {
                await tx.rwaHolding.create({
                    data: {
                        walletAddress,
                        assetId: purchase.assetId,
                        quantity: purchase.quantity,
                        averageBuyPrice: purchase.pricePerUnit,
                        totalInvested: purchase.totalCost,
                        trustlineEstablished: true,
                    },
                });
            }

            // Update available supply
            await tx.rwaAsset.update({
                where: { id: purchase.assetId },
                data: {
                    availableSupply: { decrement: purchase.quantity },
                },
            });
        });

        res.json({
            success: true,
            message: 'Purchase confirmed and holding updated',
            txHash,
        });

    } catch (error: any) {
        console.error('RWA purchase confirm error:', error);
        res.status(500).json({ error: 'Failed to confirm purchase', message: error.message });
    }
});

export default router;
