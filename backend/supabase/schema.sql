-- ============================================================================
-- LUMENPAY - COMPLETE DATABASE SCHEMA
-- Version: 1.0.0
-- Last Updated: 2026-01-24
--
-- This is the ULTIMATE consolidated schema for LumenPay.
-- Run this ONCE on a fresh Supabase project to set up all tables.
--
-- Includes:
-- - Core tables (users, profiles, wallets, transactions)
-- - Contacts and display names
-- - Quick actions (crypto trading, bank payouts, QR scans)
-- - RWA (Real World Assets) and loans
-- - KYC with Didit biometric verification
-- - Non-custodial wallet support
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: CORE TABLES
-- ============================================================================

-- Users table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    display_name TEXT,
    pay_id TEXT UNIQUE,
    avatar_url TEXT,
    phone TEXT,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_review', 'verified', 'rejected')),
    kyc_verified_at TIMESTAMP WITH TIME ZONE,
    daily_limit_usd NUMERIC DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table (NON-CUSTODIAL - no secret keys stored!)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    public_key TEXT UNIQUE NOT NULL,
    wallet_type TEXT DEFAULT 'non-custodial' CHECK (wallet_type IN ('internal', 'external', 'custodial', 'non-custodial')),
    network TEXT DEFAULT 'testnet' CHECK (network IN ('testnet', 'public')),
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- DEPRECATED: Legacy column for old custodial wallets. New wallets do NOT use this.
    secret_key_enc TEXT,
    
    UNIQUE(user_id, is_primary)
);

CREATE INDEX IF NOT EXISTS idx_wallets_public_key ON public.wallets(public_key);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id),
    
    tx_type TEXT NOT NULL CHECK (tx_type IN ('payment_in', 'payment_out', 'swap', 'stake', 'yield')),
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    asset_code TEXT DEFAULT 'XLM',
    asset_issuer TEXT,
    
    memo TEXT,
    tx_hash TEXT UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
    
    fee_stroops BIGINT,
    exchange_rate NUMERIC,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON public.transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);

-- Contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_address TEXT NOT NULL,
    contact_name TEXT,
    contact_type TEXT DEFAULT 'person' CHECK (contact_type IN ('person', 'merchant', 'contract')),
    custom_name TEXT,
    is_favorite BOOLEAN DEFAULT false,
    notes TEXT,
    last_transacted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, contact_address)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_address ON public.contacts(contact_address);

-- ============================================================================
-- SECTION 2: KYC TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kyc_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Verification info
    verification_level INT DEFAULT 0 CHECK (verification_level BETWEEN 0 AND 3),
    is_verified BOOLEAN DEFAULT false,
    
    -- Didit biometric verification
    kyc_provider TEXT DEFAULT 'didit',
    kyc_reference_id TEXT,
    didit_session_id TEXT,
    confidence_score NUMERIC,
    status TEXT DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    
    -- On-chain verification (optional)
    on_chain_verified BOOLEAN DEFAULT false,
    on_chain_tx_hash TEXT,
    verification_hash TEXT,
    
    -- Document verification
    document_verified BOOLEAN DEFAULT false,
    address_verified BOOLEAN DEFAULT false,
    
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON public.kyc_status(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_didit_session ON public.kyc_status(didit_session_id);
CREATE TABLE IF NOT EXISTS public.crypto_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price_usd NUMERIC(20, 8) DEFAULT 0,
    percent_change_24h NUMERIC(10, 4) DEFAULT 0,
    market_cap_rank INT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    price_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.asset_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.crypto_assets(id) ON DELETE CASCADE,
    balance NUMERIC(30, 8) DEFAULT 0,
    locked_balance NUMERIC(30, 8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, asset_id)
);

CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.crypto_assets(id),
    
    trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    quantity NUMERIC(30, 8) NOT NULL,
    price_usd NUMERIC(20, 8) NOT NULL,
    total_usd NUMERIC(30, 8) NOT NULL,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    tx_hash TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE IF NOT EXISTS public.rwa_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code VARCHAR(12) NOT NULL,
    issuer_address TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('real_estate', 'bond', 'commodity', 'invoice', 'stable_yield', 'equity_token')),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    detailed_info JSONB DEFAULT '{}',
    unit_price NUMERIC NOT NULL CHECK (unit_price > 0),
    total_supply NUMERIC NOT NULL,
    available_supply NUMERIC NOT NULL,
    min_investment NUMERIC DEFAULT 10,
    yield_type TEXT CHECK (yield_type IN ('fixed', 'variable', 'none')),
    annual_yield_percent NUMERIC DEFAULT 0,
    yield_frequency TEXT CHECK (yield_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'none')),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
    requires_kyc BOOLEAN DEFAULT true,
    min_kyc_level INT DEFAULT 1,
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired')),
    is_featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(asset_code, issuer_address)
);

CREATE TABLE IF NOT EXISTS public.rwa_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.rwa_assets(id) ON DELETE CASCADE,
    
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    average_buy_price NUMERIC NOT NULL,
    total_invested NUMERIC NOT NULL,
    total_yield_earned NUMERIC DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, asset_id)
);

-- ============================================================================
-- SECTION 5: LOANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    loan_type TEXT NOT NULL CHECK (loan_type IN ('collateral', 'flash')),
    principal_amount NUMERIC NOT NULL CHECK (principal_amount > 0),
    loan_amount NUMERIC NOT NULL,
    interest_rate_bps INT NOT NULL, -- basis points (100 = 1%)
    tenure_days INT NOT NULL,
    
    amount_repaid NUMERIC DEFAULT 0,
    amount_outstanding NUMERIC NOT NULL,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'repaid', 'defaulted', 'liquidated')),
    
    -- Soroban contract
    contract_address TEXT,
    contract_loan_id TEXT,
    
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disbursed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    repaid_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.loan_collateral (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    collateral_type TEXT NOT NULL CHECK (collateral_type IN ('usdc', 'xlm', 'rwa')),
    asset_code TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    value_at_deposit NUMERIC NOT NULL,
    
    is_locked BOOLEAN DEFAULT true,
    deposit_tx_hash TEXT,
    release_tx_hash TEXT,
    
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    released_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- SECTION 6: BANK PAYOUTS & QR SCANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bank_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    recipient_name TEXT NOT NULL,
    bank_identifier TEXT NOT NULL, -- UPI ID, account number, etc.
    bank_identifier_type TEXT DEFAULT 'upi',
    amount_usd NUMERIC NOT NULL,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    reference_id TEXT UNIQUE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.qr_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    scanned_data TEXT NOT NULL,
    scanned_type TEXT,
    recipient_address TEXT,
    amount NUMERIC,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    tx_hash TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expired_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- SECTION 7: AUTH NONCES (for wallet-based auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.auth_nonces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_key TEXT NOT NULL,
    nonce TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(public_key)
);

CREATE INDEX IF NOT EXISTS idx_auth_nonces_key ON public.auth_nonces(public_key);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_expires ON public.auth_nonces(expires_at);

-- ============================================================================
-- SECTION 8: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rwa_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_collateral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Wallets
CREATE POLICY "Users can view own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallets" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- Contacts
CREATE POLICY "Users can manage own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);

-- KYC
CREATE POLICY "Users can view own KYC" ON public.kyc_status FOR SELECT USING (auth.uid() = user_id);

-- Assets & trades
CREATE POLICY "Users can view own balances" ON public.asset_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);

-- RWA
CREATE POLICY "Anyone can view active RWA assets" ON public.rwa_assets FOR SELECT USING (status = 'active');
CREATE POLICY "Users can view own holdings" ON public.rwa_holdings FOR SELECT USING (auth.uid() = user_id);

-- Loans
CREATE POLICY "Users can view own loans" ON public.loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own collateral" ON public.loan_collateral FOR SELECT USING (auth.uid() = user_id);

-- Bank & QR
CREATE POLICY "Users can view own payouts" ON public.bank_payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own scans" ON public.qr_scans FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 9: FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER kyc_updated_at BEFORE UPDATE ON public.kyc_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Get contact display name
CREATE OR REPLACE FUNCTION get_contact_display_name(
    p_owner_user_id UUID,
    p_contact_address TEXT
) RETURNS TEXT AS $$
DECLARE
    v_custom_name TEXT;
    v_profile_name TEXT;
BEGIN
    -- Check for custom name
    SELECT custom_name INTO v_custom_name
    FROM public.contacts
    WHERE user_id = p_owner_user_id 
    AND contact_address = p_contact_address
    AND custom_name IS NOT NULL
    LIMIT 1;
    
    IF v_custom_name IS NOT NULL THEN
        RETURN v_custom_name;
    END IF;
    
    -- Check for profile name
    SELECT COALESCE(p.display_name, p.full_name) INTO v_profile_name
    FROM public.wallets w
    JOIN public.profiles p ON w.user_id = p.id
    WHERE w.public_key = p_contact_address
    LIMIT 1;
    
    IF v_profile_name IS NOT NULL THEN
        RETURN v_profile_name;
    END IF;
    
    -- Return shortened address
    RETURN CONCAT(LEFT(p_contact_address, 4), '...', RIGHT(p_contact_address, 4));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 10: SEED DATA
-- ============================================================================

-- Seed crypto assets
INSERT INTO public.crypto_assets (symbol, name, market_cap_rank, price_usd, is_active) VALUES
('BTC', 'Bitcoin', 1, 97500.00, true),
('ETH', 'Ethereum', 2, 3650.50, true),
('XLM', 'Stellar', 12, 0.425, true),
('USDC', 'USD Coin', 6, 1.00, true),
('SOL', 'Solana', 5, 210.45, true)
ON CONFLICT (symbol) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.wallets IS 'User wallets. NON-CUSTODIAL: Private keys stored on client devices only.';
COMMENT ON COLUMN public.wallets.secret_key_enc IS 'DEPRECATED: Legacy encrypted secret keys. New wallets do NOT use this.';
COMMENT ON TABLE public.kyc_status IS 'KYC verification status using Didit biometric verification.';
COMMENT ON TABLE public.auth_nonces IS 'Nonces for wallet-based authentication (sign-in with Stellar).';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
