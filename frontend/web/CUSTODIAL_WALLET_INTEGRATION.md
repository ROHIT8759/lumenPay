# Custodial Wallet Integration Guide

## Overview

LumenPay now uses **custodial wallets** instead of external wallet providers (like Freighter). This means:

- ✅ **Seamless user experience** - No browser extension required
- ✅ **Automatic transaction signing** - Backend handles all cryptographic operations
- ✅ **Secure key storage** - Private keys encrypted with AES-256-GCM
- ✅ **Full contract integration** - All Soroban smart contracts work out of the box
- ✅ **Server-side signing** - Private keys never leave the server

## Architecture

```
┌─────────────────┐
│  React UI       │
│  Components     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  useCustodial   │  <-- React Hook
│  Wallet Hook    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  /api/wallet/   │  <-- API Endpoint
│  sign           │      (Server-side)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  custodial      │  <-- Signing Service
│  WalletSigner   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  encryption.ts  │  <-- AES-256-GCM
│  + Supabase DB  │      Encrypted Keys
└─────────────────┘
```

## Files Created

### 1. `lib/custodialWalletSigner.ts`

Core signing service that:

- Retrieves encrypted private keys from database
- Decrypts keys using AES-256-GCM
- Signs Stellar transactions
- Returns signed XDR

**Key Functions:**

```typescript
signTransactionWithCustodialWallet(userId, xdr, network) -> SigningResult
getCustodialWalletPublicKey(userId) -> string
hasCustodialWallet(userId) -> boolean
createCustodialSigner(userId, network) -> SignerFunction
```

### 2. `app/api/wallet/sign/route.ts`

REST API endpoint for signing transactions:

- `POST /api/wallet/sign`
- Requires JWT authentication
- Accepts transaction XDR
- Returns signed XDR

**Request:**

```json
{
  "transactionXdr": "AAAA...",
  "networkPassphrase": "Test SDF Network ; September 2015"
}
```

**Response:**

```json
{
  "signedXdr": "AAAA...",
  "publicKey": "GABC123..."
}
```

### 3. `hooks/useCustodialWallet.ts`

React hook for easy integration:

**Usage:**

```typescript
const { signTransaction, getPublicKey, hasCustodialWallet, isLoading } =
  useCustodialWallet();

// Sign a transaction
const signedXdr = await signTransaction(xdr);

// Get wallet address
const publicKey = await getPublicKey();

// Check if wallet exists
const hasWallet = await hasCustodialWallet();
```

## Updated Services

### `lib/loanEscrowService.ts`

**Before:** Used Freighter wallet (`setFreighter()`, `signTransaction()`)

**After:** Uses custodial wallet

```typescript
import { createCustodialSigner, getCustodialWalletPublicKey } from './custodialWalletSigner';

// Get custodial wallet
const publicKey = await getCustodialWalletPublicKey(userId);

// Create signer
const signTransaction = createCustodialSigner(userId, Networks.TESTNET);

// Use with contract service
await contractService.lockCollateral(loanId, publicKey, ..., signTransaction);
```

### `lib/kycService.ts`

**Before:** Required Freighter connection for admin signing

**After:** Uses admin custodial wallet

```typescript
// Get admin wallet
const adminUserId = process.env.ADMIN_USER_ID || "admin";
const adminPublicKey = await getCustodialWalletPublicKey(adminUserId);

// Create admin signer
const signTransaction = createCustodialSigner(adminUserId, Networks.TESTNET);

// Verify KYC on-chain
await contractService.verifyKYC(
  walletAddress,
  level,
  adminPublicKey,
  signTransaction,
);
```

## Security Features

### 1. **AES-256-GCM Encryption**

```typescript
// From lib/encryption.ts
encryptKey(plaintext: string) -> base64String
decryptKey(encrypted: string) -> plaintext
```

- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Size:** 256 bits (32 bytes)
- **IV:** Random 16 bytes per encryption
- **Auth Tag:** 16 bytes for integrity verification

### 2. **Environment Variables**

```env
WALLET_ENCRYPTION_KEY=<64-character-hex-string>  # 32 bytes in hex
JWT_SECRET=<your-jwt-secret>
ADMIN_USER_ID=<admin-user-id>
```

**Generate encryption key:**

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32
```

### 3. **Database Schema**

```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_secret TEXT,  -- AES-256-GCM encrypted
  wallet_type TEXT,       -- 'custodial' | 'non_custodial'
  is_external BOOLEAN,
  created_at TIMESTAMP
);
```

### 4. **JWT Authentication**

All API endpoints require:

```
Authorization: Bearer <jwt-token>
```

Token contains:

- User ID / address
- Expiration time
- Signature

## Contract Integration Flow

### Example: Creating a Loan

**1. Frontend calls loan service:**

```typescript
const result = await loanEscrowService.createLoan({
  borrower_wallet: userId,
  collateral_asset: "USDC",
  collateral_amount: 1000,
  loan_amount: 500,
  interest_rate: 8.0,
  duration_days: 30,
});
```

**2. Service locks collateral on-chain:**

```typescript
// Inside loanEscrowService.lockCollateralOnChain()
const publicKey = await getCustodialWalletPublicKey(userId);
const signer = createCustodialSigner(userId, Networks.TESTNET);
await contractService.lockCollateral(loanId, publicKey, ..., signer);
```

**3. Signer function called:**

```typescript
// Created by createCustodialSigner()
async (xdr: string) => {
  const result = await signTransactionWithCustodialWallet(
    userId,
    xdr,
    Networks.TESTNET,
  );
  return result.signedXdr;
};
```

**4. Transaction signed and submitted:**

```typescript
// Inside contractService.invokeContract()
const signedXdr = await signTransaction(preparedTx.toXDR());
const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
await rpcServer.sendTransaction(signedTx);
```

**5. Result returned to frontend:**

```typescript
{
  success: true,
  loan: {
    id: '...',
    escrow_tx_hash: 'abc123...',
    status: 'ACTIVE'
  }
}
```

## Migration from Freighter

### Before (Freighter)

```typescript
import { setFreighter } from "@stellar/freighter-api";

const { isConnected, getPublicKey, signTransaction } = await setFreighter();
if (!isConnected()) throw new Error("Wallet not connected");

const publicKey = await getPublicKey();
const signedXdr = await signTransaction(xdr, { network: "TESTNET" });
```

### After (Custodial)

```typescript
import {
  createCustodialSigner,
  getCustodialWalletPublicKey,
} from "./custodialWalletSigner";

const publicKey = await getCustodialWalletPublicKey(userId);
if (!publicKey) throw new Error("Custodial wallet not found");

const signTransaction = createCustodialSigner(userId, Networks.TESTNET);
const signedXdr = await signTransaction(xdr);
```

**Benefits:**

- ✅ No browser extension required
- ✅ No user interaction needed
- ✅ Works in any environment (mobile, desktop, server)
- ✅ Consistent UX across all platforms

## Frontend Usage Examples

### React Component

```typescript
import { useCustodialWallet } from '@/hooks/useCustodialWallet';

function MyComponent() {
  const { signTransaction, getPublicKey, isLoading, error } = useCustodialWallet();

  const handleTransaction = async () => {
    try {
      const publicKey = await getPublicKey();
      const xdr = buildTransaction(publicKey);
      const signedXdr = await signTransaction(xdr);
      // Submit to blockchain
    } catch (err) {
      console.error('Transaction failed:', err);
    }
  };

  return (
    <button onClick={handleTransaction} disabled={isLoading}>
      {isLoading ? 'Signing...' : 'Sign Transaction'}
    </button>
  );
}
```

### With Contract Service

```typescript
import { contractService } from "@/lib/contractService";
import { createCustodialSigner } from "@/lib/custodialWalletSigner";
import { Networks } from "@stellar/stellar-sdk";

async function payWithContract(
  userId: string,
  recipient: string,
  amount: string,
) {
  // Create signer
  const signer = createCustodialSigner(userId, Networks.TESTNET);

  // Call contract
  const result = await contractService.pay(
    userId,
    recipient,
    amount,
    userId, // signer public key
    signer, // signing function
  );

  return result;
}
```

## Testing

### 1. Create Test Wallet

```typescript
// In your test setup
import { Keypair } from "@stellar/stellar-sdk";
import { encryptKey } from "@/lib/encryption";
import { supabase } from "@/lib/supabaseClient";

const keypair = Keypair.random();
const encrypted = encryptKey(keypair.secret());

await supabase.from("wallets").insert({
  user_id: "test-user-123",
  public_key: keypair.publicKey(),
  encrypted_secret: encrypted,
  wallet_type: "custodial",
  is_external: false,
});
```

### 2. Test Signing

```typescript
import { signTransactionWithCustodialWallet } from "@/lib/custodialWalletSigner";

const result = await signTransactionWithCustodialWallet(
  "test-user-123",
  transactionXdr,
  Networks.TESTNET,
);

expect(result.error).toBeUndefined();
expect(result.signedXdr).toBeDefined();
```

### 3. Test API Endpoint

```typescript
const response = await fetch("/api/wallet/sign", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${testToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    transactionXdr: testXdr,
    networkPassphrase: Networks.TESTNET,
  }),
});

const data = await response.json();
expect(data.signedXdr).toBeDefined();
```

## Troubleshooting

### Error: "Encryption key not configured"

**Solution:** Set `WALLET_ENCRYPTION_KEY` in your `.env` file:

```bash
WALLET_ENCRYPTION_KEY=<64-character-hex-string>
```

### Error: "Custodial wallet not found"

**Solution:** Ensure user has a wallet record in the database with `wallet_type='custodial'` and `encrypted_secret` field populated.

### Error: "Failed to decrypt wallet private key"

**Solution:**

1. Check that `WALLET_ENCRYPTION_KEY` hasn't changed
2. Verify the encrypted_secret field is not corrupted
3. Ensure the encryption key is exactly 64 hex characters (32 bytes)

### Error: "Invalid token"

**Solution:**

1. Check JWT_SECRET is configured
2. Verify token hasn't expired
3. Ensure Authorization header format: `Bearer <token>`

## Best Practices

### 1. **Never Log Private Keys**

```typescript
// ❌ BAD
console.log("Private key:", secretKey);

// ✅ GOOD
console.log("Public key:", publicKey);
```

### 2. **Always Use HTTPS in Production**

```typescript
// In production, enforce HTTPS
if (
  process.env.NODE_ENV === "production" &&
  !req.headers.get("x-forwarded-proto")?.includes("https")
) {
  return NextResponse.json({ error: "HTTPS required" }, { status: 403 });
}
```

### 3. **Rotate Encryption Keys Regularly**

```typescript
// Implement key rotation strategy
// 1. Decrypt with old key
// 2. Re-encrypt with new key
// 3. Update database
```

### 4. **Use Read Replicas for Key Retrieval**

```typescript
// Separate read/write operations
const wallet = await supabase
  .from("wallets")
  .select("encrypted_secret")
  .eq("user_id", userId)
  .single();
```

### 5. **Implement Rate Limiting**

```typescript
// Add rate limiting to signing endpoint
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimit(req);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  // ... rest of signing logic
}
```

## Summary

✅ **Implemented:**

- Custodial wallet signing service
- AES-256-GCM encryption for private keys
- Server-side signing API endpoint
- React hook for easy integration
- Updated loan and KYC services

✅ **Removed:**

- Freighter wallet dependency
- Client-side key handling
- Browser extension requirement

✅ **Benefits:**

- Better UX (no extensions needed)
- More secure (keys never leave server)
- Full platform support (mobile, desktop, web)
- Simplified contract integration
