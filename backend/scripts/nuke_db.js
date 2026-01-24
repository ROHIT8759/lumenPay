const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function nuke() {
    // Use direct URL for DDL
    // Hardcoded for script use based on schema.prisma
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres.jsismwafswmoqwfbfswv:dola%40sohom123%23@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
    
    console.log('DEBUG: connectionString length:', connectionString ? connectionString.length : 0);
    
    if (!connectionString) {
        console.error('DATABASE_URL not found');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        console.log('Connected to DB. Dropping conflicting tables...');
        
        // Drop tables that reference auth schema or conflict with our new schema
        await client.query('DROP TABLE IF EXISTS public.profiles CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.transactions CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.wallets CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.contacts CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.kyc_status CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.bank_payouts CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.qr_scans CASCADE;');
        
        // Drop Enums
        await client.query('DROP TYPE IF EXISTS public."KycStatus" CASCADE;');
        await client.query('DROP TYPE IF EXISTS public."TxStatus" CASCADE;');
        await client.query('DROP TYPE IF EXISTS public."RampStatus" CASCADE;');
        await client.query('DROP TYPE IF EXISTS public."EscrowStatus" CASCADE;');
        await client.query('DROP TYPE IF EXISTS public."LedgerType" CASCADE;');
        await client.query('DROP TYPE IF EXISTS public."TxType" CASCADE;');
        
        console.log('Tables and Enums dropped.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

nuke();
