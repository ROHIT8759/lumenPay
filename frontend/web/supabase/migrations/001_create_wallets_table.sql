-- Create wallets table for custodial wallet storage
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL UNIQUE,
    encrypted_private_key TEXT NOT NULL,
    wallet_type TEXT NOT NULL DEFAULT 'custodial',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for faster lookups
    CONSTRAINT wallets_user_id_unique UNIQUE (user_id)
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- Create index for public_key lookups
CREATE INDEX IF NOT EXISTS idx_wallets_public_key ON public.wallets(public_key);

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own wallet
CREATE POLICY "Users can view own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert/update/delete (for API operations)
CREATE POLICY "Service role full access" ON public.wallets
    FOR ALL USING (auth.role() = 'service_role');

-- Create rwa_assets table (also missing based on errors)
CREATE TABLE IF NOT EXISTS public.rwa_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    description TEXT,
    total_supply DECIMAL(20, 7),
    price_usd DECIMAL(20, 2),
    issuer_address TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for rwa_assets
ALTER TABLE public.rwa_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view rwa_assets
CREATE POLICY "Public read access" ON public.rwa_assets
    FOR SELECT USING (true);

-- Policy: Service role can manage rwa_assets
CREATE POLICY "Service role manage assets" ON public.rwa_assets
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
GRANT SELECT ON public.rwa_assets TO anon, authenticated;
GRANT ALL ON public.rwa_assets TO service_role;
