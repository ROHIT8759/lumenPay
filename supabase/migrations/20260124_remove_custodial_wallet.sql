-- Remove legacy custodial key columns from wallets table
-- Safe to run multiple times due to IF EXISTS
ALTER TABLE public.wallets
  DROP COLUMN IF EXISTS secret_key_enc;

ALTER TABLE public.wallets
  DROP COLUMN IF EXISTS encryption_iv;

-- Clean up any residual encrypted keys if present in other tables (defensive)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'encrypted_secret_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.users DROP COLUMN encrypted_secret_key';
  END IF;
END $$;
