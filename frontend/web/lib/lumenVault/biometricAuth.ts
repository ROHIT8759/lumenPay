

import { mobileStorage } from './mobileStorage';


export type BiometricType =
    | 'fingerprint'
    | 'face'
    | 'iris'
    | 'none';

// Check if we're in a web environment
const isWeb = typeof window !== 'undefined' && !('ReactNativeWebView' in window);

// Biometric auth is not available on web - never load expo modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LocalAuthentication: any = null;

class BiometricAuthService {

    async isAvailable(): Promise<{
        available: boolean;
        biometricType: BiometricType;
    }> {
        // Biometrics not available on web
        return {
            available: false,
            biometricType: 'none',
        };
    }


    async authenticate(reason: string = 'Unlock your wallet'): Promise<{
        success: boolean;
        error?: string;
    }> {
        return {
            success: false,
            error: 'Biometric authentication not available on web',
        };
    }


    async enableBiometric(): Promise<{
        success: boolean;
        error?: string;
    }> {
        return {
            success: false,
            error: 'Biometric authentication not available on web',
        };
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
        // Always use Web Crypto API (available in both browser and Node 15+)
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + '_salt_lumenvault');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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


        const hash = await this.hashPIN(pin);
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

        const inputHash = await this.hashPIN(pin);

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
