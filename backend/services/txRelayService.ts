import { Horizon, Transaction, Networks } from '@stellar/stellar-sdk';
import prisma from '../lib/prisma';
import { TransactionType, TxStatus } from '@prisma/client';

/**
 * Transaction Relay Service (Prisma Version)
 * 
 * Submits signed transactions to Stellar Horizon and tracks their status.
 */

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';

const NETWORK_PASSPHRASE = STELLAR_NETWORK === 'public'
    ? Networks.PUBLIC
    : Networks.TESTNET;

const server = new Horizon.Server(HORIZON_URL);

export interface SubmissionResult {
    success: boolean;
    hash?: string;
    error?: string;
    ledger?: number;
}

export interface TransactionStatus {
    hash: string;
    status: 'pending' | 'success' | 'failed';
    ledger?: number;
    createdAt?: string;
    error?: string;
}

export class TxRelayService {
    /**
     * Submit a signed transaction to Horizon
     * @param signedXDR Signed transaction XDR
     * @returns Submission result with transaction hash
     */
    async submitSignedTransaction(signedXDR: string): Promise<SubmissionResult> {
        try {
            // Parse transaction to extract details before submission
            const transaction = new Transaction(signedXDR, NETWORK_PASSPHRASE);

            // Submit to Horizon
            const result = await server.submitTransaction(transaction);

            return {
                success: true,
                hash: result.hash,
                ledger: result.ledger,
            };
        } catch (error: any) {
            // Parse Horizon error
            const errorMessage = this.parseHorizonError(error);

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Get transaction status from Horizon
     * @param hash Transaction hash
     * @returns Transaction status
     */
    async getTransactionStatus(hash: string): Promise<TransactionStatus> {
        try {
            const tx = await server.transactions().transaction(hash).call();

            return {
                hash: tx.hash,
                status: tx.successful ? 'success' : 'failed',
                ledger: tx.ledger_attr,
                createdAt: tx.created_at,
            };
        } catch (error: any) {
            if (error.response?.status === 404) {
                return {
                    hash,
                    status: 'pending',
                };
            }

            return {
                hash,
                status: 'failed',
                error: error.message,
            };
        }
    }

    /**
     * Record transaction in database for tracking
     * @param walletAddress User's wallet address
     * @param hash Transaction hash
     * @param fromAddress Source address
     * @param toAddress Destination address
     * @param amount Amount transferred
     * @param assetCode Asset code
     * @param type Transaction type
     */
    async recordTransaction(
        walletAddress: string,
        hash: string,
        fromAddress: string,
        toAddress: string,
        amount: string,
        assetCode: string = 'XLM',
        assetIssuer?: string,
        type: TransactionType = 'PAYMENT',
        ledger?: number
    ): Promise<void> {
        try {
            // Ensure user exists
            await prisma.user.upsert({
                where: { walletAddress },
                update: {},
                create: { walletAddress },
            });

            // Create transaction record
            await prisma.transaction.create({
                data: {
                    walletAddress,
                    txHash: hash,
                    fromAddress,
                    toAddress,
                    amount,
                    assetCode,
                    assetIssuer,
                    type,
                    status: 'PENDING',
                    ledger,
                },
            });
        } catch (error: any) {
            console.error('Failed to record transaction:', error);
        }
    }

    /**
     * Update transaction status in database
     * @param hash Transaction hash
     * @param status New status
     * @param ledger Ledger number (optional)
     */
    async updateTransactionStatus(
        hash: string,
        status: TxStatus,
        ledger?: number
    ): Promise<void> {
        try {
            await prisma.transaction.update({
                where: { txHash: hash },
                data: {
                    status,
                    ledger,
                },
            });
        } catch (error: any) {
            console.error('Failed to update transaction status:', error);
        }
    }

    /**
     * Get user's transactions
     * @param walletAddress User's wallet address
     * @param limit Number of transactions to return
     */
    async getUserTransactions(walletAddress: string, limit: number = 50) {
        return prisma.transaction.findMany({
            where: {
                OR: [
                    { walletAddress },
                    { fromAddress: walletAddress },
                    { toAddress: walletAddress },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Parse Horizon error into user-friendly message
     * @param error Horizon error object
     * @returns User-friendly error message
     */
    private parseHorizonError(error: any): string {
        // Check for response data
        if (error.response?.data?.extras?.result_codes) {
            const codes = error.response.data.extras.result_codes;

            // Transaction-level errors
            if (codes.transaction) {
                const txCode = codes.transaction;
                switch (txCode) {
                    case 'tx_failed':
                        return 'Transaction failed. Check operation errors.';
                    case 'tx_too_late':
                        return 'Transaction expired. Please try again.';
                    case 'tx_too_early':
                        return 'Transaction not yet valid. Please try again later.';
                    case 'tx_insufficient_balance':
                        return 'Insufficient balance to cover transaction fee.';
                    case 'tx_bad_seq':
                        return 'Invalid sequence number. Please refresh and try again.';
                    default:
                        return `Transaction error: ${txCode}`;
                }
            }

            // Operation-level errors
            if (codes.operations && codes.operations.length > 0) {
                const opCode = codes.operations[0];
                switch (opCode) {
                    case 'op_underfunded':
                        return 'Insufficient balance for this payment.';
                    case 'op_no_destination':
                        return 'Destination account does not exist.';
                    case 'op_not_authorized':
                        return 'Not authorized for this operation.';
                    case 'op_line_full':
                        return 'Destination account cannot accept more of this asset.';
                    case 'op_no_trust':
                        return 'Destination has not established trustline for this asset.';
                    default:
                        return `Operation error: ${opCode}`;
                }
            }
        }

        // Generic error
        return error.message || 'Transaction submission failed';
    }
}

// Export singleton instance
export const txRelayService = new TxRelayService();
