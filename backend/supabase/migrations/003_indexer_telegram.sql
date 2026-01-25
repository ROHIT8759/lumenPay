-- Indexer state table for restart-safe cursor management

CREATE TABLE IF NOT EXISTS public.indexer_state (
    id INT PRIMARY KEY DEFAULT 1,
    last_horizon_ledger BIGINT DEFAULT 0,
    last_soroban_ledger BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one row
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial state
INSERT INTO public.indexer_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Telegram links table (aligns with existing camelCase columns used by Prisma)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'telegram_links'
    ) THEN
        CREATE TABLE "telegram_links" (
            "walletAddress" TEXT PRIMARY KEY,
            "chatId" TEXT NOT NULL,
            "telegramUserId" TEXT,
            "linkedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Backfill missing columns if the table already existed with a reduced shape
ALTER TABLE "telegram_links"
    ADD COLUMN IF NOT EXISTS "telegramUserId" TEXT,
    ADD COLUMN IF NOT EXISTS "chatId" TEXT;

CREATE INDEX IF NOT EXISTS idx_telegram_wallet ON "telegram_links"("walletAddress");
CREATE INDEX IF NOT EXISTS idx_telegram_user ON "telegram_links"("telegramUserId");

COMMENT ON TABLE public.indexer_state IS 'Stores last processed ledger for restart-safe event indexing';
COMMENT ON TABLE "telegram_links" IS 'Links Stellar wallets to Telegram accounts for notifications';
