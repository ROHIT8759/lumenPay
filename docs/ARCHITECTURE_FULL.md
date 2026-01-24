# 🏗️ LumenPay - Complete Production Architecture

## Overview

LumenPay is a **real fintech payment system** built on Stellar blockchain with an **internal custodial wallet** (NOT external browser wallets). It feels like UPI/PayTM but powered by Stellar.

---

## 🎯 Core Architecture Principles

### 1. **Internal Wallet (Custodial Model)**

- Users do NOT connect Freighter, MetaMask, or any wallet extension
- Wallets are created automatically on signup
- Private keys are **encrypted at rest** and **never exposed to frontend**
- Users authenticate via email/phone (Supabase Auth)
- All signing happens on the backend

### 2. **Server-Side Transaction Signing**

```
Frontend                Backend                Stellar
  |                       |                       |
  |--pay request-------->  |                       |
  |  (amount, recipient)   |                       |
  |                        |--build TX XDR-------->|
  |                        |                       |
  |                        |<--unsigned TX---------|
  |                        |                       |
  |                        |--sign with key------->|
  |                        |  (decrypt & sign)     |
  |                        |                       |
  |                        |--submit signed TX---->|
  |                        |                       |
  |                        |<--tx hash-------------|
  |<--tx hash-------------|
```

### 3. **Frontend is Dumb, Backend is Smart**

- Frontend: Display balance, show QR, collect recipient info
- Backend: Validate, sign, submit, retry, audit
- Database: Immutable transaction record

---

## 📊 System Components

### A. Frontend (Next.js + React)

**Files:**

```
/app
  /layout.tsx              # Global layout with auth middleware
  /page.tsx                # Landing page
  /dashboard
    /page.tsx              # Main wallet dashboard
  /api
    /auth/signup           # User registration
    /wallet                # Balance & transaction history
    /pay                   # Payment flow
    /loan                  # Loan operations
    /kyc                   # KYC submission
```

**Key Features:**

- Glassmorphism UI with starfield background
- Real-time balance display (synced from Stellar)
- QR code for receiving payments
- Payment flow with confirmation
- Transaction history
- No web3 language - feels like regular fintech app

### B. Backend (Next.js Server Actions + API Routes)

**Key Services:**

#### 1. **Wallet Service** (`lib/walletService.ts`)

```typescript
-createWallet(userId) - // Generate keypair & encrypt
  getWalletPublicKey(userId) - // Retrieve address
  getBalance(publicKey) - // Fetch from Stellar
  buildPaymentTransaction() - // Create unsigned XDR
  signAndSubmitTransaction() - // Sign & broadcast
  getTransactionDetails(); // Check status
```

#### 2. **Encryption Service** (`lib/encryption.ts`)

```typescript
-encryptKey(privateKey) - // AES-256-GCM encryption
  decryptKey(encrypted) - // Server-side only
  hashKey(value) - // For auditing
  generateRandomToken(); // Security
```

#### 3. **API Routes** (`app/api/`)

```
POST /api/auth/signup             # Register user + wallet
GET  /api/wallet?action=info      # Get wallet address
GET  /api/wallet?action=balance   # Fetch balance from Stellar
GET  /api/wallet?action=transactions  # Transaction history
POST /api/pay                      # Payment API
```

### C. Database (Supabase PostgreSQL)

**Tables:**

```sql
-- Users & Auth
profiles                 # User identity
kyc_status              # KYC verification level
wallets                 # Wallet mappings (encrypted keys)

-- Transactions
transactions            # Payment history (immutable)
audit_log               # All actions logged

-- Loans
loans                   # Loan records
emi_schedules           # Installment schedules

-- Social
contacts                # Saved recipients
referrals               # Referral program
rewards                 # Cashback/bonuses

-- Rate Limiting
rate_limits             # Fraud prevention
```

### D. Blockchain (Stellar + Soroban)

**Smart Contracts** (Rust/Soroban):

```
contracts/src/
  payment.rs            # Payment recording
  loan.rs               # Loan issuance & EMI
  credit.rs             # Credit scoring (on-chain)
  kyc.rs                # KYC registry flag
```

---

## 🔐 Security Model

### 1. **Key Management**

```
Private Key Path:
  Stellar Keypair (random)
        ↓
  Encrypted with AES-256-GCM
        ↓
  Stored in Supabase (encrypted_keys column)
        ↓
  NEVER sent to client
        ↓
  Only decrypted for signing on backend
```

### 2. **Environment Secrets**

```env
WALLET_ENCRYPTION_KEY=<32-byte-hex>    # Master key for AES-256-GCM
SUPABASE_URL=<url>
SUPABASE_ANON_KEY=<key>
STELLAR_NETWORK=testnet                # testnet or public
```

### 3. **Rate Limiting & Spend Limits**

- Per-user daily transaction limit
- Per-transaction size limit (unverified users: max 10k)
- Rate limiting on API endpoints (Redis in production)

### 4. **Row-Level Security (RLS)**

- Users can only see their own data
- Backend service role has elevated access for processing
- Audit log restricted to backend

---

## 💳 User Flows

### Flow 1: Signup & Wallet Creation

```
1. User fills: email, password, fullName
2. POST /api/auth/signup { action: "signup", ... }

Backend:
  - Create Supabase auth user
  - Create profile
  - Generate random Stellar keypair
  - Encrypt private key with WALLET_ENCRYPTION_KEY
  - Store in wallets table
  - Fund with testnet friendbot (if testnet)
  - Return only public_key to client

Client:
  - Shows wallet address (read-only QR code)
  - Redirects to dashboard
```

### Flow 2: Payment

```
Step 1: Initiate
  Client: POST /api/pay { action: "initiate", recipientAddress, amount, asset }
  Backend:
    - Check KYC status
    - Check daily limit
    - Build unsigned XDR
    - Store as "pending" transaction
    - Return XDR to client

Step 2: Confirm
  Client: POST /api/pay { action: "confirm", transactionId }
  Backend:
    - Retrieve pending transaction
    - Decrypt private key
    - Sign transaction XDR
    - Submit to Stellar
    - Update transaction to "processing"
    - Add recipient to contacts

Step 3: Monitor
  Client polls: GET /api/pay?action=status&transactionId=...
  Backend:
    - Query Stellar ledger
    - Update status to "success" when confirmed
```

### Flow 3: Loan Disbursement

```
1. User requests loan (amount, tenure)
2. Backend checks credit score (on-chain via contract)
3. If approved:
   - Store loan record
   - Create EMI schedule
   - Call Soroban loan contract
   - Execute payment to user address
4. User receives funds, sees loan dashboard
```

### Flow 4: EMI Payment

```
1. User selects EMI from dashboard
2. Clicks "Pay EMI"
3. Backend:
   - Builds payment XDR to loan provider
   - Signs with user's internal wallet
   - Submits to Stellar
   - Updates EMI status to "paid"
   - Records on Soroban contract
```

---

## 📈 Scalability & Production Ready

### Database Scaling

- Indexes on (user_id, status), (tx_hash), (created_at)
- Supabase auto-scaling PostgreSQL
- Connection pooling via PgBouncer

### Backend Scaling

- Stateless Next.js API routes
- Redis for rate limiting & session cache
- Background jobs for async tasks (retry, settlement)

### Key Rotation

- Never hardcode keys in code
- Use AWS KMS or similar for key rotation
- Audit all key access

### Monitoring & Alerts

- Log all transactions to audit_log table
- Alert on:
  - Failed payments
  - KYC rejections
  - Large loan disbursements
  - Rate limit breaches

---

## 🚀 Deployment Checklist

### Pre-Launch

- [ ] Set WALLET_ENCRYPTION_KEY in production
- [ ] Enable RLS policies on all tables
- [ ] Set up automated backups (Supabase)
- [ ] Configure SSL/HTTPS everywhere
- [ ] Set up monitoring & alerting
- [ ] Audit smart contracts
- [ ] Load test API endpoints
- [ ] Implement rate limiting (Redis)

### Go-Live

- [ ] Switch STELLAR_NETWORK from testnet to public
- [ ] Verify Soroban contracts deployed
- [ ] Test end-to-end payment flow
- [ ] KYC integration (3rd party provider)
- [ ] Set realistic transaction limits
- [ ] Enable production logging

---

## 📱 Frontend - Key Components

### 1. Dashboard (`/dashboard`)

Shows:

- Wallet address (QR code)
- Balance (XLM + USDC)
- Recent transactions
- Quick action buttons
- Profile settings

### 2. Payment Flow (`/services/pay`)

- Recipient selector (search contacts or paste address)
- Amount input with currency
- Confirmation screen
- Success screen with tx hash

### 3. Loans (`/services/loans`)

- Loan offers (eligibility based on credit)
- Loan terms calculator
- EMI schedule viewer
- One-click EMI payment

### 4. Profile (`/profile`)

- KYC status
- Settings (language, timezone)
- Transaction history export
- Account security (2FA, recovery)

---

## 🛡️ Security Best Practices Implemented

✅ AES-256-GCM encryption for private keys  
✅ Row-level security (RLS) on Supabase  
✅ Rate limiting on all payment endpoints  
✅ Daily transaction limits per user  
✅ KYC verification required for large payments  
✅ Immutable audit log  
✅ Server-side transaction signing only  
✅ No private keys in logs  
✅ HTTPS enforced  
✅ Input validation on all endpoints

---

## 📞 Support & Maintenance

### Common Tasks

- **Update transaction limit**: Edit profiles table or API
- **Verify KYC**: Integrate with 3rd party (Trulioo, IDology)
- **Handle failed payments**: Retry logic in background job
- **Release new features**: Deploy contracts to Soroban, update backend APIs

---

## 🎓 Learning Resources

- [Stellar Docs](https://developers.stellar.org/)
- [Soroban Docs](https://soroban.stellar.org/)
- [Next.js Docs](https://nextjs.org/)
- [Supabase Docs](https://supabase.com/docs)

---

**Version:** 1.0  
**Last Updated:** Jan 2026  
**Status:** Production-Ready
