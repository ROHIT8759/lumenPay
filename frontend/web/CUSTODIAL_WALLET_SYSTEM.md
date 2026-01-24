# LumenPay - Custodial Wallet Authentication System

## Overview

LumenPay uses a **custodial-only** wallet system, similar to popular payment apps like UPI, Paytm, and Google Pay. Users never need to manage private keys or connect external wallets.

## Authentication Flow

### 1. User Sign-Up/Sign-In

- User visits the app and clicks "Continue with Our Wallet"
- User enters their email address
- System sends a magic link via Supabase Auth
- User clicks the link to authenticate

### 2. Automatic Wallet Creation

When a user logs in for the first time:

1. Backend checks if wallet exists for user ID
2. If not, generates a new Stellar keypair using `@stellar/stellar-sdk`
3. Encrypts the private key using AES-256
4. Stores encrypted key in database
5. Maps wallet address to user profile
6. (Optional) Funds testnet account automatically

### 3. Subsequent Logins

- User logs in with same email
- System fetches existing wallet from database
- User sees same wallet address across all devices

## Security

### Private Key Management

- **Generated server-side** using Stellar SDK
- **Encrypted at rest** using AES-256-CBC
- **Never sent to frontend**
- **Never logged** in application logs
- Encryption key stored in environment variables

### Transaction Signing

- All transactions signed **server-side**
- User initiates transaction from frontend
- Backend validates, signs, and submits to Stellar network
- User never handles private keys

## Database Schema

### `users` table

```sql
- id (uuid, primary key)
- email (text, unique)
- created_at (timestamp)
```

### `wallets` table

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → users.id)
- public_key (text, unique) -- Stellar public address
- encrypted_private_key (text) -- AES-256 encrypted
- wallet_type (text) -- Always 'custodial'
- created_at (timestamp)
```

## API Endpoints

### GET /api/wallet

Fetches or creates wallet for authenticated user.

**Headers:**

```
x-user-id: <supabase-user-id>
```

**Response:**

```json
{
  "publicKey": "GXXXXXXX...",
  "address": "GXXXXXXX...",
  "isNew": false,
  "createdAt": "2026-01-24T..."
}
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>

# Wallet Encryption (32-byte hex for AES-256)
WALLET_ENCRYPTION_KEY=<64-character-hex-string>

# Stellar Network
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## User Experience

### What Users See

✅ Single "Continue with Our Wallet" button
✅ Email login (magic link)
✅ Wallet created automatically
✅ Read-only wallet address display
✅ QR code for receiving payments
✅ Simple transaction confirmation

### What Users DON'T See

❌ Wallet connection options
❌ Private keys or seed phrases
❌ External wallet extensions
❌ Crypto jargon
❌ Complex setup steps

## Edge Cases Handled

### Multiple Devices

- User logs in from phone → sees wallet A
- User logs in from laptop → sees **same** wallet A
- Wallet tied to user ID, not device

### Browser Reinstall

- User logs in again → fetches existing wallet from database
- No data loss, wallet persists

### Logout & Login

- Wallet remains in database
- User sees same wallet after re-authentication

## Code Structure

### Frontend

```
/components/auth/LoginModal.tsx     -- Simplified login UI
/hooks/useWallet.ts                 -- Custodial wallet hook
```

### Backend

```
/app/api/wallet/route.ts            -- Wallet auto-creation API
/lib/walletService.ts               -- Wallet operations
/lib/supabaseClient.ts              -- Database client
```

## Removed Components

The following have been **completely removed**:

- ❌ Freighter wallet integration
- ❌ External wallet hooks
- ❌ Wallet type selection UI
- ❌ LumenVault mobile sync components
- ❌ Private key import/export features
- ❌ `@stellar/freighter-api` dependency
- ❌ `idb` (IndexedDB) dependency

## Testing

To test the authentication flow:

1. Start the dev server: `pnpm dev`
2. Open http://localhost:3000
3. Click "Continue with Our Wallet"
4. Enter your email
5. Check email for magic link
6. Click link → redirected to dashboard
7. Wallet automatically created and visible

## Migration Notes

If upgrading from external wallet system:

1. Existing external wallet users need to be migrated
2. Consider creating custodial wallets for existing users
3. Deprecate old wallet connection code
4. Update documentation and user communications

## Support

For issues or questions:

- Check Supabase logs for auth issues
- Check server logs for wallet creation errors
- Verify WALLET_ENCRYPTION_KEY is set correctly
- Ensure Stellar network URLs are accessible
