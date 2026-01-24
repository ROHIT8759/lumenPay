# 🔄 MIGRATION GUIDE: External Wallets → Custodial Only

## Quick Start

Run these commands to complete the migration:

```bash
# 1. Install dependencies (removes freighter-api, idb)
pnpm install

# 2. Set required environment variables
# Edit your .env file and ensure these are set:
# - WALLET_ENCRYPTION_KEY (64-char hex)
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY

# 3. Run the app
pnpm dev

# 4. Test login flow at http://localhost:3000
```

---

## Database Migration

### Create/Update `wallets` Table

```sql
-- Create wallets table if it doesn't exist
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL UNIQUE,
    encrypted_private_key TEXT NOT NULL,
    wallet_type TEXT DEFAULT 'custodial',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    balance_native DECIMAL(20,7) DEFAULT 0,
    balance_usdc DECIMAL(20,7) DEFAULT 0,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_wallet UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_public_key ON wallets(public_key);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(wallet_type);

-- Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own wallet"
    ON wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallets"
    ON wallets FOR INSERT
    WITH CHECK (true);

CREATE POLICY "System can update wallets"
    ON wallets FOR UPDATE
    USING (true);
```

---

## Migrating Existing Users

### Option 1: Create Custodial Wallets for All Users

```sql
-- For users without wallets, backend will auto-create on first login
-- No action needed - automatic on next login
```

### Option 2: Manual Migration Script

If you need to create wallets for all existing users NOW:

```typescript
// scripts/migrate-wallets.ts
import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@stellar/stellar-sdk";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY!;

function encryptPrivateKey(privateKey: string): string {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

async function migrateAllUsers() {
  // Get all users without wallets
  const { data: users } = await supabase.auth.admin.listUsers();

  for (const user of users.users) {
    // Check if wallet already exists
    const { data: existing } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      console.log(`✓ User ${user.email} already has wallet`);
      continue;
    }

    // Create new wallet
    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();
    const privateKey = keypair.secret();
    const encryptedKey = encryptPrivateKey(privateKey);

    const { error } = await supabase.from("wallets").insert({
      user_id: user.id,
      public_key: publicKey,
      encrypted_private_key: encryptedKey,
      wallet_type: "custodial",
    });

    if (error) {
      console.error(`✗ Failed for ${user.email}:`, error);
    } else {
      console.log(`✓ Created wallet for ${user.email}: ${publicKey}`);
    }
  }
}

migrateAllUsers().then(() => {
  console.log("Migration complete!");
  process.exit(0);
});
```

Run with:

```bash
npx tsx scripts/migrate-wallets.ts
```

---

## Code Cleanup (Optional)

### Delete Obsolete Files

```bash
# Remove LumenVault components
rm -rf components/lumenVault/ConnectWallet.tsx
rm -rf components/lumenVault/ImportWallet.tsx
rm -rf components/lumenVault/UnlockWallet.tsx
rm -rf components/lumenVault/WalletProvider.tsx

# Remove LumenVault lib files (keep only what's needed for custodial)
rm -rf lib/lumenVault/walletAuth.ts
rm -rf lib/lumenVault/qrSync.ts
rm -rf lib/lumenVault/mnemonicSupport.ts

# Remove any wallet connection utilities
rm -rf lib/walletConnection.ts  # if exists
```

---

## Environment Variables

### Required for Production

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Keep this SECRET!

# Wallet Encryption (REQUIRED - Generate with: openssl rand -hex 32)
WALLET_ENCRYPTION_KEY=<64-character-hex-string>

# Stellar Network
STELLAR_NETWORK=testnet  # or 'mainnet' for production
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Optional: Stellar USDC Issuer
STELLAR_USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

### Generate Encryption Key

```bash
# Generate a secure 32-byte encryption key
openssl rand -hex 32

# Example output:
# 86064d73488a40e133a88ab0bb93d02aee7d0d9f414769f6b547025a871198e5
```

⚠️ **IMPORTANT:** Never commit `WALLET_ENCRYPTION_KEY` to git!

---

## Testing Checklist

### Manual Testing

- [ ] **New User Flow**
  - [ ] Visit homepage
  - [ ] Click "Continue with Our Wallet"
  - [ ] Enter email
  - [ ] Receive magic link
  - [ ] Click link → redirected to dashboard
  - [ ] Verify wallet address displayed
  - [ ] Verify wallet balance shows

- [ ] **Returning User Flow**
  - [ ] Logout
  - [ ] Login again with same email
  - [ ] Verify same wallet address shown
  - [ ] Verify balance persisted

- [ ] **Multi-Device**
  - [ ] Login from desktop browser
  - [ ] Note wallet address
  - [ ] Login from mobile browser
  - [ ] Verify SAME wallet address

- [ ] **Security**
  - [ ] Open browser dev tools
  - [ ] Check Network tab for `/api/wallet` response
  - [ ] Verify private key NOT in response
  - [ ] Check localStorage/sessionStorage
  - [ ] Verify no private key stored locally

---

## Rollback Plan

If you need to rollback to external wallets:

```bash
# 1. Restore old files from git
git checkout HEAD~1 -- components/auth/LoginModal.tsx
git checkout HEAD~1 -- hooks/useWallet.ts
git checkout HEAD~1 -- app/api/wallet/route.ts

# 2. Restore dependencies
git checkout HEAD~1 -- package.json
pnpm install

# 3. Restart dev server
pnpm dev
```

---

## Support & Troubleshooting

### Issue: "Wallet creation failed"

**Solution:** Check that `WALLET_ENCRYPTION_KEY` is set correctly (64 hex chars)

### Issue: "supabaseUrl is required"

**Solution:** Verify `.env` file has `NEXT_PUBLIC_SUPABASE_URL` and restart server

### Issue: "User can't see wallet"

**Solution:** Check browser console for errors, verify user is authenticated

### Issue: "Different wallet on different devices"

**Solution:** Check database - should only be ONE wallet per user_id

---

## Production Deployment

### Before Deploying

1. ✅ Test thoroughly in development
2. ✅ Backup existing database
3. ✅ Set all environment variables
4. ✅ Test wallet creation with test user
5. ✅ Verify encryption key is secure
6. ✅ Set up monitoring/logging

### Deployment Steps

```bash
# 1. Build for production
pnpm build

# 2. Set environment variables in hosting platform
# (Vercel, Netlify, Railway, etc.)

# 3. Deploy
pnpm start  # or platform-specific command

# 4. Test production login flow
# 5. Monitor logs for any errors
```

---

## Monitoring

### Key Metrics to Track

- Wallet creation rate
- Login success rate
- Failed wallet creations
- API response times
- Error rates

### Suggested Logging

```typescript
// In wallet API route
console.log("[WALLET] Created for user:", userId, "at", new Date());
console.error("[WALLET] Creation failed:", error.message);
```

---

## FAQ

**Q: What happens to existing users with external wallets?**
A: They'll get new custodial wallets on next login. Consider a migration message.

**Q: Can users export their private keys?**
A: No - this is intentionally disabled for security (like UPI/Paytm).

**Q: What if encryption key is lost?**
A: All wallets become inaccessible. **BACKUP THE KEY SECURELY!**

**Q: Can I still support external wallets?**
A: Yes, but not recommended. This refactor is for custodial-only simplicity.

**Q: How do I decrypt a private key manually?**
A: See `lib/walletService.ts` - use same AES-256-CBC algorithm with IV.

---

## Need Help?

Check the documentation:

- `CUSTODIAL_WALLET_SYSTEM.md` - Full system docs
- `REFACTOR_SUMMARY.md` - What changed
- `MIGRATION_GUIDE.md` - This file

---

**Ready to launch! 🚀**
