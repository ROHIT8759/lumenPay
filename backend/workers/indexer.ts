import { createClient } from '@supabase/supabase-js';
import { IndexerService } from '../services/indexerService';
import dotenv from 'dotenv';

/**
 * Background Indexer Worker
 * 
 * Runs continuously to index Stellar events from Horizon and Soroban.
 * Restart-safe with database-backed cursor.
 */

dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const indexer = new IndexerService(supabase);

// Start indexer
indexer.start();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down indexer...');
    indexer.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down indexer...');
    indexer.stop();
    process.exit(0);
});

console.log('✅ Indexer worker started');
