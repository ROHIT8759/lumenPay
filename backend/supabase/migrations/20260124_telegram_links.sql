CREATE TABLE IF NOT EXISTS public.telegram_links (
  wallet_address TEXT PRIMARY KEY,
  telegram_chat_id TEXT NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_links_chat ON public.telegram_links(telegram_chat_id);

CREATE TABLE IF NOT EXISTS public.blockchain_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  network TEXT DEFAULT 'testnet',
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_events_type ON public.blockchain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_tx ON public.blockchain_events(tx_hash);
