
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import prisma from '../lib/prisma';

async function validate() {
    console.log("🔍 Validating Indexer Setup...");

    if (!process.env.DATABASE_URL) {
        console.error("\n⚠️  WARNING: DATABASE_URL is missing from .env!");
        console.error("   Prisma cannot connect to the database.");
        console.error("   Please add DATABASE_URL=postgres://... to your root .env file.");
        console.error("   Skipping DB connection checks.\n");
        return;
    }

    try {
        // 1. Check DB Connection & Schema
        console.log("1. Checking DB Connection...");
        // Attempts to query user table
        try {
            const userCount = await prisma.user.count();
            console.log(`   ✅ Connected! Found ${userCount} users.`);
        } catch (e) {
            console.error("   ❌ Failed to query 'User' table. Did you run 'npx prisma db push'?");
            // Don't throw, just log
        }

        // 2. Check IndexerState
        console.log("2. Checking Indexer State...");
        try {
            const state = await prisma.indexerState.findUnique({ where: { id: 1 } });
            if (state) {
                console.log(`   ✅ Indexer State found: Last Horizon Cursor: ${state.lastHorizonCursor}`);
            } else {
                console.log("   ⚠️ No Indexer State found (will be initialized on first run).");
            }
        } catch (e) {
            console.error("   ❌ Failed to query 'IndexerState' table. Schema migration might be missing.");
        }

        // 3. Check Telegram Links
        console.log("3. Checking Notification Channels...");
        try {
            const linkCount = await prisma.telegramLink.count();
            console.log(`   ✅ Found ${linkCount} linked Telegram accounts.`);
        } catch (e) {
            console.log("   ❌ Failed to query telegram links.");
        }

        console.log("\n✅ Validation Logic Complete.");

    } catch (error) {
        console.error("\n❌ Unexpected Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

validate();
