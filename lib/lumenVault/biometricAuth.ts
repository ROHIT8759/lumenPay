import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// We'll define a simple storage helper here to avoid circular imports or missing files
const mobileStorage = {
    async isBiometricEnabled(): Promise<boolean> {
        const enabled = await SecureStore.getItemAsync('lumenpay_biometric_enabled');
        return enabled === 'true';
    },
    async setBiometricEnabled(enabled: boolean): Promise<void> {
        await SecureStore.setItemAsync('lumenpay_biometric_enabled', enabled ? 'true' : 'false');
    },
    async getPINHash(): Promise<string | null> {
        return await SecureStore.getItemAsync('lumenpay_pin_hash');
    },
    async storePINHash(hash: string): Promise<void> {
        await SecureStore.setItemAsync('lumenpay_pin_hash', hash);
    }
};

export type BiometricType =
    | 'fingerprint'
    | 'face'
    | 'iris'
    | 'none';

let LocalAuthentication: any = null;

async function loadLocalAuth() {
    try {
        LocalAuthentication = require('expo-local-authentication');
    } catch (e) {
        console.warn('LocalAuthentication not available');
    }
}

loadLocalAuth();

class BiometricAuthService {
    async isAvailable(): Promise<{
        available: boolean;
        biometricType: BiometricType;
    }> {
        if (!LocalAuthentication) {
            return { available: false, biometricType: 'none' };
        }

        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            if (!compatible) return { available: false, biometricType: 'none' };

            const enrolled = await LocalAuthentication.isEnrolledAsync();
            if (!enrolled) return { available: false, biometricType: 'none' };

            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            let type: BiometricType = 'fingerprint';
            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                type = 'face';
            } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
                type = 'iris';
            }

            return { available: true, biometricType: type };
        } catch (error) {
            return { available: false, biometricType: 'none' };
        }
    }

    async authenticate(reason: string = 'Unlock your wallet'): Promise<{
        success: boolean;
        error?: string;
    }> {
        if (!LocalAuthentication) {
            return { success: false, error: 'Biometric authentication not available' };
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: reason,
                fallbackLabel: 'Use PIN',
                disableDeviceFallback: false,
            });

            return {
                success: result.success,
                error: result.error,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async enableBiometric(): Promise<{
        success: boolean;
        error?: string;
    }> {
        const { available } = await this.isAvailable();
        if (!available) {
            return { success: false, error: 'Biometric authentication not available' };
        }

        const authResult = await this.authenticate('Enable biometric unlock');
        if (!authResult.success) return authResult;

        await mobileStorage.setBiometricEnabled(true);
        return { success: true };
    }

    async disableBiometric(): Promise<void> {
        await mobileStorage.setBiometricEnabled(false);
    }

    async isEnabled(): Promise<boolean> {
        return await mobileStorage.isBiometricEnabled();
    }
}

class PINAuthService {
    private readonly PIN_LENGTH = 6;

    private async hashPIN(pin: string): Promise<string> {
        return await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            pin + '_salt_lumenvault'
        );
    }

    async setupPIN(pin: string): Promise<{ success: boolean; error?: string }> {
        if (pin.length !== this.PIN_LENGTH || !/^\d+$/.test(pin)) {
            return { success: false, error: `PIN must be ${this.PIN_LENGTH} digits` };
        }
        const hash = await this.hashPIN(pin);
        await mobileStorage.storePINHash(hash);
        return { success: true };
    }

    async verifyPIN(pin: string): Promise<{ success: boolean; error?: string }> {
        const storedHash = await mobileStorage.getPINHash();
        if (!storedHash) return { success: false, error: 'No PIN set up' };
        const inputHash = await this.hashPIN(pin);
        if (inputHash === storedHash) return { success: true };
        return { success: false, error: 'Incorrect PIN' };
    }

    async hasPIN(): Promise<boolean> {
        return !!(await mobileStorage.getPINHash());
    }
}

export const biometricAuth = new BiometricAuthService();
export const pinAuth = new PINAuthService();
