import { Horizon, SorobanRpc } from '@stellar/stellar-sdk';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Event Indexer Service
 * 
 * Polls Horizon and Soroban RPC for new transactions and contract events.
 * Idempotent and restart-safe - stores last processed ledger in database.
 */

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

const horizonServer = new Horizon.Server(HORIZON_URL);
const sorobanServer = new SorobanRpc.Server(SOROBAN_RPC_URL);

interface IndexerState {
    last_horizon_ledger: number;
    last_soroban_ledger: number;
    updated_at: string;
}

export class IndexerService {
    private supabase: SupabaseClient;
    private isRunning = false;
    private intervalId?: NodeJS.Timeout;

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
    }

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
            // await this.indexSorobanEvents(); // Uncomment when Soroban integration is ready
        } catch (error) {
            console.error('Indexer poll error:', error);
        }
    }

    /**
     * Get indexer state from database (or initialize)
     */
    private async getState(): Promise<IndexerState> {
        const { data, error } = await this.supabase
            .from('indexer_state')
            .select('*')
            .single();

        if (error || !data) {
            // Initialize state
            const latestLedger = await horizonServer.ledgers()
                .order('desc')
                .limit(1)
                .call();

            const initialState: IndexerState = {
                last_horizon_ledger: latestLedger.records[0]?.sequence || 0,
                last_soroban_ledger: 0,
                updated_at: new Date().toISOString(),
            };

            await this.supabase
                .from('indexer_state')
                .insert(initialState);

            return initialState;
        }

        return data as IndexerState;
    }

    /**
     * Update indexer state
     */
    private async updateState(updates: Partial<IndexerState>) {
        await this.supabase
            .from('indexer_state')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', 1); // Assuming single row with id=1
    }

    /**
     * Index payment operations from Horizon
     */
    private async indexHorizonPayments() {
        const state = await this.getState();
        const cursor = state.last_horizon_ledger.toString();

        try {
            const payments = await horizonServer.payments()
                .cursor(cursor)
                .limit(200)
                .call();

            if (payments.records.length === 0) {
                return;
            }

            for (const payment of payments.records) {
                await this.processPayment(payment);
            }

            // Update cursor
            const lastRecord = payments.records[payments.records.length - 1];
            await this.updateState({
                last_horizon_ledger: parseInt(lastRecord.paging_token),
            });

            console.log(`✅ Indexed ${payments.records.length} payments`);
        } catch (error: any) {
            console.error('Horizon indexing error:', error);
        }
    }

    /**
     * Process a single payment
     */
    private async processPayment(payment: any) {
        if (payment.type !== 'payment') {
            return;
        }

        // Find wallet and user for this payment
        const { data: wallet } = await this.supabase
            .from('wallets')
            .select('user_id')
            .or(`public_key.eq.${payment.from},public_key.eq.${payment.to}`)
            .single();

        if (!wallet) {
            return; // Not our user
        }

        // Check if already indexed
        const { data: existing } = await this.supabase
            .from('transactions')
            .select('id')
            .eq('tx_hash', payment.transaction_hash)
            .single();

        if (existing) {
            return; // Already indexed
        }

        // Insert transaction record
        await this.supabase
            .from('transactions')
            .insert({
                user_id: wallet.user_id,
                tx_hash: payment.transaction_hash,
                from_address: payment.from,
                to_address: payment.to,
                amount: payment.amount,
                asset_code: payment.asset_code || 'XLM',
                asset_issuer: payment.asset_issuer,
                tx_type: payment.from === payment.to ? 'payment_in' : 'payment_out',
                status: 'success',
                confirmed_at: payment.created_at,
                created_at: payment.created_at,
            });

        console.log(`📥 Indexed payment: ${payment.transaction_hash}`);

        // TODO: Trigger notification
    }

    /**
     * Index Soroban contract events
     * (Placeholder for Phase 3)
     */
    private async indexSorobanEvents() {
        // TODO: Query Soroban RPC for contract events
        // Filter for escrow contract events (CollateralLocked, Released, Liquidated)
        // Update loans and loan_collateral tables
        // Trigger notifications
    }
}
