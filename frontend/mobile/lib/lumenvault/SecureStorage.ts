import * as SecureStore from 'expo-secure-store';

export class SecureStorage {
    /**
     * Save a value securely
     * @param key Storage key
     * @param value Value to store
     * @param options SecureStore options
     */
    static async setItem(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
        try {
            await SecureStore.setItemAsync(key, value, options);
        } catch (error: any) {
            console.error(`SecureStorage setItem error for key ${key}:`, error);
            throw new Error('Failed to save data securely');
        }
    }

    /**
     * Retrieve a value securely
     * @param key Storage key
     * @param options SecureStore options
     */
    static async getItem(key: string, options?: SecureStore.SecureStoreOptions): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(key, options);
        } catch (error: any) {
            console.error(`SecureStorage getItem error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Delete a value securely
     * @param key Storage key
     * @param options SecureStore options
     */
    static async deleteItem(key: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key, options);
        } catch (error: any) {
            console.error(`SecureStorage deleteItem error for key ${key}:`, error);
        }
    }
}
