import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { randomBytes } from 'crypto';

/**
 * Telegram Routes
 * 
 * Handles Telegram bot integration:
 * - POST /telegram/link/request - Generate link code
 * - POST /telegram/link/verify - Verify link
 * - POST /telegram/unlink - Unlink Telegram
 * - GET /telegram/status - Check link status
 */

const router = Router();

// Temporary storage for link codes (in production, use Redis or DB)
const linkCodes = new Map<string, { walletAddress: string; expiresAt: Date }>();

/**
 * POST /telegram/link/request
 * Generate a link code for connecting Telegram
 */
router.post('/link/request', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.publicKey;

        // Check if already linked
        const existingLink = await prisma.telegramLink.findUnique({
            where: { walletAddress },
        });

        if (existingLink) {
            return res.status(400).json({
                error: 'Already linked',
                message: 'Your wallet is already linked to a Telegram account',
                telegramUserId: existingLink.telegramUserId,
            });
        }

        // Generate unique link code
        const linkCode = randomBytes(4).toString('hex').toUpperCase();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store link code
        linkCodes.set(linkCode, { walletAddress, expiresAt });

        // Cleanup expired codes
        for (const [code, data] of linkCodes) {
            if (data.expiresAt < new Date()) {
                linkCodes.delete(code);
            }
        }

        res.json({
            success: true,
            linkCode,
            expiresAt,
            botUsername: process.env.TELEGRAM_BOT_USERNAME || 'LumenPayBot',
            instructions: `Send /link ${linkCode} to @LumenPayBot on Telegram`,
        });
    } catch (error: any) {
        console.error('Request link code error:', error);
        res.status(500).json({
            error: 'Failed to generate link code',
            message: error.message,
        });
    }
});

/**
 * POST /telegram/link/verify
 * Verify link code (called by Telegram bot)
 * Body: { linkCode, telegramUserId, telegramChat }
 */
router.post('/link/verify', async (req, res: Response) => {
    try {
        const { linkCode, telegramUserId, telegramChat } = req.body;

        if (!linkCode || !telegramUserId) {
            return res.status(400).json({
                error: 'Missing required fields',
            });
        }

        // Get link code data
        const linkData = linkCodes.get(linkCode.toUpperCase());

        if (!linkData) {
            return res.status(404).json({
                error: 'Invalid link code',
                message: 'Link code not found or expired',
            });
        }

        if (linkData.expiresAt < new Date()) {
            linkCodes.delete(linkCode);
            return res.status(400).json({
                error: 'Link code expired',
            });
        }

        // Check if Telegram user is already linked to another wallet
        const existingLinkForTelegram = await prisma.telegramLink.findFirst({
            where: { telegramUserId: telegramUserId.toString() },
        });

        if (existingLinkForTelegram) {
            return res.status(400).json({
                error: 'Telegram already linked',
                message: 'This Telegram account is already linked to another wallet',
            });
        }

        // Create link
        const link = await prisma.telegramLink.create({
            data: {
                walletAddress: linkData.walletAddress,
                telegramUserId: telegramUserId.toString(),
                telegramChat: telegramChat?.toString(),
            },
        });

        // Remove used link code
        linkCodes.delete(linkCode);

        res.json({
            success: true,
            message: 'Telegram linked successfully',
            walletAddress: linkData.walletAddress,
        });
    } catch (error: any) {
        console.error('Verify link error:', error);
        res.status(500).json({
            error: 'Failed to verify link',
            message: error.message,
        });
    }
});

/**
 * POST /telegram/unlink
 * Unlink Telegram from wallet
 */
router.post('/unlink', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.publicKey;

        const link = await prisma.telegramLink.findUnique({
            where: { walletAddress },
        });

        if (!link) {
            return res.status(404).json({
                error: 'Not linked',
                message: 'Your wallet is not linked to Telegram',
            });
        }

        await prisma.telegramLink.delete({
            where: { walletAddress },
        });

        res.json({
            success: true,
            message: 'Telegram unlinked successfully',
        });
    } catch (error: any) {
        console.error('Unlink error:', error);
        res.status(500).json({
            error: 'Failed to unlink',
            message: error.message,
        });
    }
});

/**
 * GET /telegram/status
 * Check Telegram link status
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user!.publicKey;

        const link = await prisma.telegramLink.findUnique({
            where: { walletAddress },
        });

        res.json({
            success: true,
            linked: !!link,
            telegramUserId: link?.telegramUserId,
            linkedAt: link?.linkedAt,
        });
    } catch (error: any) {
        console.error('Get status error:', error);
        res.status(500).json({
            error: 'Failed to get status',
            message: error.message,
        });
    }
});

/**
 * POST /telegram/notify
 * Send notification to user (internal endpoint)
 * Body: { walletAddress, message, type }
 */
router.post('/notify', async (req, res: Response) => {
    try {
        const { walletAddress, message, type = 'info' } = req.body;

        if (!walletAddress || !message) {
            return res.status(400).json({
                error: 'Missing required fields',
            });
        }

        // Get Telegram link
        const link = await prisma.telegramLink.findUnique({
            where: { walletAddress },
        });

        if (!link) {
            return res.status(404).json({
                error: 'User not linked to Telegram',
            });
        }

        // Send message via Telegram Bot API
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken || botToken === 'placeholder') {
            console.log('Telegram notification (mock):', { walletAddress, message, type });
            return res.json({
                success: true,
                mock: true,
                message: 'Notification queued (bot not configured)',
            });
        }

        // Real Telegram API call
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: link.telegramChat || link.telegramUserId,
                text: message,
                parse_mode: 'HTML',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Telegram API error: ${error}`);
        }

        res.json({
            success: true,
            message: 'Notification sent',
        });
    } catch (error: any) {
        console.error('Send notification error:', error);
        res.status(500).json({
            error: 'Failed to send notification',
            message: error.message,
        });
    }
});

export default router;
