import { Keypair, Transaction, TransactionBuilder, Networks } from '@stellar/stellar-sdk';
import { KeyManager } from './KeyManager';
import { BiometricAuth } from './BiometricAuth';

export class LumenVault {
    /**
     * Create a new wallet
     * Generates keys, funds friendbot (if testnet), and securely stores keys.
     * @returns Public Key
     */
    static async createWallet(fundTestnet: boolean = true): Promise<{ publicKey: string }> {
        // 1. Generate
        const pair = KeyManager.generateRandomKeypair();
        const secret = pair.secret();
        const publicKey = pair.publicKey();

        // 2. Store securely
        await KeyManager.storeKeypair(secret);

        // 3. Fund (Optional, for onboarding flow)
        if (fundTestnet) {
            try {
                await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
            } catch (e) {
                console.warn('Friendbot funding failed:', e);
            }
        }

        return { publicKey };
    }

    /**
     * Get the public key of the stored wallet
     * This is safe to call without auth
     */
    static async getPublicKey(): Promise<string | null> {
        const secret = await KeyManager.retrieveSecret();
        if (!secret) return null;
        try {
            const pair = Keypair.fromSecret(secret);
            return pair.publicKey();
        } catch {
            return null;
        }
    }

    /**
     * Check if wallet exists
     */
    static async hasWallet(): Promise<boolean> {
        return await KeyManager.hasWallet();
    }

    /**
     * Sign a transaction XDR
     * Requires Biometric Authentication
     * @param unsignedXdr Base64 XDR
     * @param networkPassphrase Network passphrase (default Testnet)
     */
    static async signTransaction(unsignedXdr: string, networkPassphrase: string = Networks.TESTNET): Promise<{ signedXdr: string }> {
        // 1. Authenticate
        const isBiometricEnabled = await BiometricAuth.isEnabled();
        if (isBiometricEnabled) {
            const auth = await BiometricAuth.authenticate('Unlock wallet to sign transaction');
            if (!auth.success) {
                throw new Error(auth.error || 'Authentication failed');
            }
        }

        // 2. Retrieve Keys
        const secret = await KeyManager.retrieveSecret();
        if (!secret) throw new Error('No wallet found');

        const keypair = Keypair.fromSecret(secret);

        // 3. Sign
        const tx = TransactionBuilder.fromXDR(unsignedXdr, networkPassphrase);
        tx.sign(keypair);

        return { signedXdr: tx.toXDR() };
    }

    /**
     * Sign a simple message (for Auth challenges)
     * Requires Biometric Authentication
     * @param message Message to sign
     */
    static async signMessage(message: string): Promise<{ signature: string }> {
        // 1. Authenticate
        const isBiometricEnabled = await BiometricAuth.isEnabled();
        if (isBiometricEnabled) {
            const auth = await BiometricAuth.authenticate('Unlock wallet to sign in');
            if (!auth.success) {
                throw new Error(auth.error || 'Authentication failed');
            }
        }

        // 2. Retrieve Keys
        const secret = await KeyManager.retrieveSecret();
        if (!secret) throw new Error('No wallet found');

        const keypair = Keypair.fromSecret(secret);

        // 3. Sign
        const signature = keypair.sign(Buffer.from(message)).toString('base64');
        return { signature };
    }
}
