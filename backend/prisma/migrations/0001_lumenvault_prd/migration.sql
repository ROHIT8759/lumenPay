DO $$
BEGIN
  CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LedgerType" AS ENUM ('ONCHAIN', 'OFFCHAIN', 'HYBRID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TxType" AS ENUM ('PAYMENT', 'ESCROW', 'ONRAMP', 'OFFRAMP', 'STOCK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "RampStatus" AS ENUM ('PENDING', 'INR_CONFIRMED', 'CRYPTO_LOCKED', 'CRYPTO_SENT', 'INR_SENT', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "EscrowStatus" AS ENUM ('PENDING', 'LOCKED', 'RELEASED', 'LIQUIDATED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "walletAddress" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS "auth_nonces" (
  "walletAddress" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("walletAddress", "nonce")
);

CREATE TABLE IF NOT EXISTS "offchain_balances" (
  "walletAddress" TEXT NOT NULL,
  "asset" TEXT NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "offchain_balances_pkey" PRIMARY KEY ("walletAddress", "asset")
);

CREATE TABLE IF NOT EXISTS "unified_transactions" (
  "id" TEXT PRIMARY KEY,
  "walletAddress" TEXT NOT NULL,
  "ledger" "LedgerType" NOT NULL,
  "type" "TxType" NOT NULL,
  "asset" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "txHash" TEXT,
  "status" "TxStatus" NOT NULL,
  "fromAddress" TEXT,
  "toAddress" TEXT,
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "kyc_records" (
  "walletAddress" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
  "providerRef" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "telegram_links" (
  "walletAddress" TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL,
  "telegramUserId" TEXT,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "onramp_intents" (
  "id" TEXT PRIMARY KEY,
  "walletAddress" TEXT NOT NULL,
  "inrAmount" DOUBLE PRECISION NOT NULL,
  "cryptoAmount" DOUBLE PRECISION,
  "asset" TEXT NOT NULL DEFAULT 'XLM',
  "exchangeRate" DOUBLE PRECISION,
  "status" "RampStatus" NOT NULL DEFAULT 'PENDING',
  "paymentRef" TEXT,
  "txHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "offramp_intents" (
  "id" TEXT PRIMARY KEY,
  "walletAddress" TEXT NOT NULL,
  "cryptoAmount" DOUBLE PRECISION NOT NULL,
  "inrAmount" DOUBLE PRECISION,
  "asset" TEXT NOT NULL DEFAULT 'XLM',
  "exchangeRate" DOUBLE PRECISION,
  "bankAccountNo" TEXT,
  "bankIfsc" TEXT,
  "upiId" TEXT,
  "status" "RampStatus" NOT NULL DEFAULT 'PENDING',
  "lockTxHash" TEXT,
  "payoutRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "stock_positions" (
  "id" TEXT PRIMARY KEY,
  "walletAddress" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "name" TEXT,
  "units" DOUBLE PRECISION NOT NULL,
  "entryPrice" DOUBLE PRECISION NOT NULL,
  "currentPrice" DOUBLE PRECISION,
  "txHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "escrow_positions" (
  "id" TEXT PRIMARY KEY,
  "loanId" INTEGER NOT NULL,
  "borrowerAddress" TEXT NOT NULL,
  "lenderAddress" TEXT NOT NULL,
  "collateralToken" TEXT NOT NULL,
  "collateralAmount" TEXT NOT NULL,
  "loanAmount" TEXT NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "status" "EscrowStatus" NOT NULL DEFAULT 'PENDING',
  "lockTxHash" TEXT,
  "releaseTxHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "escrow_positions_loanId_key" UNIQUE ("loanId")
);

CREATE TABLE IF NOT EXISTS "indexer_state" (
  "id" SERIAL PRIMARY KEY,
  "lastHorizonCursor" TEXT NOT NULL,
  "lastSorobanLedger" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "auth_nonces_expiresAt_idx" ON "auth_nonces"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "unified_transactions_txHash_key" ON "unified_transactions"("txHash");
CREATE INDEX IF NOT EXISTS "unified_transactions_walletAddress_idx" ON "unified_transactions"("walletAddress");
CREATE INDEX IF NOT EXISTS "unified_transactions_txHash_idx" ON "unified_transactions"("txHash");

CREATE INDEX IF NOT EXISTS "onramp_intents_walletAddress_idx" ON "onramp_intents"("walletAddress");
CREATE INDEX IF NOT EXISTS "onramp_intents_status_idx" ON "onramp_intents"("status");
CREATE INDEX IF NOT EXISTS "offramp_intents_walletAddress_idx" ON "offramp_intents"("walletAddress");
CREATE INDEX IF NOT EXISTS "offramp_intents_status_idx" ON "offramp_intents"("status");

CREATE INDEX IF NOT EXISTS "stock_positions_walletAddress_idx" ON "stock_positions"("walletAddress");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_positions_walletAddress_symbol_key" ON "stock_positions"("walletAddress", "symbol");

CREATE INDEX IF NOT EXISTS "escrow_positions_borrowerAddress_idx" ON "escrow_positions"("borrowerAddress");
CREATE INDEX IF NOT EXISTS "escrow_positions_lenderAddress_idx" ON "escrow_positions"("lenderAddress");

ALTER TABLE IF EXISTS public.wallets DROP COLUMN IF EXISTS secret_key_enc;
ALTER TABLE IF EXISTS public.wallets DROP COLUMN IF EXISTS encrypted_private_key;
ALTER TABLE IF EXISTS public.wallets DROP COLUMN IF EXISTS encrypted_secret_key;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS encrypted_secret_key;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS secret_key;
