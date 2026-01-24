# 🚀 Steller - Setup Guide

## Quick Start (Demo Mode)

Your app is currently running in **Demo Mode** with mock data. All features are functional for testing, but data is not persisted.

### Current Status: ✅ Demo Mode Active

The billing module will work with 5 pre-seeded RWA assets and mock data for loans and KYC.

---

## 🗄️ Full Setup (Supabase Integration)

To enable full functionality with persistent data:

### Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - Project name: `steller-app` (or your choice)
   - Database password: Generate a strong password
   - Region: Choose closest to you
4. Wait 2-3 minutes for project creation

### Step 2: Get Your Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJ...`)
   - **service_role** key (also starts with `eyJhbGciOiJ...`)

### Step 3: Update .env.local

Open `.env.local` and replace the placeholders:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-KEY-HERE...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-SERVICE-ROLE-KEY...
```

### Step 4: Run Database Migrations

In your Supabase dashboard:

1. Go to **SQL Editor**
2. Click **"New Query"**
3. Copy the content from `supabase/migrations/001_initial_schema.sql`
4. Click **Run**
5. Repeat for `supabase/migrations/002_rwa_loans_billing.sql`

**OR** use the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref YOUR-PROJECT-REF

# Run migrations
supabase db push
```

### Step 5: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

The demo banner will disappear, and your app will now use the real database! 🎉

---

## 🔐 Security Setup

### Generate Encryption Key

For wallet encryption, generate a secure key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to `.env.local`:

```env
WALLET_ENCRYPTION_KEY=your-64-character-hex-string-here
```

---

## 📦 Database Schema

Your migrations create these tables:

### Core Tables (001_initial_schema.sql)

- `profiles` - User profiles
- `wallets` - Encrypted wallet data
- `transactions` - Transaction history
- `contacts` - User contacts
- `kyc_status` - KYC verification records

### Billing Module (002_rwa_loans_billing.sql)

- `rwa_assets` - Real World Asset registry (5 pre-seeded)
- `rwa_holdings` - User asset holdings
- `rwa_transactions` - Asset buy/sell/yield history
- `loans` - Collateral loan records
- `loan_collateral` - Locked collateral tracking
- `flash_loan_logs` - Flash loan execution logs
- `yield_distributions` - Asset yield payments

---

## 🧪 Testing Features

### Demo Mode Testing (Current)

- ✅ Browse 5 RWA assets
- ✅ View asset details
- ✅ Test UI components
- ✅ Test loan calculator
- ✅ Test KYC flow UI
- ❌ Data is not persisted
- ❌ Cannot make real purchases
- ❌ No real wallet integration

### Full Mode Testing (After Setup)

- ✅ All demo mode features
- ✅ Persistent data storage
- ✅ Real Stellar testnet integration
- ✅ Purchase RWA tokens
- ✅ Request collateral loans
- ✅ Submit KYC verification
- ✅ Track portfolio over time

---

## 🌟 Stellar Network Setup

### Current: Testnet (Default)

Your app uses Stellar Testnet by default. To get testnet XLM:

1. Go to [https://laboratory.stellar.org/#account-creator](https://laboratory.stellar.org/#account-creator)
2. Click **"Generate keypair"**
3. Click **"Fund account with friendbot"**
4. Copy your public & secret keys to the app

### Production: Mainnet

To use real Stellar Mainnet:

1. Update `.env.local`:

   ```env
   NEXT_PUBLIC_STELLAR_NETWORK=public
   ```

2. **⚠️ WARNING**: Use real funds only after thorough testing!

---

## 📚 Pre-Seeded RWA Assets

Once migrations run, you'll have these assets:

1. **REALTY01** - Mumbai Real Estate (8.5% APY)
2. **TBOND01** - India Treasury Bond (7.2% APY)
3. **GOLD01** - Digital Gold Token (0% yield)
4. **INVOICE1** - Trade Finance Pool (12% APY)
5. **STABLE01** - Stable Yield Fund (5.5% APY)

---

## 🐛 Troubleshooting

### "getaddrinfo ENOTFOUND your-project.supabase.co"

**Solution**: You're in demo mode. Either:

- Continue testing with mock data, OR
- Follow the Supabase setup steps above

### "Failed to fetch assets"

**Causes**:

1. Supabase project not created
2. Wrong credentials in `.env.local`
3. Migrations not run

**Solution**: Complete Steps 1-4 above

### Demo Banner Won't Disappear

**Causes**:

1. `.env.local` still has placeholder URLs
2. Dev server not restarted after updating `.env.local`

**Solution**:

```bash
# Kill dev server
Ctrl+C

# Clear Next.js cache
Remove-Item -Recurse -Force .next

# Restart
npm run dev
```

### Database Tables Missing

**Solution**: Run migrations in Supabase SQL Editor

---

## 🚀 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables from `.env.local`
5. Deploy!

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WALLET_ENCRYPTION_KEY=
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

---

## 📖 Documentation

- [Steller Architecture](./docs/architecture.md)
- [Billing Module Implementation](./docs/BILLING_MODULE_IMPLEMENTATION.md)
- [Stellar SDK Docs](https://developers.stellar.org)
- [Supabase Docs](https://supabase.com/docs)

---

## 🎯 Next Steps

1. ✅ Complete Supabase setup (if not done)
2. ⬜ Test RWA purchase flow
3. ⬜ Deploy Soroban smart contracts
4. ⬜ Test loan system
5. ⬜ Complete KYC integration
6. ⬜ Production deployment

---

## 💡 Support

- **Issues**: Create an issue in your repo
- **Stellar Docs**: https://developers.stellar.org
- **Supabase Discord**: https://discord.supabase.com

---

**Current Mode**: 🟡 Demo (Mock Data)  
**To Activate Full Mode**: Complete Supabase setup above ⬆️
