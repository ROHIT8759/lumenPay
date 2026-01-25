import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const DIDIT_API_URL = 'https://api.didit.me/v1';
const DIDIT_API_KEY = process.env.DIDIT_API_KEY;

router.post('/session', async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Missing walletAddress' });
        }

        if (!DIDIT_API_KEY) {
            console.warn('DIDIT_API_KEY not set');
            return res.status(503).json({ error: 'KYC Service Unavailable (Missing Config)' });
        }

        const response = await fetch(`${DIDIT_API_URL}/sessions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${DIDIT_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vendor_data: walletAddress,
                features: ['id_document', 'selfie'],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DiD iT API Error: ${errorText}`);
        }

        const data = (await response.json()) as any;

        await prisma.$transaction(async (tx) => {
            await tx.user.upsert({
                where: { walletAddress },
                update: { kycStatus: 'IN_PROGRESS' },
                create: { walletAddress, kycStatus: 'IN_PROGRESS' },
            });

            await tx.kycRecord.upsert({
                where: { walletAddress },
                update: {
                    provider: 'didit',
                    status: 'IN_PROGRESS',
                    providerRef: data.session_id,
                },
                create: {
                    walletAddress,
                    provider: 'didit',
                    status: 'IN_PROGRESS',
                    providerRef: data.session_id,
                },
            });
        });

        res.json({
            success: true,
            verification_url: data.verification_url,
            session_id: data.session_id,
        });
    } catch (error: any) {
        console.error('KYC Session Error:', error);
        res.status(500).json({ error: 'Failed to create KYC session', details: error.message });
    }
});

/**
 * GET /api/kyc/status
 * Get KYC status for a wallet
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.query;

        if (!walletAddress || typeof walletAddress !== 'string') {
            return res.status(400).json({ error: 'Missing walletAddress' });
        }

        const [user, kyc] = await Promise.all([
            prisma.user.findUnique({
                where: { walletAddress },
                select: { kycStatus: true },
            }),
            prisma.kycRecord.findUnique({
                where: { walletAddress },
                select: { providerRef: true },
            }),
        ]);

        if (!user) {
            return res.json({
                success: true,
                status: 'NOT_STARTED',
            });
        }

        if (user.kycStatus === 'APPROVED' || user.kycStatus === 'REJECTED') {
            return res.json({
                success: true,
                status: user.kycStatus,
            });
        }

        if (kyc?.providerRef && DIDIT_API_KEY) {
            const response = await fetch(`${DIDIT_API_URL}/sessions/${kyc.providerRef}/decision`, {
                headers: {
                    Authorization: `Bearer ${DIDIT_API_KEY}`,
                },
            });

            if (response.ok) {
                const decision = (await response.json()) as any;
                const newStatus = decision.decision === 'Accept' ? 'APPROVED' :
                    decision.decision === 'Reject' ? 'REJECTED' : user.kycStatus;

                // Update DB if status changed to final
                if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
                    await prisma.$transaction(async (tx) => {
                        await tx.user.update({
                            where: { walletAddress },
                            data: { kycStatus: newStatus },
                        });

                        await tx.kycRecord.update({
                            where: { walletAddress },
                            data: {
                                status: newStatus,
                                verifiedAt: new Date(),
                            },
                        });
                    });
                }

                return res.json({
                    success: true,
                    status: newStatus,
                });
            }
        }

        res.json({
            success: true,
            status: user.kycStatus,
        });
    } catch (error: any) {
        console.error('KYC Status Error:', error);
        res.status(500).json({ error: 'Failed to check KYC status' });
    }
});

export default router;
