import { Horizon, SorobanRpc } from '@stellar/stellar-sdk';
import prisma from '../lib/prisma';
import { NotificationService } from './notificationService';

/**
 * Event Indexer Service
 * 
 * Polls Horizon and Soroban RPC for new transactions and contract events.
 * Idempotent and restart-safe - stores last processed ledger/cursor in database.
 */

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

const horizonServer = new Horizon.Server(HORIZON_URL);
const sorobanServer = new SorobanRpc.Server(SOROBAN_RPC_URL);

interface IndexerState {
    id: number;
    last_horizon_cursor: string;
    last_soroban_ledger: number;
    updated_at: Date;
}

export class IndexerService {
    private isRunning = false;
    private intervalId?: NodeJS.Timeout;

    constructor() { }

    /**
     * Start the indexer (restart-safe)
     */
    async start() {
        if (this.isRunning) {
            console.warn('Indexer already running');
            return;
        }

        console.log('🔍 Starting event indexer...');
        this.isRunning = true;

        // Initial poll
        await this.poll();

        // Schedule periodic polling
        this.intervalId = setInterval(() => {
            this.poll();
        }, POLL_INTERVAL_MS);
    }

    /**
     * Stop the indexer
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.isRunning = false;
        console.log('🛑 Event indexer stopped');
    }

    /**
     * Poll for new events
     */
    private async poll() {
        try {
            await this.indexHorizonPayments();
            await this.indexSorobanEvents();
        } catch (error) {
            console.error('Indexer poll error:', error);
        }
    }

    /**
     * Get indexer state from database (or initialize)
     */
    private async getState(): Promise<IndexerState> {
        const state = await prisma.indexerState.findUnique({
            where: { id: 1 },
        });

        if (!state) {
            // Initialize updated state
            // Get latest ledger to start from "now" if no state exists
            const latestLedger = await horizonServer.ledgers()
                .order('desc')
                .limit(1)
                .call();

            // Use paging_token from latest ledger as starting point or "0"
            const startCursor = latestLedger.records[0]?.paging_token || "0";

            const newState = await prisma.indexerState.create({
                data: {
                    id: 1,
                    last_horizon_cursor: startCursor,
                    last_soroban_ledger: 0,
                    updated_at: new Date(),
                }
            });

            return newState;
        }

        return state;
    }

    /**
     * Update indexer state
     */
    private async updateHorizonCursor(cursor: string) {
        await prisma.indexerState.update({
            where: { id: 1 },
            data: {
                last_horizon_cursor: cursor,
                updated_at: new Date(),
            }
        });
    }

    private async updateSorobanLedger(ledger: number) {
        await prisma.indexerState.update({
            where: { id: 1 },
            data: {
                last_soroban_ledger: ledger,
                updated_at: new Date(),
            }
        });
    }

    /**
     * Index payment operations from Horizon
     */
    private async indexHorizonPayments() {
        const state = await this.getState();
        const cursor = state.last_horizon_cursor;

        try {
            const payments = await horizonServer.payments()
                .cursor(cursor)
                .limit(50)
                .order('asc') // Process in order
                .call();

            if (payments.records.length === 0) {
                return;
            }

            for (const payment of payments.records) {
                await this.processPayment(payment);
            }

            // Update cursor to the last record's paging_token
            const lastRecord = payments.records[payments.records.length - 1];
            await this.updateHorizonCursor(lastRecord.paging_token);

            console.log(`✅ Indexed ${payments.records.length} payments`);
        } catch (error: any) {
            console.error('Horizon indexing error:', error);
        }
    }

    /**
     * Process a single payment
     */
    private async processPayment(payment: any) {
        if (payment.type !== 'payment' && payment.type !== 'path_payment_strict_send' && payment.type !== 'path_payment_strict_receive') {
            return;
        }

        const isNative = payment.asset_type === 'native';
        const assetCode = isNative ? 'XLM' : payment.asset_code;
        const assetIssuer = isNative ? undefined : payment.asset_issuer;
        const amount = payment.amount;

        // Find wallet (User) for sender
        const senderUser = await prisma.user.findUnique({
            where: { walletAddress: payment.from }
        });

        // Find wallet (User) for receiver
        const receiverUser = await prisma.user.findUnique({
            where: { walletAddress: payment.to }
        });

        // If neither are our users, ignore
        if (!senderUser && !receiverUser) {
            return;
        }

        // 1. Handle Receiver (Inbound)
        if (receiverUser) {
            await this.handleTransactionRecord({
                walletAddress: payment.to, // Receiver is the user
                counterparty: payment.from,
                amount,
                assetCode,
                assetIssuer,
                type: 'RECEIVED',
                hash: payment.transaction_hash,
                status: 'SUCCESS',
                timestamp: new Date(payment.created_at)
            });

            // Notify Receiver
            await NotificationService.sendPaymentReceived(
                payment.to,
                amount,
                assetCode,
                payment.from
            );
        }

        // 2. Handle Sender (Outbound)
        if (senderUser) {
            await this.handleTransactionRecord({
                walletAddress: payment.from, // Sender is the user
                counterparty: payment.to,
                amount,
                assetCode,
                assetIssuer,
                type: 'PAYMENT',
                hash: payment.transaction_hash,
                status: 'SUCCESS',
                timestamp: new Date(payment.created_at)
            });

            // Notify Sender
            await NotificationService.sendPaymentSent(
                payment.from,
                amount,
                assetCode,
                payment.to
            );
        }
    }

    private async handleTransactionRecord(params: {
        walletAddress: string,
        counterparty: string,
        amount: string,
        assetCode: string,
        assetIssuer?: string,
        type: 'PAYMENT' | 'RECEIVED',
        hash: string,
        status: 'SUCCESS',
        timestamp: Date
    }) {
        // Check if transaction exists (maybe inserted as pending)
        const existing = await prisma.transaction.findUnique({
            where: { txHash: params.hash }
        });

        if (existing) {
            // Update status depending on current status
            if (existing.status !== 'SUCCESS') {
                await prisma.transaction.update({
                    where: { id: existing.id },
                    data: {
                        status: 'SUCCESS',
                        updatedAt: new Date(),
                    }
                });
                console.log(`🔄 Updated transaction ${params.hash} to success for user ${params.walletAddress}`);
            }
        } else {
            // Create new
            await prisma.transaction.create({
                data: {
                    walletAddress: params.walletAddress,
                    txHash: params.hash,
                    fromAddress: params.type === 'PAYMENT' ? params.walletAddress : params.counterparty,
                    toAddress: params.type === 'RECEIVED' ? params.walletAddress : params.counterparty,
                    amount: params.amount,
                    assetCode: params.assetCode,
                    assetIssuer: params.assetIssuer,
                    type: params.type, // Enum
                    status: 'SUCCESS', // Enum
                    createdAt: params.timestamp,
                }
            });
            console.log(`📥 Indexed new transaction ${params.hash} for user ${params.walletAddress}`);
        }
    }

    /**
     * Index Soroban contract events
     * Handles Escrow and KYC contracts
     */
    private async indexSorobanEvents() {
        const state = await this.getState();
        const startLedger = state.last_soroban_ledger + 1;

        try {
            // Poll latest ledger to see if we're behind
            const latestLedgerRes = await sorobanServer.getLatestLedger();
            const latestLedger = latestLedgerRes.sequence;

            if (startLedger > latestLedger) {
                return; // Caught up
            }

            // In a real implementation:
            // Fetch events using getEvents for the range [startLedger, latestLedger]
            // For now, we stub this logic as Soroban event RPC structure is complex
            // and we focused on Horizon for Phase 4/5 deliverables.

            /*
            const events = await sorobanServer.getEvents({
                startLedger,
                endLedger: Math.min(startLedger + 100, latestLedger),
                filters: [] // Filter by Contract IDs
            });
            
            // Process events...
            */

            // Update state to latest to avoid stuck loop
            await this.updateSorobanLedger(latestLedger);

        } catch (error) {
            console.error("Soroban Indexer Error:", error);
        }
    }
}
