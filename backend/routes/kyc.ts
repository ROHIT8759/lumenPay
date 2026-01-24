import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const DIDIT_API_URL = 'https://api.didit.me/v1'; // Verify actual URL
import { createClient } from '@supabase/supabase-js';
import prisma from '../lib/prisma';

const router = Router();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DIDIT_API_URL = 'https://api.didit.me/v1'; // Verify actual URL
const DIDIT_API_KEY = process.env.DIDIT_API_KEY;

/**
 * POST /api/kyc/session
 * Create a new KYC verification session
 */
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

        await prisma.user.update({
            where: { walletAddress },
            data: {
                kycSessionId: data.session_id,
                kycStatus: 'IN_PROGRESS',
            },
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

        const { data: session } = await supabase
            .from('kyc_sessions')
            .select('*')
            .eq('wallet_address', walletAddress)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (session && (session.status === 'APPROVED' || session.status === 'REJECTED')) {
            return res.json({
                success: true,
                status: session.status,
                confidence_score: session.confidence_score,
            });
        }

        if (session?.session_id && DIDIT_API_KEY) {
            const response = await fetch(`${DIDIT_API_URL}/sessions/${session.session_id}/decision`, {
                headers: {
                    Authorization: `Bearer ${DIDIT_API_KEY}`,
                },
            });

            if (response.ok) {
                const decision = (await response.json()) as any;
                const status = decision.decision === 'Accept' ? 'APPROVED' : decision.decision === 'Reject' ? 'REJECTED' : 'PENDING';

                if (status !== 'PENDING') {
                    await supabase
                        .from('kyc_sessions')
                        .update({
                            status,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('session_id', session.session_id);
                }

                return res.json({
                    success: true,
                    status,
                    confidence_score: decision.score,
                });
            }
        }

        res.json({
            success: true,
            status: session?.status || 'NOT_STARTED',
        });
    } catch (error: any) {
        console.error('KYC Status Error:', error);
        res.status(500).json({ error: 'Failed to check KYC status' });
    }
});

export default router;
