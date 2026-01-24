import { PrismaClient, RampStatus, LedgerType, TxType, TxStatus } from '@prisma/client';
import { offchainLedgerService } from './offchainLedgerService';
import { walletService } from './walletService';

/**
 * Ramp Service
 * 
 * Handles on-ramp (INR -> Crypto) and off-ramp (Crypto -> INR) intents.
 * 
 * On-Ramp Flow:
 * 1. Create intent with INR amount
 * 2. User confirms external INR payment
 * 3. Credit off-chain balance
 * 4. Build on-chain tx for user to sign
 * 5. Submit signed tx
 * 6. Complete intent
 * 
 * Off-Ramp Flow:
 * 1. Create intent with crypto amount
 * 2. Lock crypto on-chain (escrow)
 * 3. Confirm lock event
 * 4. Credit off-chain, trigger INR payout
 * 5. Complete intent
 */

const prisma = new PrismaClient();

// Mock exchange rate - in production, fetch from oracle
const MOCK_EXCHANGE_RATE = 85.0; // 1 XLM = 85 INR

export interface OnRampIntentParams {
    walletAddress: string;
    inrAmount: number;
    asset?: string;
}

export interface OffRampIntentParams {
    walletAddress: string;
    cryptoAmount: number;
    asset?: string;
    bankAccountNo?: string;
    bankIfsc?: string;
    upiId?: string;
}

class RampService {
    // =========================================================================
    // ON-RAMP (INR -> Crypto)
    // =========================================================================

    /**
     * Create a new on-ramp intent
     */
    async createOnRampIntent(params: OnRampIntentParams) {
        const { walletAddress, inrAmount, asset = 'XLM' } = params;

        const exchangeRate = MOCK_EXCHANGE_RATE;
        const cryptoAmount = inrAmount / exchangeRate;

        const intent = await prisma.onRampIntent.create({
            data: {
                walletAddress,
                inrAmount,
                cryptoAmount,
                asset,
                exchangeRate,
                status: RampStatus.PENDING,
            },
        });

        return {
            id: intent.id,
            inrAmount,
            cryptoAmount,
            exchangeRate,
            asset,
            status: intent.status,
            paymentInstructions: {
                method: 'UPI',
                upiId: 'lumenpay@ybl',
                reference: intent.id.slice(0, 8).toUpperCase(),
                amount: inrAmount,
            },
        };
    }

    /**
     * Confirm INR payment received (called by admin or webhook)
     */
    async confirmInrPayment(intentId: string, paymentRef: string) {
        const intent = await prisma.onRampIntent.findUnique({
            where: { id: intentId },
        });

        if (!intent) {
            throw new Error('Intent not found');
        }

        if (intent.status !== RampStatus.PENDING) {
            throw new Error(`Invalid status: ${intent.status}`);
        }

        // Update intent
        await prisma.onRampIntent.update({
            where: { id: intentId },
            data: {
                status: RampStatus.INR_CONFIRMED,
                paymentRef,
            },
        });

        // Credit off-chain balance immediately
        await offchainLedgerService.credit(
            intent.walletAddress,
            intent.cryptoAmount!,
            intent.asset
        );

        // Record transaction
        await prisma.unifiedTransaction.create({
            data: {
                walletAddress: intent.walletAddress,
                ledger: LedgerType.HYBRID,
                type: TxType.ON_RAMP,
                asset: intent.asset,
                amount: intent.cryptoAmount!,
                status: TxStatus.SUCCESS,
                memo: `On-ramp: ${intent.inrAmount} INR`,
            },
        });

        return {
            success: true,
            offchainCredited: intent.cryptoAmount,
        };
    }

    /**
     * Build on-chain transaction for on-ramp completion
     * User can optionally move funds on-chain after off-chain credit
     */
    async buildOnRampOnChainTx(intentId: string, toAddress: string) {
        const intent = await prisma.onRampIntent.findUnique({
            where: { id: intentId },
        });

        if (!intent) {
            throw new Error('Intent not found');
        }

        if (intent.status !== RampStatus.INR_CONFIRMED) {
            throw new Error(`Invalid status for on-chain: ${intent.status}`);
        }

        // Build unsigned payment from platform wallet to user
        // Note: In production, this would be from a funded platform wallet
        const result = await walletService.buildUnsignedPayment(
            process.env.STELLAR_ADMIN_ADDRESS!,
            toAddress,
            intent.cryptoAmount!.toString(),
            intent.asset === 'XLM' ? undefined : intent.asset,
            undefined
        );

        return {
            xdr: result.xdr,
            network: result.network,
            intentId,
            amount: intent.cryptoAmount,
        };
    }

    /**
     * Complete on-ramp after on-chain tx confirmed
     */
    async completeOnRamp(intentId: string, txHash: string) {
        await prisma.onRampIntent.update({
            where: { id: intentId },
            data: {
                status: RampStatus.COMPLETED,
                txHash,
                completedAt: new Date(),
            },
        });

        return { success: true };
    }

    // =========================================================================
    // OFF-RAMP (Crypto -> INR)
    // =========================================================================

    /**
     * Create a new off-ramp intent
     */
    async createOffRampIntent(params: OffRampIntentParams) {
        const { walletAddress, cryptoAmount, asset = 'XLM', bankAccountNo, bankIfsc, upiId } = params;

        // Validate bank details
        if (!bankAccountNo && !upiId) {
            throw new Error('Either bank account or UPI ID required');
        }

        const exchangeRate = MOCK_EXCHANGE_RATE;
        const inrAmount = cryptoAmount * exchangeRate;

        const intent = await prisma.offRampIntent.create({
            data: {
                walletAddress,
                cryptoAmount,
                inrAmount,
                asset,
                exchangeRate,
                bankAccountNo,
                bankIfsc,
                upiId,
                status: RampStatus.PENDING,
            },
        });

        return {
            id: intent.id,
            cryptoAmount,
            inrAmount,
            exchangeRate,
            asset,
            status: intent.status,
            instructions: {
                action: 'Lock crypto in escrow to proceed',
            },
        };
    }

    /**
     * Confirm crypto locked on-chain (called by indexer when lock tx confirmed)
     */
    async confirmCryptoLocked(intentId: string, lockTxHash: string) {
        const intent = await prisma.offRampIntent.findUnique({
            where: { id: intentId },
        });

        if (!intent) {
            throw new Error('Intent not found');
        }

        if (intent.status !== RampStatus.PENDING) {
            throw new Error(`Invalid status: ${intent.status}`);
        }

        // Update intent
        await prisma.offRampIntent.update({
            where: { id: intentId },
            data: {
                status: RampStatus.CRYPTO_LOCKED,
                lockTxHash,
            },
        });

        // Credit off-chain balance for internal use
        await offchainLedgerService.credit(
            intent.walletAddress,
            intent.cryptoAmount,
            intent.asset
        );

        return {
            success: true,
            lockedAmount: intent.cryptoAmount,
        };
    }

    /**
     * Trigger INR payout (called after crypto locked)
     */
    async triggerInrPayout(intentId: string) {
        const intent = await prisma.offRampIntent.findUnique({
            where: { id: intentId },
        });

        if (!intent) {
            throw new Error('Intent not found');
        }

        if (intent.status !== RampStatus.CRYPTO_LOCKED) {
            throw new Error(`Invalid status for payout: ${intent.status}`);
        }

        // Debit off-chain balance
        const debited = await offchainLedgerService.debit(
            intent.walletAddress,
            intent.cryptoAmount,
            intent.asset
        );

        if (!debited) {
            throw new Error('Failed to debit off-chain balance');
        }

        // In production: trigger actual bank/UPI transfer here
        const payoutRef = `PAYOUT-${Date.now()}`;

        await prisma.offRampIntent.update({
            where: { id: intentId },
            data: {
                status: RampStatus.INR_SENT,
                payoutRef,
            },
        });

        // Record transaction
        await prisma.unifiedTransaction.create({
            data: {
                walletAddress: intent.walletAddress,
                ledger: LedgerType.HYBRID,
                type: TxType.OFF_RAMP,
                asset: intent.asset,
                amount: intent.cryptoAmount,
                status: TxStatus.SUCCESS,
                txHash: intent.lockTxHash,
                memo: `Off-ramp: ${intent.inrAmount} INR`,
            },
        });

        return {
            success: true,
            payoutRef,
            inrAmount: intent.inrAmount,
        };
    }

    /**
     * Complete off-ramp after INR confirmed
     */
    async completeOffRamp(intentId: string) {
        await prisma.offRampIntent.update({
            where: { id: intentId },
            data: {
                status: RampStatus.COMPLETED,
                completedAt: new Date(),
            },
        });

        return { success: true };
    }

    // =========================================================================
    // QUERIES
    // =========================================================================

    async getOnRampIntent(intentId: string) {
        return prisma.onRampIntent.findUnique({
            where: { id: intentId },
        });
    }

    async getOffRampIntent(intentId: string) {
        return prisma.offRampIntent.findUnique({
            where: { id: intentId },
        });
    }

    async getUserRampHistory(walletAddress: string) {
        const [onRamps, offRamps] = await Promise.all([
            prisma.onRampIntent.findMany({
                where: { walletAddress },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            prisma.offRampIntent.findMany({
                where: { walletAddress },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
        ]);

        return { onRamps, offRamps };
    }
}

export const rampService = new RampService();
