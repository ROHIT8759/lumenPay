-- LumenPay Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/jsismwafswmoqwfbfswv/sql

-- =====================
-- WALLETS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL UNIQUE,
  encrypted_private_key TEXT NOT NULL,
  wallet_type TEXT DEFAULT 'custodial' CHECK (wallet_type IN ('custodial', 'imported', 'hardware')),
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallets_public_key ON public.wallets(public_key);

-- =====================
-- KYC STATUS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.kyc_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  verification_level INTEGER DEFAULT 0 CHECK (verification_level >= 0 AND verification_level <= 3),
  is_verified BOOLEAN DEFAULT false,
  document_verified BOOLEAN DEFAULT false,
  address_verified BOOLEAN DEFAULT false,
  on_chain_verified BOOLEAN DEFAULT false,
  on_chain_tx_hash TEXT,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kyc_user_id ON public.kyc_status(user_id);

-- =====================
-- RWA ASSETS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.rwa_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL UNIQUE,
  issuer_address TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('real_estate', 'bond', 'commodity', 'invoice', 'stable_yield', 'equity_token')),
  name TEXT NOT NULL,
  description TEXT,
  detailed_info JSONB DEFAULT '{}',
  image_url TEXT,
  document_urls TEXT[] DEFAULT '{}',
  unit_price DECIMAL(18,6) DEFAULT 0,
  total_supply DECIMAL(18,6) DEFAULT 0,
  available_supply DECIMAL(18,6) DEFAULT 0,
  min_investment DECIMAL(18,6) DEFAULT 0,
  max_investment DECIMAL(18,6),
  yield_type TEXT DEFAULT 'none' CHECK (yield_type IN ('fixed', 'variable', 'none')),
  annual_yield_percent DECIMAL(5,2) DEFAULT 0,
  yield_frequency TEXT DEFAULT 'none' CHECK (yield_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'none')),
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
  requires_kyc BOOLEAN DEFAULT true,
  min_kyc_level INTEGER DEFAULT 1,
  accredited_only BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired', 'pending')),
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rwa_assets_type ON public.rwa_assets(asset_type);
CREATE INDEX idx_rwa_assets_status ON public.rwa_assets(status);

-- =====================
-- RWA HOLDINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.rwa_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.rwa_assets(id) ON DELETE CASCADE,
  quantity DECIMAL(18,6) DEFAULT 0,
  average_buy_price DECIMAL(18,6) DEFAULT 0,
  total_invested DECIMAL(18,6) DEFAULT 0,
  total_yield_earned DECIMAL(18,6) DEFAULT 0,
  pending_yield DECIMAL(18,6) DEFAULT 0,
  trustline_established BOOLEAN DEFAULT false,
  first_purchase_at TIMESTAMPTZ,
  last_transaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, asset_id)
);

CREATE INDEX idx_rwa_holdings_user ON public.rwa_holdings(user_id);

-- =====================
-- LOANS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL CHECK (loan_type IN ('collateral', 'flash')),
  principal_amount DECIMAL(18,6) NOT NULL,
  loan_amount DECIMAL(18,6) NOT NULL,
  interest_rate_bps INTEGER DEFAULT 500, -- basis points (500 = 5%)
  tenure_days INTEGER DEFAULT 30,
  amount_repaid DECIMAL(18,6) DEFAULT 0,
  amount_outstanding DECIMAL(18,6) DEFAULT 0,
  interest_accrued DECIMAL(18,6) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'repaid', 'defaulted', 'liquidated', 'cancelled')),
  ltv_ratio DECIMAL(5,2),
  liquidation_threshold DECIMAL(5,2) DEFAULT 80.00,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  disbursed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  repaid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loans_user ON public.loans(user_id);
CREATE INDEX idx_loans_status ON public.loans(status);

-- =====================
-- LOAN COLLATERAL TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.loan_collateral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  collateral_type TEXT NOT NULL CHECK (collateral_type IN ('usdc', 'xlm', 'rwa')),
  asset_code TEXT NOT NULL,
  amount DECIMAL(18,6) NOT NULL,
  value_at_deposit DECIMAL(18,6) NOT NULL,
  current_value DECIMAL(18,6),
  is_locked BOOLEAN DEFAULT true,
  deposited_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loan_collateral_loan ON public.loan_collateral(loan_id);

-- =====================
-- TRANSACTIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wallet_address TEXT,
  tx_hash TEXT UNIQUE,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('payment', 'deposit', 'withdrawal', 'swap', 'stake', 'loan', 'yield')),
  amount DECIMAL(18,6) NOT NULL,
  asset_code TEXT DEFAULT 'XLM',
  recipient_address TEXT,
  sender_address TEXT,
  memo TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  fee DECIMAL(18,6) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_wallet ON public.transactions(wallet_address);
CREATE INDEX idx_transactions_hash ON public.transactions(tx_hash);

-- =====================
-- CONTACTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)
);

CREATE INDEX idx_contacts_user ON public.contacts(user_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rwa_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_collateral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallets" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own kyc" ON public.kyc_status FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own holdings" ON public.rwa_holdings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own loans" ON public.loans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own collateral" ON public.loan_collateral FOR SELECT 
  USING (loan_id IN (SELECT id FROM public.loans WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);

-- RWA Assets are public read
CREATE POLICY "RWA assets are public" ON public.rwa_assets FOR SELECT USING (true);

-- Service role bypass for API routes
CREATE POLICY "Service role full access wallets" ON public.wallets FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access kyc" ON public.kyc_status FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access holdings" ON public.rwa_holdings FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access loans" ON public.loans FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access collateral" ON public.loan_collateral FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role full access transactions" ON public.transactions FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_updated_at BEFORE UPDATE ON public.kyc_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rwa_assets_updated_at BEFORE UPDATE ON public.rwa_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'LumenPay database schema created successfully!' as message;
