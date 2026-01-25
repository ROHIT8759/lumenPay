

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { WalletData } from './keyManager';
import { clearUnlockedKeypair } from './keyCache';

interface LumenVaultDB extends DBSchema {
    wallets: {
        key: string;
        value: {
            id: string;
            walletData: WalletData;
            lastUnlocked: number;
        };
    };
    session: {
        key: string;
        value: {
            publicKey: string;
            unlockedAt: number;
            expiresAt: number;
        };
    };
    settings: {
        key: string;
        value: {
            autoLockMinutes: number;
            network: 'testnet' | 'public';
        };
    };
}

const DB_NAME = 'lumenvault';
const DB_VERSION = 1;

class SecureStorage {
    private db: IDBPDatabase<LumenVaultDB> | null = null;
    private autoLockTimer: NodeJS.Timeout | null = null;

    
    async init(): Promise<void> {
        if (this.db) return;

        this.db = await openDB<LumenVaultDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                
                if (!db.objectStoreNames.contains('wallets')) {
                    db.createObjectStore('wallets', { keyPath: 'id' });
                }

                
                if (!db.objectStoreNames.contains('session')) {
                    db.createObjectStore('session');
                }

                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            },
        });
    }

    
    async storeWallet(id: string, walletData: WalletData): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        await this.db.put('wallets', {
            id,
            walletData,
            lastUnlocked: Date.now(),
        });
    }

    
    async getWallet(id: string): Promise<WalletData | null> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const record = await this.db.get('wallets', id);
        return record ? record.walletData : null;
    }

    
    async getAllWalletIds(): Promise<string[]> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const wallets = await this.db.getAllKeys('wallets');
        return wallets;
    }

    
    async deleteWallet(id: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        await this.db.delete('wallets', id);
    }

    
    async hasWallet(id: string): Promise<boolean> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const wallet = await this.db.get('wallets', id);
        return !!wallet;
    }

    
    async storeSession(publicKey: string, durationMinutes: number = 30): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const now = Date.now();
        await this.db.put('session', {
            publicKey,
            unlockedAt: now,
            expiresAt: now + durationMinutes * 60 * 1000,
        }, 'active');

        
        this.setAutoLock(durationMinutes);
    }

    
    async getSession(): Promise<{ publicKey: string; expiresAt: number } | null> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const session = await this.db.get('session', 'active');

        if (!session) return null;

        
        if (Date.now() > session.expiresAt) {
            await this.clearSession();
            return null;
        }

        return {
            publicKey: session.publicKey,
            expiresAt: session.expiresAt,
        };
    }

    
    async clearSession(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        await this.db.delete('session', 'active');
        clearUnlockedKeypair();
        this.clearAutoLock();
    }

    
    async isUnlocked(): Promise<boolean> {
        const session = await this.getSession();
        return !!session;
    }

    
    private setAutoLock(minutes: number): void {
        this.clearAutoLock();

        this.autoLockTimer = setTimeout(() => {
            this.clearSession();
        }, minutes * 60 * 1000);
    }

    
    private clearAutoLock(): void {
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
            this.autoLockTimer = null;
        }
    }

    
    async storeSettings(settings: { autoLockMinutes: number; network: 'testnet' | 'public' }): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        await this.db.put('settings', settings, 'app');
    }

    
    async getSettings(): Promise<{ autoLockMinutes: number; network: 'testnet' | 'public' }> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const settings = await this.db.get('settings', 'app');
        return settings || { autoLockMinutes: 30, network: 'testnet' };
    }

    
    async clearAll(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        await this.db.clear('wallets');
        await this.db.clear('session');
        await this.db.clear('settings');
    }
}


export const secureStorage = new SecureStorage();
