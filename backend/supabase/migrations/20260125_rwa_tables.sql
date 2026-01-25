-- Real World Asset (RWA) Tables Migration
-- This migration creates tables for managing tokenized real-world assets

-- ============== RWA Assets Table ==============
CREATE TABLE IF NOT EXISTS rwa_assets (
    id SERIAL PRIMARY KEY,
    asset_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN (
        'RealEstate', 'Commodity', 'Security', 'Bond', 'Art',
        'Collectible', 'Invoice', 'Equipment', 'IntellectualProperty', 'Other'
    )),
    total_supply VARCHAR(78) NOT NULL, -- i128 max as string
    circulating_supply VARCHAR(78) NOT NULL DEFAULT '0',
    issuer VARCHAR(56) NOT NULL, -- Stellar public key
    custodian VARCHAR(56) NOT NULL, -- Stellar public key
    asset_value_usd VARCHAR(78) NOT NULL, -- USD cents
    token_address VARCHAR(56), -- Stellar asset contract address
    min_investment VARCHAR(78) NOT NULL DEFAULT '0',
    accredited_only BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_transferable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_valuation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Metadata
    description TEXT,
    image_url TEXT,
    documents JSONB DEFAULT '[]', -- Array of document URLs
    metadata JSONB DEFAULT '{}'
);

-- ============== RWA Investors Table ==============
CREATE TABLE IF NOT EXISTS rwa_investors (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(56) UNIQUE NOT NULL, -- Stellar public key
    is_accredited BOOLEAN NOT NULL DEFAULT FALSE,
    is_kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,
    kyc_expiry TIMESTAMP WITH TIME ZONE,
    country_code VARCHAR(3), -- ISO 3166-1 alpha-2/alpha-3
    total_invested VARCHAR(78) NOT NULL DEFAULT '0',
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Additional investor info
    investor_type VARCHAR(20) CHECK (investor_type IN ('individual', 'institution', 'fund')),
    risk_profile VARCHAR(20) CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
    metadata JSONB DEFAULT '{}'
);

-- ============== RWA Holdings Table ==============
CREATE TABLE IF NOT EXISTS rwa_holdings (
    id SERIAL PRIMARY KEY,
    asset_id VARCHAR(64) NOT NULL REFERENCES rwa_assets(asset_id),
    investor_address VARCHAR(56) NOT NULL,
    amount VARCHAR(78) NOT NULL DEFAULT '0',
    purchase_price VARCHAR(78), -- Average purchase price per token
    acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(asset_id, investor_address)
);

-- ============== RWA Distributions Table ==============
CREATE TABLE IF NOT EXISTS rwa_distributions (
    id SERIAL PRIMARY KEY,
    distribution_id VARCHAR(64) UNIQUE NOT NULL,
    asset_id VARCHAR(64) NOT NULL REFERENCES rwa_assets(asset_id),
    total_amount VARCHAR(78) NOT NULL,
    per_token_amount VARCHAR(78) NOT NULL,
    distribution_token VARCHAR(56) NOT NULL, -- Token used for distribution
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Distribution type
    distribution_type VARCHAR(20) CHECK (distribution_type IN ('dividend', 'yield', 'interest', 'bonus')),
    description TEXT
);

-- ============== RWA Distribution Claims Table ==============
CREATE TABLE IF NOT EXISTS rwa_distribution_claims (
    id SERIAL PRIMARY KEY,
    distribution_id VARCHAR(64) NOT NULL REFERENCES rwa_distributions(distribution_id),
    investor_address VARCHAR(56) NOT NULL,
    amount VARCHAR(78) NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tx_hash VARCHAR(64),
    
    UNIQUE(distribution_id, investor_address)
);

-- ============== RWA Transactions Table ==============
CREATE TABLE IF NOT EXISTS rwa_transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(64) UNIQUE NOT NULL,
    asset_id VARCHAR(64) NOT NULL REFERENCES rwa_assets(asset_id),
    from_address VARCHAR(56),
    to_address VARCHAR(56),
    amount VARCHAR(78) NOT NULL,
    tx_type VARCHAR(20) NOT NULL CHECK (tx_type IN (
        'mint', 'burn', 'transfer', 'invest', 'redeem', 'distribution_claim'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'failed'
    )),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Transaction metadata
    payment_amount VARCHAR(78),
    payment_token VARCHAR(56),
    metadata JSONB DEFAULT '{}'
);

-- ============== RWA Whitelisted Countries Table ==============
CREATE TABLE IF NOT EXISTS rwa_whitelisted_countries (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) UNIQUE NOT NULL,
    country_name VARCHAR(100),
    is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    restrictions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============== RWA Blacklisted Addresses Table ==============
CREATE TABLE IF NOT EXISTS rwa_blacklisted_addresses (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(56) UNIQUE NOT NULL,
    reason TEXT,
    blacklisted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    blacklisted_by VARCHAR(56) -- Admin who blacklisted
);

-- ============== Indexes ==============

-- Assets indexes
CREATE INDEX IF NOT EXISTS idx_rwa_assets_type ON rwa_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_rwa_assets_active ON rwa_assets(is_active);
CREATE INDEX IF NOT EXISTS idx_rwa_assets_issuer ON rwa_assets(issuer);
CREATE INDEX IF NOT EXISTS idx_rwa_assets_created ON rwa_assets(created_at DESC);

-- Investors indexes
CREATE INDEX IF NOT EXISTS idx_rwa_investors_kyc ON rwa_investors(is_kyc_verified);
CREATE INDEX IF NOT EXISTS idx_rwa_investors_accredited ON rwa_investors(is_accredited);
CREATE INDEX IF NOT EXISTS idx_rwa_investors_country ON rwa_investors(country_code);

-- Holdings indexes
CREATE INDEX IF NOT EXISTS idx_rwa_holdings_investor ON rwa_holdings(investor_address);
CREATE INDEX IF NOT EXISTS idx_rwa_holdings_asset ON rwa_holdings(asset_id);

-- Distributions indexes
CREATE INDEX IF NOT EXISTS idx_rwa_distributions_asset ON rwa_distributions(asset_id);
CREATE INDEX IF NOT EXISTS idx_rwa_distributions_created ON rwa_distributions(created_at DESC);

-- Claims indexes
CREATE INDEX IF NOT EXISTS idx_rwa_claims_investor ON rwa_distribution_claims(investor_address);
CREATE INDEX IF NOT EXISTS idx_rwa_claims_distribution ON rwa_distribution_claims(distribution_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_rwa_transactions_asset ON rwa_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_rwa_transactions_from ON rwa_transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_rwa_transactions_to ON rwa_transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_rwa_transactions_type ON rwa_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_rwa_transactions_created ON rwa_transactions(created_at DESC);

-- ============== Triggers ==============

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_rwa_assets_updated_at ON rwa_assets;
CREATE TRIGGER update_rwa_assets_updated_at
    BEFORE UPDATE ON rwa_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rwa_investors_updated_at ON rwa_investors;
CREATE TRIGGER update_rwa_investors_updated_at
    BEFORE UPDATE ON rwa_investors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rwa_holdings_updated_at ON rwa_holdings;
CREATE TRIGGER update_rwa_holdings_updated_at
    BEFORE UPDATE ON rwa_holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============== Row Level Security ==============

-- Enable RLS on sensitive tables
ALTER TABLE rwa_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwa_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwa_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwa_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwa_distribution_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwa_transactions ENABLE ROW LEVEL SECURITY;

-- Public read access for assets
CREATE POLICY "Public can view active assets" ON rwa_assets
    FOR SELECT
    USING (is_active = true);

-- Investors can view their own data
CREATE POLICY "Investors can view own data" ON rwa_investors
    FOR SELECT
    USING (true); -- Adjust based on auth

-- Holdings are viewable by owner
CREATE POLICY "Holdings viewable by owner" ON rwa_holdings
    FOR SELECT
    USING (true); -- Adjust based on auth

-- Distributions are publicly viewable
CREATE POLICY "Distributions are public" ON rwa_distributions
    FOR SELECT
    USING (true);

-- Claims viewable by owner
CREATE POLICY "Claims viewable by owner" ON rwa_distribution_claims
    FOR SELECT
    USING (true); -- Adjust based on auth

-- Transactions publicly viewable
CREATE POLICY "Transactions are public" ON rwa_transactions
    FOR SELECT
    USING (true);

-- ============== Initial Data ==============

-- Insert common whitelisted countries
INSERT INTO rwa_whitelisted_countries (country_code, country_name, is_allowed) VALUES
    ('US', 'United States', true),
    ('GB', 'United Kingdom', true),
    ('DE', 'Germany', true),
    ('FR', 'France', true),
    ('JP', 'Japan', true),
    ('SG', 'Singapore', true),
    ('CH', 'Switzerland', true),
    ('AU', 'Australia', true),
    ('CA', 'Canada', true),
    ('NZ', 'New Zealand', true)
ON CONFLICT (country_code) DO NOTHING;

-- ============== Comments ==============

COMMENT ON TABLE rwa_assets IS 'Tokenized real-world assets';
COMMENT ON TABLE rwa_investors IS 'Registered investors with KYC status';
COMMENT ON TABLE rwa_holdings IS 'Investor holdings of RWA tokens';
COMMENT ON TABLE rwa_distributions IS 'Dividend/yield distributions for assets';
COMMENT ON TABLE rwa_distribution_claims IS 'Claims of distributions by investors';
COMMENT ON TABLE rwa_transactions IS 'All RWA-related transactions';
COMMENT ON TABLE rwa_whitelisted_countries IS 'Countries allowed for investment';
COMMENT ON TABLE rwa_blacklisted_addresses IS 'Blocked wallet addresses';
