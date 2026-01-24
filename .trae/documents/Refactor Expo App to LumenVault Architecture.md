# Expo Mobile App Refactor Plan (LumenVault Engine)

This plan executes the **PRD v5** refactor for the Expo mobile app (`frontend/mobile`), transforming it into a fully non-custodial wallet using the **LumenVault** architecture.

## 1. LumenVault Core Engine (`frontend/mobile/lib/lumenvault/`)
We will create a dedicated module to handle all sensitive wallet operations.

*   **`SecureStorage.ts`**: A robust wrapper around `expo-secure-store` to enforce encryption and consistent error handling.
*   **`BiometricAuth.ts`**: Refactor existing `lib/biometricAuth.ts` into this module. It will gate access to the private key.
*   **`KeyManager.ts`**: Handles the lifecycle of Stellar keys:
    *   `createKeypair()`: Generates random keys locally.
    *   `storeKeypair(secret)`: Encrypts and stores the secret in SecureStore.
    *   `retrieveKeypair()`: Protected method to fetch the secret (only after auth).
*   **`LumenVault.ts`** (Main Facade):
    *   `createWallet()`: Orchestrates key generation + storage.
    *   `unlockWallet()`: Triggers biometric prompt -> loads key into memory (short-lived).
    *   `signTransaction(xdr)`: Decodes XDR -> Signs locally -> Returns signed XDR.
    *   `signMessage(message)`: For auth challenges (JWT login).

## 2. Authentication Flow Refactor
We will align the mobile auth with the Web's wallet-signature flow.

*   **Update `wallet-setup.tsx`**:
    *   Replace direct `stellar-sdk` usage with `LumenVault.createWallet()`.
    *   Ensure the wallet is created **offline-first**, then "linked" to the backend via `authApi`.
*   **Update `authApi.ts`**:
    *   Ensure it uses `LumenVault.signMessage()` to sign the nonce from the backend.
    *   Store the resulting JWT in `SecureStorage`.

## 3. Payment Flow Refactor
We will remove raw key handling from UI components.

*   **Update `pay/confirm.tsx`**:
    *   Remove `loadWallet()` (which returns the raw secret).
    *   Replace with `LumenVault.signTransaction(unsignedXdr)`.
    *   Ensure the flow: `Build (Backend)` -> `Sign (LumenVault)` -> `Submit (Backend)` is atomic.

## 4. Backend Integration
*   **Config**: Update `frontend/mobile/lib/config.ts` to ensure `API_URL` points to the deployed Railway backend (or env var) instead of localhost, ensuring "Real" mode.

## 5. Cleanup
*   **Deprecate `lib/stellar.ts`**: Remove redundant key management functions that are now handled safely by LumenVault.

## Execution Steps
1.  **Scaffold**: Create `frontend/mobile/lib/lumenvault` structure.
2.  **Migrate**: Move Biometric logic and implement SecureStorage/KeyManager.
3.  **Implement**: Build the `LumenVault` class.
4.  **Refactor Screens**: Update `wallet-setup.tsx` and `pay/confirm.tsx`.
5.  **Verify**: Ensure no mock data remains and all flows use the new engine.
