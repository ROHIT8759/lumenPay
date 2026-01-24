import * as LocalAuthentication from 'expo-local-authentication';
import { SecureStorage } from './SecureStorage';

const BIOMETRIC_ENABLED_KEY = 'lumenpay_biometric_enabled';

export interface BiometricAuthResult {
    success: boolean;
    error?: string;
}

export interface BiometricAvailabilityResult {
    available: boolean;
    biometricTypes: LocalAuthentication.AuthenticationType[];
    error?: string;
}

export class BiometricAuth {
    /**
     * Check if biometrics are available on the device
     */
    static async isAvailable(): Promise<BiometricAvailabilityResult> {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            if (!hasHardware) {
                return {
                    available: false,
                    biometricTypes: [],
                    error: 'No biometric hardware available'
                };
            }

            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!isEnrolled) {
                return {
                    available: false,
                    biometricTypes: [],
                    error: 'No biometrics enrolled on device'
                };
            }

            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            return {
                available: true,
                biometricTypes: types
            };
        } catch (error: any) {
            return {
                available: false,
                biometricTypes: [],
                error: error.message
            };
        }
    }

    /**
     * Get user-friendly name for biometric type
     */
    static getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            return 'Face ID';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return 'Fingerprint';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            return 'Iris';
        }
        return 'Biometrics';
    }

    /**
     * Check if biometrics are enabled for the app
     */
    static async isEnabled(): Promise<boolean> {
        const enabled = await SecureStorage.getItem(BIOMETRIC_ENABLED_KEY);
        return enabled === 'true';
    }

    /**
     * Enable biometrics for the app
     */
    static async enable(): Promise<BiometricAuthResult> {
        const availability = await this.isAvailable();
        if (!availability.available) {
            return { success: false, error: availability.error };
        }

        const authResult = await this.authenticate('Confirm to enable biometric unlock');
        if (!authResult.success) {
            return authResult;
        }

        try {
            await SecureStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Disable biometrics
     */
    static async disable(): Promise<void> {
        await SecureStorage.deleteItem(BIOMETRIC_ENABLED_KEY);
    }

    /**
     * Authenticate user via biometrics
     */
    static async authenticate(promptMessage?: string): Promise<BiometricAuthResult> {
        const availability = await this.isAvailable();
        if (!availability.available) {
            // Fallback: If biometrics not available but requested, maybe allow PIN?
            // For now, fail safe.
            return { success: false, error: availability.error };
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: promptMessage || 'Unlock LumenPay',
                cancelLabel: 'Cancel',
                disableDeviceFallback: false,
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                return { success: true };
            }

            if (result.error === 'user_cancel') {
                return { success: false, error: 'Authentication cancelled' };
            }
            if (result.error === 'user_fallback') {
                return { success: false, error: 'User chose fallback' };
            }
            if (result.error === 'lockout') {
                return { success: false, error: 'Too many attempts. Please try again later.' };
            }

            return { success: false, error: result.error || 'Authentication failed' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
