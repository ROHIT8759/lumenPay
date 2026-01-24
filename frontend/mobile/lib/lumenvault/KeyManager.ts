import { Keypair } from '@stellar/stellar-sdk';
import { SecureStorage } from './SecureStorage';

// Use the same key as the legacy app to ensure migration/compatibility
const SECRET_KEY_STORAGE_ID = 'stellar_secret';

export class KeyManager {
    /**
     * Generate a new random keypair
     * DOES NOT STORE IT. Use storeKeypair for that.
     */
    static generateRandomKeypair(): Keypair {
        return Keypair.random();
    }

    /**
     * Securely store the secret key
     * @param secret Stellar secret key (S...)
     */
    static async storeKeypair(secret: string): Promise<void> {
        // Expo SecureStore encrypts by default
        await SecureStorage.setItem(SECRET_KEY_STORAGE_ID, secret, {
            requireAuthentication: false // We handle auth via BiometricAuth wrapper manually for better UI control
            // Note: If we set requireAuthentication: true, iOS prompts automatically. 
            // We want to control the prompt via LocalAuthentication to support custom UI flows.
        });
    }

    /**
     * Retrieve the secret key
     * WARNING: This returns the raw secret. Should only be called after authentication.
     */
    static async retrieveSecret(): Promise<string | null> {
        return await SecureStorage.getItem(SECRET_KEY_STORAGE_ID);
    }

    /**
     * Check if a wallet exists
     */
    static async hasWallet(): Promise<boolean> {
        const secret = await SecureStorage.getItem(SECRET_KEY_STORAGE_ID);
        return !!secret;
    }

    /**
     * Clear the wallet (Danger zone)
     */
    static async clearWallet(): Promise<void> {
        await SecureStorage.deleteItem(SECRET_KEY_STORAGE_ID);
    }
}
