import { LedgerType, TxType, TxStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

/**
 * Off-Chain Ledger Service
 * 
 * Handles internal off-chain transactions:
 * - Instant transfers between users
 * - Balance management
 * - Atomic debits/credits
 * 
 * These transactions are:
 * - Gasless
 * - Instant
 * - Reversible (before settlement)
 */

export interface TransferParams {
    fromWallet: string;
    toWallet: string;
    amount: number;
    asset: string;
    memo?: string;
}

export interface TransferResult {
    success: boolean;
    transactionId?: string;
    error?: string;
}

export interface BalanceResult {
    balance: number;
    asset: string;
    walletAddress: string;
}

class OffchainLedgerService {
    private async ensureUser(tx: Prisma.TransactionClient, walletAddress: string) {
        await tx.user.upsert({
            where: { walletAddress },
            update: {},
            create: { walletAddress },
        });
    }

    /**
     * Get off-chain balance for a wallet
     */
    async getBalance(walletAddress: string, asset: string = 'XLM'): Promise<BalanceResult> {
        const balance = await prisma.offchainBalance.findUnique({
            where: {
                walletAddress_asset: {
                    walletAddress,
                    asset,
                },
            },
        });

        return {
            balance: balance?.balance ?? 0,
            asset,
            walletAddress,
        };
    }

    /**
     * Get all balances for a wallet
     */
    async getAllBalances(walletAddress: string): Promise<BalanceResult[]> {
        const balances = await prisma.offchainBalance.findMany({
            where: { walletAddress },
        });

        return balances.map(b => ({
            balance: b.balance,
            asset: b.asset,
            walletAddress: b.walletAddress,
        }));
    }

    /**
     * Credit an off-chain balance (e.g., from on-ramp)
     */
    async credit(walletAddress: string, amount: number, asset: string = 'XLM'): Promise<void> {
        await prisma.$transaction(async (tx) => {
            await this.ensureUser(tx, walletAddress);

            await tx.offchainBalance.upsert({
                where: {
                    walletAddress_asset: {
                        walletAddress,
                        asset,
                    },
                },
                create: {
                    walletAddress,
                    asset,
                    balance: amount,
                },
                update: {
                    balance: {
                        increment: amount,
                    },
                },
            });
        });
    }

    /**
     * Debit an off-chain balance (e.g., for off-ramp)
     * Returns false if insufficient balance
     */
    async debit(walletAddress: string, amount: number, asset: string = 'XLM'): Promise<boolean> {
        await prisma.user.upsert({
            where: { walletAddress },
            update: {},
            create: { walletAddress },
        });

        const current = await this.getBalance(walletAddress, asset);
        
        if (current.balance < amount) {
            return false;
        }

        await prisma.offchainBalance.update({
            where: {
                walletAddress_asset: {
                    walletAddress,
                    asset,
                },
            },
            data: {
                balance: {
                    decrement: amount,
                },
            },
        });

        return true;
    }

    /**
     * Transfer between two off-chain wallets
     * Atomic: both debit and credit succeed or both fail
     */
    async transfer(params: TransferParams): Promise<TransferResult> {
        const { fromWallet, toWallet, amount, asset, memo } = params;

        if (amount <= 0) {
            return { success: false, error: 'Amount must be positive' };
        }

        if (fromWallet === toWallet) {
            return { success: false, error: 'Cannot transfer to self' };
        }

        try {
            // Use a transaction for atomicity
            const result = await prisma.$transaction(async (tx) => {
                await this.ensureUser(tx, fromWallet);
                await this.ensureUser(tx, toWallet);

                // Check sender balance
                const senderBalance = await tx.offchainBalance.findUnique({
                    where: {
                        walletAddress_asset: {
                            walletAddress: fromWallet,
                            asset,
                        },
                    },
                });

                if (!senderBalance || senderBalance.balance < amount) {
                    throw new Error('Insufficient off-chain balance');
                }

                // Debit sender
                await tx.offchainBalance.update({
                    where: {
                        walletAddress_asset: {
                            walletAddress: fromWallet,
                            asset,
                        },
                    },
                    data: {
                        balance: {
                            decrement: amount,
                        },
                    },
                });

                // Credit receiver (upsert in case they don't have a balance record)
                await tx.offchainBalance.upsert({
                    where: {
                        walletAddress_asset: {
                            walletAddress: toWallet,
                            asset,
                        },
                    },
                    create: {
                        walletAddress: toWallet,
                        asset,
                        balance: amount,
                    },
                    update: {
                        balance: {
                            increment: amount,
                        },
                    },
                });

                // Record transaction for sender
                const senderTx = await tx.unifiedTransaction.create({
                    data: {
                        walletAddress: fromWallet,
                        ledger: LedgerType.OFFCHAIN,
                        type: TxType.PAYMENT,
                        asset,
                        amount,
                        status: TxStatus.CONFIRMED,
                        fromAddress: fromWallet,
                        toAddress: toWallet,
                        memo,
                    },
                });

                // Record transaction for receiver
                await tx.unifiedTransaction.create({
                    data: {
                        walletAddress: toWallet,
                        ledger: LedgerType.OFFCHAIN,
                        type: TxType.PAYMENT,
                        asset,
                        amount,
                        status: TxStatus.CONFIRMED,
                        fromAddress: fromWallet,
                        toAddress: toWallet,
                        memo,
                    },
                });

                return senderTx.id;
            });

            return {
                success: true,
                transactionId: result,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Transfer failed',
            };
        }
    }

    /**
     * Get transaction history for a wallet
     */
    async getTransactionHistory(
        walletAddress: string,
        options: { limit?: number; ledger?: LedgerType } = {}
    ) {
        const { limit = 50, ledger } = options;

        return prisma.unifiedTransaction.findMany({
            where: {
                walletAddress,
                ...(ledger && { ledger }),
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
    }
}

export const offchainLedgerService = new OffchainLedgerService();
