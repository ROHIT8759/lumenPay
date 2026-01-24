import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'lumenpay_biometric_enabled';
const PIN_HASH_KEY = 'lumenpay_pin_hash';

export const mobileStorage = {
    async isBiometricEnabled(): Promise<boolean> {
        const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        return enabled === 'true';
    },

    async setBiometricEnabled(enabled: boolean): Promise<void> {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    },

    async getPINHash(): Promise<string | null> {
        return await SecureStore.getItemAsync(PIN_HASH_KEY);
    },

    async storePINHash(hash: string): Promise<void> {
        await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
    }
};
