# End-to-End Real Data Refactor Plan

This plan removes mock data and ensures full end-to-end functionality for Mobile and Backend.

## 1. Backend Routes & Services (`backend/`)
We will ensure the backend supports the mobile app's requirements with real database and blockchain interactions.

*   **Update `routes/auth.ts`**: Add the missing `POST /signup` endpoint. This allows the mobile app to register a new wallet public key in Supabase immediately after generation.
*   **Update `services/escrowService.ts`**: Replace the hardcoded `getEscrowStatus` return with a real query. We will implement a check against the Soroban RPC to verify if the contract instance exists or fetch its ledger entry.
*   **Create `routes/kyc.ts`**: Implement the missing `/api/kyc` endpoints.
    *   `POST /session`: Create a DiD iT verification session (using real API if env var exists, or a realistic simulated flow that updates Supabase).
    *   `GET /status`: Fetch status from Supabase (updated via webhook) or DiD iT API.

## 2. Mobile App Refactor (`frontend/mobile/`)
We will replace "fake" UI flows with functional native capabilities.

*   **`app/wallet/sync.tsx`**:
    *   **Install `expo-camera`**: Enable real QR code scanning.
    *   **Implement Scanner**: Replace the "Alert" stub with a live camera view to scan the Web Wallet's export QR.
    *   **Real Sync Logic**: When a QR is scanned, decrypt the payload (using the PIN) and securely store the imported key using `LumenVault`.
*   **`app/kyc/verify.tsx`**:
    *   Remove `getWalletAddress` mock.
    *   Use `LumenVault.getPublicKey()` to fetch the actively signed-in wallet's address.
    *   Ensure it calls the new real backend KYC endpoints.

## 3. Web App Refactor (`frontend/web/`)
*   **`app/dashboard/page.tsx`**: Ensure the dashboard fetches real transaction history and balances from the backend instead of using skeleton arrays indefinitely.

## Execution Order
1.  **Backend**: Add `signup` route and `kyc` routes.
2.  **Mobile Dependencies**: Install `expo-camera`.
3.  **Mobile Logic**: Update Sync and KYC screens.
4.  **Verification**: Ensure the "Create Wallet" -> "Signup" -> "KYC" flow works without errors.
