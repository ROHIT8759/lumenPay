

import { secureStorage } from './secureStorage';
import { mobileStorage } from './mobileStorage';

interface MigrationResult {
    success: boolean;
    migratedItems: number;
    errors: string[];
}

interface StorageVersion {
    version: number;
    migratedAt: number;
}

const CURRENT_VERSION = 1;
const VERSION_KEY = 'lumenvault_storage_version';

class StorageMigration {
    
    async getCurrentVersion(): Promise<number> {
        if (typeof window === 'undefined') return CURRENT_VERSION;

        const stored = localStorage.getItem(VERSION_KEY);
        if (!stored) return 0; 

        try {
            const versionData: StorageVersion = JSON.parse(stored);
            return versionData.version;
        } catch {
            return 0;
        }
    }

    
    async setVersion(version: number): Promise<void> {
        if (typeof window === 'undefined') return;

        const versionData: StorageVersion = {
            version,
            migratedAt: Date.now(),
        };

        localStorage.setItem(VERSION_KEY, JSON.stringify(versionData));
    }

    
    async migrate(): Promise<MigrationResult> {
        const currentVersion = await this.getCurrentVersion();
        const result: MigrationResult = {
            success: true,
            migratedItems: 0,
            errors: [],
        };

        
        if (currentVersion >= CURRENT_VERSION) {
            return result;
        }

        console.log(`Migrating storage from v${currentVersion} to v${CURRENT_VERSION}`);

        
        for (let version = currentVersion + 1; version <= CURRENT_VERSION; version++) {
            try {
                const migrationResult = await this.runMigration(version);
                result.migratedItems += migrationResult.migratedItems;
                result.errors.push(...migrationResult.errors);
            } catch (error: any) {
                result.success = false;
                result.errors.push(`Migration to v${version} failed: ${error.message}`);
                return result;
            }
        }

        
        await this.setVersion(CURRENT_VERSION);

        return result;
    }

    
    private async runMigration(toVersion: number): Promise<MigrationResult> {
        switch (toVersion) {
            case 1:
                return await this.migrateToV1();
            
            
            
            default:
                return {
                    success: true,
                    migratedItems: 0,
                    errors: [],
                };
        }
    }

    
    private async migrateToV1(): Promise<MigrationResult> {
        
        return {
            success: true,
            migratedItems: 0,
            errors: [],
        };
    }

    
    async exportWallets(): Promise<{
        wallets: Array<{
            id: string;
            publicKey: string;
            encryptedData: any;
        }>;
        version: number;
        exportedAt: number;
    }> {
        const walletIds = await secureStorage.getAllWalletIds();
        const wallets: any[] = [];

        for (const id of walletIds) {
            const walletData = await secureStorage.getWallet(id);
            if (walletData) {
                wallets.push({
                    id,
                    publicKey: walletData.publicKey,
                    encryptedData: walletData.encryptedSecret,
                });
            }
        }

        return {
            wallets,
            version: await this.getCurrentVersion(),
            exportedAt: Date.now(),
        };
    }

    
    async importWallets(data: {
        wallets: Array<{
            id: string;
            publicKey: string;
            encryptedData: any;
        }>;
        version: number;
    }): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: true,
            migratedItems: 0,
            errors: [],
        };

        for (const wallet of data.wallets) {
            try {
                
                const walletData = {
                    publicKey: wallet.publicKey,
                    encryptedSecret: wallet.encryptedData,
                    createdAt: Date.now(),
                };

                await secureStorage.storeWallet(wallet.id, walletData);
                result.migratedItems++;
            } catch (error: any) {
                result.errors.push(`Failed to import wallet ${wallet.id}: ${error.message}`);
            }
        }

        if (result.errors.length > 0) {
            result.success = false;
        }

        return result;
    }

    
    async clearAllStorage(): Promise<void> {
        await secureStorage.clearAll();
        await this.setVersion(0);
    }

    
    async migrateFromLocalStorage(): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: true,
            migratedItems: 0,
            errors: [],
        };

        if (typeof window === 'undefined') {
            return result;
        }

        
        const oldKeys = Object.keys(localStorage).filter((key) =>
            key.startsWith('stellar_wallet_') || key.startsWith('wallet_')
        );

        for (const key of oldKeys) {
            try {
                const value = localStorage.getItem(key);
                if (!value) continue;

                
                const data = JSON.parse(value);

                
                const id = key.replace(/^(stellar_wallet_|wallet_)/, '');

                
                await secureStorage.storeWallet(id, data);

                
                localStorage.removeItem(key);

                result.migratedItems++;
            } catch (error: any) {
                result.errors.push(`Failed to migrate ${key}: ${error.message}`);
            }
        }

        return result;
    }

    
    async checkIntegrity(): Promise<{
        valid: boolean;
        issues: string[];
    }> {
        const issues: string[] = [];

        try {
            
            await secureStorage.getAllWalletIds();

            
            await secureStorage.getSettings();

            
            await secureStorage.getSession();

        } catch (error: any) {
            issues.push(`Storage integrity check failed: ${error.message}`);
        }

        return {
            valid: issues.length === 0,
            issues,
        };
    }
}


export const storageMigration = new StorageMigration();
