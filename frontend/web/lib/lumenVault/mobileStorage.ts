import { secureStorage as browserStorage } from './secureStorage';
import { WalletData } from './keyManager';

interface SecureStoreOptions {
    keychainAccessible?: number;
    requireAuthentication?: boolean;
}

// SecureStore is only available on React Native/Expo, not on web
const SecureStore: any = null;

class MobileStorage {
    private readonly PREFIX = 'lumenvault_';
    private isExpoEnvironment: boolean = false;

    constructor() {
        // Web environment - always use browser storage
        this.isExpoEnvironment = false;
    }

    
    isMobile(): boolean {
        return false; // Always false on web
    }

    
    async storeWalletMobile(
        id: string,
        walletData: WalletData,
        requireAuth: boolean = true
    ): Promise<void> {
        // Always use browser storage on web
        return browserStorage.storeWallet(id, walletData);
    }

    async getWalletMobile(id: string): Promise<WalletData | null> {
        return browserStorage.getWallet(id);
    }

    
    async deleteWalletMobile(id: string): Promise<void> {
        return browserStorage.deleteWallet(id);
    }

    
    async storePINHash(hash: string): Promise<void> {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`${this.PREFIX}pin_hash`, hash);
        }
    }

    
    async getPINHash(): Promise<string | null> {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(`${this.PREFIX}pin_hash`);
        }
        return null;
    }

    
    async setBiometricEnabled(enabled: boolean): Promise<void> {
        const key = `${this.PREFIX}biometric_enabled`;
        const value = enabled ? 'true' : 'false';
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, value);
        }
    }

    
    async isBiometricEnabled(): Promise<boolean> {
        const key = `${this.PREFIX}biometric_enabled`;
        if (typeof window !== 'undefined') {
            return localStorage.getItem(key) === 'true';
        }
        return false;
    }

    
    async storeSessionMobile(
        publicKey: string,
        durationMinutes: number = 30,
        requireAuth: boolean = true
    ): Promise<void> {
        return browserStorage.storeSession(publicKey, durationMinutes);
    }

    
    async getSessionMobile(): Promise<{
        publicKey: string;
        expiresAt: number;
    } | null> {
        return browserStorage.getSession();
    }

    
    async clearSessionMobile(): Promise<void> {
        return browserStorage.clearSession();
    }

    
    async migrateFromVersion(fromVersion: number): Promise<void> {
        console.log(`Migrating from storage version ${fromVersion} (no-op on web)`);
    }

    
    async getAllWalletIdsMobile(): Promise<string[]> {
        return browserStorage.getAllWalletIds();
    }

    
    private async updateWalletIds(ids: string[]): Promise<void> {
        // No-op on web
    }

    
    async addWalletIdToMetadata(id: string): Promise<void> {
        // No-op on web
    }

    
    async removeWalletIdFromMetadata(id: string): Promise<void> {
        // No-op on web
    }
}


export const mobileStorage = new MobileStorage();
