import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function nuke() {
    // Use direct URL for DDL
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.error('DATABASE_URL not found');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        console.log('Connected to DB. Dropping profiles...');
        
        await client.query('DROP TABLE IF EXISTS public.profiles CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.transactions CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.wallets CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.contacts CASCADE;');
        await client.query('DROP TABLE IF EXISTS public.kyc_status CASCADE;');
        
        console.log('Tables dropped.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

nuke();
