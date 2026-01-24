

import { secureStorage as browserStorage } from './secureStorage';
import { WalletData } from './keyManager';


interface SecureStoreOptions {
    keychainAccessible?: number;
    requireAuthentication?: boolean;
}


let SecureStore: any = null;


if (typeof window !== 'undefined' && (window as any).expo) {
    try {
        SecureStore = require('expo-secure-store');
    } catch {
        
    }
}

class MobileStorage {
    private readonly PREFIX = 'lumenvault_';
    private isExpoEnvironment: boolean;

    constructor() {
        this.isExpoEnvironment = !!SecureStore;
    }

    
    isMobile(): boolean {
        return this.isExpoEnvironment;
    }

    
    async storeWalletMobile(
        id: string,
        walletData: WalletData,
        requireAuth: boolean = true
    ): Promise<void> {
        if (!this.isExpoEnvironment) {
            
            return browserStorage.storeWallet(id, walletData);
        }

        const key = `${this.PREFIX}wallet_${id}`;
        const value = JSON.stringify({
            walletData,
            lastUnlocked: Date.now(),
        });

        const options: SecureStoreOptions = {
            requireAuthentication: requireAuth,
        };

        await SecureStore.setItemAsync(key, value, options);
    }

    
    async getWalletMobile(id: string): Promise<WalletData | null> {
        if (!this.isExpoEnvironment) {
            return browserStorage.getWallet(id);
        }

        const key = `${this.PREFIX}wallet_${id}`;
        const value = await SecureStore.getItemAsync(key);

        if (!value) return null;

        try {
            const parsed = JSON.parse(value);
            return parsed.walletData;
        } catch {
            return null;
        }
    }

    
    async deleteWalletMobile(id: string): Promise<void> {
        if (!this.isExpoEnvironment) {
            return browserStorage.deleteWallet(id);
        }

        const key = `${this.PREFIX}wallet_${id}`;
        await SecureStore.deleteItemAsync(key);
    }

    
    async storePINHash(hash: string): Promise<void> {
        if (!this.isExpoEnvironment) {
            
            if (typeof window !== 'undefined') {
                localStorage.setItem(`${this.PREFIX}pin_hash`, hash);
            }
            return;
        }

        await SecureStore.setItemAsync(`${this.PREFIX}pin_hash`, hash);
    }

    
    async getPINHash(): Promise<string | null> {
        if (!this.isExpoEnvironment) {
            if (typeof window !== 'undefined') {
                return localStorage.getItem(`${this.PREFIX}pin_hash`);
            }
            return null;
        }

        return await SecureStore.getItemAsync(`${this.PREFIX}pin_hash`);
    }

    
    async setBiometricEnabled(enabled: boolean): Promise<void> {
        const key = `${this.PREFIX}biometric_enabled`;
        const value = enabled ? 'true' : 'false';

        if (!this.isExpoEnvironment) {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
            }
            return;
        }

        await SecureStore.setItemAsync(key, value);
    }

    
    async isBiometricEnabled(): Promise<boolean> {
        const key = `${this.PREFIX}biometric_enabled`;

        if (!this.isExpoEnvironment) {
            if (typeof window !== 'undefined') {
                return localStorage.getItem(key) === 'true';
            }
            return false;
        }

        const value = await SecureStore.getItemAsync(key);
        return value === 'true';
    }

    
    async storeSessionMobile(
        publicKey: string,
        durationMinutes: number = 30,
        requireAuth: boolean = true
    ): Promise<void> {
        if (!this.isExpoEnvironment) {
            return browserStorage.storeSession(publicKey, durationMinutes);
        }

        const session = {
            publicKey,
            unlockedAt: Date.now(),
            expiresAt: Date.now() + durationMinutes * 60 * 1000,
        };

        const options: SecureStoreOptions = {
            requireAuthentication: requireAuth,
        };

        await SecureStore.setItemAsync(
            `${this.PREFIX}session`,
            JSON.stringify(session),
            options
        );
    }

    
    async getSessionMobile(): Promise<{
        publicKey: string;
        expiresAt: number;
    } | null> {
        if (!this.isExpoEnvironment) {
            return browserStorage.getSession();
        }

        const value = await SecureStore.getItemAsync(`${this.PREFIX}session`);
        if (!value) return null;

        try {
            const session = JSON.parse(value);

            
            if (Date.now() > session.expiresAt) {
                await this.clearSessionMobile();
                return null;
            }

            return {
                publicKey: session.publicKey,
                expiresAt: session.expiresAt,
            };
        } catch {
            return null;
        }
    }

    
    async clearSessionMobile(): Promise<void> {
        if (!this.isExpoEnvironment) {
            return browserStorage.clearSession();
        }

        await SecureStore.deleteItemAsync(`${this.PREFIX}session`);
    }

    
    async migrateFromVersion(fromVersion: number): Promise<void> {
        
        console.log(`Migrating from storage version ${fromVersion}`);

        
    }

    
    async getAllWalletIdsMobile(): Promise<string[]> {
        if (!this.isExpoEnvironment) {
            return browserStorage.getAllWalletIds();
        }

        
        const metadataKey = `${this.PREFIX}wallet_ids`;
        const value = await SecureStore.getItemAsync(metadataKey);

        if (!value) return [];

        try {
            return JSON.parse(value);
        } catch {
            return [];
        }
    }

    
    private async updateWalletIds(ids: string[]): Promise<void> {
        if (!this.isExpoEnvironment) return;

        const metadataKey = `${this.PREFIX}wallet_ids`;
        await SecureStore.setItemAsync(metadataKey, JSON.stringify(ids));
    }

    
    async addWalletIdToMetadata(id: string): Promise<void> {
        const ids = await this.getAllWalletIdsMobile();
        if (!ids.includes(id)) {
            ids.push(id);
            await this.updateWalletIds(ids);
        }
    }

    
    async removeWalletIdFromMetadata(id: string): Promise<void> {
        const ids = await this.getAllWalletIdsMobile();
        const filtered = ids.filter((walletId) => walletId !== id);
        await this.updateWalletIds(filtered);
    }
}


export const mobileStorage = new MobileStorage();
