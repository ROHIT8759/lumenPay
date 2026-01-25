-- LumenPay Transactions Table Update
-- This migration updates the transactions table to support all transaction types
-- Run this in your Supabase SQL Editor after 001_create_tables.sql

-- =====================
-- DROP OLD TRANSACTIONS TABLE AND RECREATE WITH FULL SCHEMA
-- =====================

-- First, drop the existing table if it exists
DROP TABLE IF EXISTS public.transactions CASCADE;

-- =====================
-- NEW TRANSACTIONS TABLE
-- =====================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Transaction identifiers
  tx_hash TEXT,
  reference TEXT,
  
  -- Transaction type and direction
  tx_type TEXT NOT NULL CHECK (tx_type IN (
    'payment_out',
    'payment_in',
    'loan_disbursement',
    'loan_repayment',
    'flash_loan_borrow',
    'flash_loan_repay',
    'rwa_purchase',
    'rwa_sale',
    'bank_payout',
    'upi_payout',
    'emi_payment',
    'reward_claim',
    'topup',
    'swap',
    'deposit',
    'withdrawal'
  )),
  tx_direction TEXT CHECK (tx_direction IN ('sent', 'received', 'internal')),
  
  -- Amount and asset
  amount DECIMAL(18,7) NOT NULL,
  asset_code TEXT DEFAULT 'XLM',
  fee DECIMAL(18,7) DEFAULT 0,
  
  -- Sender details
  sender_wallet TEXT,
  sender_display_name TEXT,
  
  -- Receiver details
  receiver_wallet TEXT,
  receiver_display_name TEXT,
  recipient_name TEXT,
  recipient_address TEXT,
  
  -- Payment method specific fields
  pay_id_used TEXT,
  upi_id TEXT,
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  bank_name TEXT,
  
  -- Fiat conversion details (for off-ramp)
  fiat_amount DECIMAL(18,2),
  fiat_currency TEXT DEFAULT 'INR',
  exchange_rate DECIMAL(18,6),
  
  -- Additional info
  memo TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'success',
    'failed',
    'cancelled',
    'expired'
  )),
  error_message TEXT,
  
  -- Feature categorization
  related_feature TEXT CHECK (related_feature IN (
    'payment',
    'loan',
    'flash_loan',
    'rwa',
    'bank_payout',
    'upi_payout',
    'reward',
    'topup',
    'offramp'
  )),
  
  -- Flexible metadata storage
  meta_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- =====================
-- INDEXES FOR PERFORMANCE
-- =====================
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_hash ON public.transactions(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_transactions_type ON public.transactions(tx_type);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_sender ON public.transactions(sender_wallet);
CREATE INDEX idx_transactions_receiver ON public.transactions(receiver_wallet);
CREATE INDEX idx_transactions_feature ON public.transactions(related_feature);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions (as sender or receiver)
CREATE POLICY "Users can view own transactions" ON public.transactions 
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR sender_wallet IN (SELECT public_key FROM public.wallets WHERE user_id = auth.uid())
    OR receiver_wallet IN (SELECT public_key FROM public.wallets WHERE user_id = auth.uid())
  );

-- Users can insert transactions where they are the sender
CREATE POLICY "Users can create transactions" ON public.transactions 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    OR sender_wallet IN (SELECT public_key FROM public.wallets WHERE user_id = auth.uid())
  );

-- Service role has full access (for API routes)
CREATE POLICY "Service role full access transactions" ON public.transactions 
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON public.transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- OFF-RAMP REQUESTS TABLE
-- Stores pending UPI and Bank transfer requests
-- =====================
CREATE TABLE IF NOT EXISTS public.offramp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and transaction reference
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  
  -- Request type
  offramp_type TEXT NOT NULL CHECK (offramp_type IN ('upi', 'bank')),
  
  -- Amount details
  amount_xlm DECIMAL(18,7) NOT NULL,
  fee_xlm DECIMAL(18,7) DEFAULT 0,
  net_amount_xlm DECIMAL(18,7) NOT NULL,
  fiat_amount DECIMAL(18,2) NOT NULL,
  fiat_currency TEXT DEFAULT 'INR',
  exchange_rate DECIMAL(18,6) NOT NULL,
  
  -- UPI specific
  upi_id TEXT,
  
  -- Bank specific
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  bank_name TEXT,
  
  -- Recipient
  recipient_name TEXT NOT NULL,
  
  -- Processing details
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'expired'
  )),
  
  -- External references
  provider_reference TEXT,
  stellar_tx_hash TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Error handling
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Indexes for offramp_requests
CREATE INDEX idx_offramp_user ON public.offramp_requests(user_id);
CREATE INDEX idx_offramp_status ON public.offramp_requests(status);
CREATE INDEX idx_offramp_type ON public.offramp_requests(offramp_type);
CREATE INDEX idx_offramp_created ON public.offramp_requests(created_at DESC);

-- RLS for offramp_requests
ALTER TABLE public.offramp_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own offramp requests" ON public.offramp_requests 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access offramp" ON public.offramp_requests 
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- Updated_at trigger for offramp_requests
CREATE TRIGGER update_offramp_requests_updated_at 
  BEFORE UPDATE ON public.offramp_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Transactions table updated successfully!' as message;
