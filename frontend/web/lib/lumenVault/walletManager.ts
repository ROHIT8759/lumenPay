import { secureStorage } from './secureStorage';
import { walletAuth } from './walletAuth';
import { generateKeypair, createWalletData, importKeypair, WalletData } from './keyManager';
import { biometricAuth } from './biometricAuth';

/**
 * Wallet Manager
 * High-level API for wallet operations
 */

export interface CreateWalletOptions {
    name?: string;
    enableBiometric?: boolean;
}

export interface CreateWalletResult {
    success: boolean;
    walletData?: WalletData;
    error?: string;
}

export interface ImportWalletResult {
    success: boolean;
    walletData?: WalletData;
    error?: string;
}

class WalletManager {
    /**
     * Create a new wallet
     */
    async createWallet(
        passphrase: string,
        options: CreateWalletOptions = {}
    ): Promise<CreateWalletResult> {
        try {
            // Generate new keypair
            const keypair = generateKeypair();

            // Create wallet data structure (only takes keypair and passphrase)
            const walletData = await createWalletData(keypair, passphrase);

            // Generate wallet ID from public key
            const walletId = walletData.publicKey;

            // Store wallet securely
            await secureStorage.storeWallet(walletId, walletData);

            // Enable biometrics if requested
            if (options.enableBiometric) {
                await biometricAuth.enableBiometric();
            }

            // Authenticate with backend
            const authResult = await walletAuth.signIn(walletData, passphrase);
            if (!authResult.success) {
                console.warn('Wallet created but authentication failed:', authResult.error);
            }

            return {
                success: true,
                walletData,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to create wallet',
            };
        }
    }

    /**
     * Import existing wallet from secret key
     */
    async importWallet(
        secretKey: string,
        passphrase: string,
        options: CreateWalletOptions = {}
    ): Promise<ImportWalletResult> {
        try {
            // Import keypair from secret
            const keypair = importKeypair(secretKey);

            // Create wallet data structure (only takes keypair and passphrase)
            const walletData = await createWalletData(keypair, passphrase);

            // Generate wallet ID from public key
            const walletId = walletData.publicKey;

            // Store wallet securely
            await secureStorage.storeWallet(walletId, walletData);

            // Enable biometrics if requested
            if (options.enableBiometric) {
                await biometricAuth.enableBiometric();
            }

            // Authenticate with backend
            const authResult = await walletAuth.signIn(walletData, passphrase);
            if (!authResult.success) {
                console.warn('Wallet imported but authentication failed:', authResult.error);
            }

            return {
                success: true,
                walletData,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to import wallet',
            };
        }
    }

    /**
     * Check if a wallet exists
     */
    async hasWallet(): Promise<boolean> {
        try {
            const ids = await secureStorage.getAllWalletIds();
            return ids.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Get wallet public key (if unlocked)
     */
    async getPublicKey(): Promise<string | null> {
        try {
            const session = await secureStorage.getSession();
            return session?.publicKey || null;
        } catch {
            return null;
        }
    }

    /**
     * Delete all wallets
     */
    async deleteAllWallets(): Promise<void> {
        const ids = await secureStorage.getAllWalletIds();
        for (const id of ids) {
            await secureStorage.deleteWallet(id);
        }
        walletAuth.signOut();
    }
}

export const walletManager = new WalletManager();
