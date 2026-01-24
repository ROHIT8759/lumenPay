# LumenPay Refactor - Quick Reference

## 🏗️ Architecture

```
Mobile App (Expo)
    ↓ (unsigned XDR request)
Backend API
    ↓ (build XDR)
Mobile App
    ↓ (sign XDR)
Backend API
    ↓ (submit signed XDR)
Stellar Horizon
    ↓ (confirmation)
Indexer
    ↓ (update DB)
Mobile App (refresh)
```

## 🔑 Authentication Flow

```typescript
// 1. Request nonce
const { nonce } = await authApi.requestNonce(publicKey);

// 2. Sign nonce
const signature = await signMessage(nonce);

// 3. Verify and get JWT
const { token } = await authApi.verifyWallet(publicKey, signature, nonce);
// JWT automatically stored in SecureStore
```

## 💸 Payment Flow

```typescript
// 1. Build unsigned transaction
const { xdr } = await paymentApi.buildPayment({
  to: recipientAddress,
  amount: '10',
});

// 2. Request biometric auth
await biometricAuth.authenticateForTransaction(amount, recipient);

// 3. Sign transaction
const signedXDR = await signTransaction(xdr);

// 4. Submit to backend
const { hash } = await paymentApi.submitSignedPayment({
  signedXDR,
  to: recipientAddress,
  amount: '10',
});

// 5. Poll for status
const status = await paymentApi.getPaymentStatus(hash);
```

## 🔐 Escrow Flow

```typescript
// 1. Build unsigned Soroban invocation
const { xdr } = await escrowApi.buildEscrowLock({
  loanId: 12345,
  lender: lenderAddress,
  collateralToken: xlmTokenAddress,
  collateralAmount: '100',
  loanAmount: '50',
  durationSeconds: 2592000, // 30 days
});

// 2. Biometric auth + sign
const signedXDR = await signTransaction(xdr);

// 3. Submit
const { hash } = await paymentApi.submitSignedPayment({
  signedXDR,
  // ... metadata
});
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/services/authService.ts` | Nonce + signature verification |
| `backend/services/walletService.ts` | Unsigned TX builder |
| `backend/services/txRelayService.ts` | Horizon submission |
| `backend/services/escrowService.ts` | Soroban invocations |
| `backend/services/indexerService.ts` | Event indexing |
| `frontend/mobile/lib/stellar.ts` | Wallet + signing ONLY |
| `frontend/mobile/lib/api/*.ts` | Backend API clients |

## 🌐 API Endpoints

### Auth (No JWT required)
- `GET /api/auth/nonce?publicKey=G...`
- `POST /api/auth/verify`

### Transactions (JWT required)
- `POST /api/transactions/build-payment`
- `POST /api/transactions/submit`
- `GET /api/transactions/:hash/status`

### Escrow (JWT required)
- `POST /api/escrow/build-lock`
- `POST /api/escrow/build-release`
- `GET /api/escrow/:loanId`

## 🚀 Quick Start

```bash
# 1. Install dependencies
.\setup.ps1  # Windows
# or
./setup.sh   # Linux/Mac

# 2. Run migrations in Supabase SQL Editor
# Run: backend/supabase/migrations/003_indexer_telegram.sql

# 3. Start backend
cd backend
pnpm dev

# 4. Start indexer (separate terminal)
cd backend
pnpm indexer

# 5. Start mobile
cd frontend/mobile
npx expo start
```

## 🔒 Security Principles

1. ✅ Wallets created client-side
2. ✅ Private keys in SecureStore (never transmitted)
3. ✅ Backend only receives public keys + signatures
4. ✅ One-time nonces (10min expiry)
5. ✅ JWT tokens (7day expiry)
6. ✅ Biometric auth for all transactions

## 📝 Environment Variables

### Backend `.env`
```env
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
JWT_SECRET=<your-secret>
ESCROW_CONTRACT_ID=<contract-id>
```

### Mobile `.env`
```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

## 🐛 Common Issues

**"Cannot connect to backend"**
- Check backend running on localhost:3001
- Check `EXPO_PUBLIC_API_URL` in mobile `.env`

**"Authentication failed"**
- Request new nonce (may have expired)
- Ensure wallet exists in SecureStore

**"Transaction failed"**
- Check account balance
- Check signature validity
- Review backend logs for Horizon errors

## 📚 More Info

- Full guide: `REFACTORED_SETUP.md`
- Implementation details: `walkthrough.md` (artifact)
- Original plan: `implementation_plan.md` (artifact)
