DROP INDEX IF EXISTS "unified_transactions_txHash_key";

CREATE UNIQUE INDEX IF NOT EXISTS "unified_transactions_walletAddress_txHash_key" ON "unified_transactions"("walletAddress", "txHash");
