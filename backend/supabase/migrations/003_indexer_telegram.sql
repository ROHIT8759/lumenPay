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

-- Telegram links table
CREATE TABLE IF NOT EXISTS public.telegram_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    telegram_user_id TEXT NOT NULL,
    telegram_username TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_wallet ON public.telegram_links(wallet_address);
CREATE INDEX IF NOT EXISTS idx_telegram_user ON public.telegram_links(telegram_user_id);

COMMENT ON TABLE public.indexer_state IS 'Stores last processed ledger for restart-safe event indexing';
COMMENT ON TABLE public.telegram_links IS 'Links Stellar wallets to Telegram accounts for notifications';
