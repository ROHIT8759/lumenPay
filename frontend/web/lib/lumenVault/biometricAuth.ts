

import { createHash } from 'crypto';
import { mobileStorage } from './mobileStorage';


export type BiometricType =
    | 'fingerprint'
    | 'face'
    | 'iris'
    | 'none';


// We use a type-safe way to load expo-local-authentication
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LocalAuthentication: any = null;

async function loadLocalAuth() {
    if (typeof window !== 'undefined' && (window as { expo?: unknown }).expo) {
        try {
            // @ts-ignore - expo-local-authentication is only available in Expo/React Native
            LocalAuthentication = await import('expo-local-authentication');
        } catch {
            // Module not available
        }
    }
}

// Trigger initial load
loadLocalAuth();

class BiometricAuthService {

    async isAvailable(): Promise<{
        available: boolean;
        biometricType: BiometricType;
    }> {
        if (!LocalAuthentication) {
            return {
                available: false,
                biometricType: 'none',
            };
        }

        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            if (!compatible) {
                return {
                    available: false,
                    biometricType: 'none',
                };
            }

            const enrolled = await LocalAuthentication.isEnrolledAsync();
            if (!enrolled) {
                return {
                    available: false,
                    biometricType: 'none',
                };
            }

            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();


            let biometricType: BiometricType = 'fingerprint';
            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                biometricType = 'face';
            } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
                biometricType = 'iris';
            }

            return {
                available: true,
                biometricType,
            };
        } catch (error) {
            console.error('Biometric check failed:', error);
            return {
                available: false,
                biometricType: 'none',
            };
        }
    }


    async authenticate(reason: string = 'Unlock your wallet'): Promise<{
        success: boolean;
        error?: string;
    }> {
        if (!LocalAuthentication) {
            return {
                success: false,
                error: 'Biometric authentication not available',
            };
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
        } catch (error: unknown) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Authentication failed',
            };
        }
    }


    async enableBiometric(): Promise<{
        success: boolean;
        error?: string;
    }> {

        const { available } = await this.isAvailable();
        if (!available) {
            return {
                success: false,
                error: 'Biometric authentication not available on this device',
            };
        }


        const authResult = await this.authenticate('Enable biometric unlock');
        if (!authResult.success) {
            return authResult;
        }


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


    private hashPIN(pin: string): string {

        if (typeof window !== 'undefined' && !createHash) {

            return btoa(pin + '_salt_lumenvault');
        }


        return createHash('sha256')
            .update(pin + '_salt_lumenvault')
            .digest('hex');
    }


    async setupPIN(pin: string): Promise<{
        success: boolean;
        error?: string;
    }> {

        if (pin.length !== this.PIN_LENGTH) {
            return {
                success: false,
                error: `PIN must be ${this.PIN_LENGTH} digits`,
            };
        }

        if (!/^\d+$/.test(pin)) {
            return {
                success: false,
                error: 'PIN must contain only numbers',
            };
        }


        const hash = this.hashPIN(pin);
        await mobileStorage.storePINHash(hash);

        return { success: true };
    }


    async verifyPIN(pin: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const storedHash = await mobileStorage.getPINHash();

        if (!storedHash) {
            return {
                success: false,
                error: 'No PIN set up',
            };
        }

        const inputHash = this.hashPIN(pin);

        if (inputHash === storedHash) {
            return { success: true };
        } else {
            return {
                success: false,
                error: 'Incorrect PIN',
            };
        }
    }


    async hasPIN(): Promise<boolean> {
        const hash = await mobileStorage.getPINHash();
        return !!hash;
    }


    async changePIN(oldPIN: string, newPIN: string): Promise<{
        success: boolean;
        error?: string;
    }> {

        const verifyResult = await this.verifyPIN(oldPIN);
        if (!verifyResult.success) {
            return {
                success: false,
                error: 'Current PIN is incorrect',
            };
        }


        return await this.setupPIN(newPIN);
    }


    async removePIN(pin: string): Promise<{
        success: boolean;
        error?: string;
    }> {

        const verifyResult = await this.verifyPIN(pin);
        if (!verifyResult.success) {
            return verifyResult;
        }


        await mobileStorage.storePINHash('');

        return { success: true };
    }
}


export const biometricAuth = new BiometricAuthService();
export const pinAuth = new PINAuthService();
