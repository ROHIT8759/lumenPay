import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';


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

class BiometricAuthService {



    async isAvailable(): Promise<BiometricAvailabilityResult> {
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




    getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
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




    async isEnabled(): Promise<boolean> {
        try {
            const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
            return enabled === 'true';
        } catch {
            return false;
        }
    }





    async enable(): Promise<BiometricAuthResult> {

        const availability = await this.isAvailable();
        if (!availability.available) {
            return { success: false, error: availability.error };
        }


        const authResult = await this.authenticate('Confirm to enable biometric unlock');
        if (!authResult.success) {
            return authResult;
        }


        try {
            await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }




    async disable(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
        } catch {

        }
    }





    async authenticate(promptMessage?: string): Promise<BiometricAuthResult> {

        const availability = await this.isAvailable();
        if (!availability.available) {
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




    async authenticateForTransaction(amount: string, recipient: string): Promise<BiometricAuthResult> {
        const message = `Confirm payment of ${amount} to ${recipient.substring(0, 8)}...`;
        return this.authenticate(message);
    }




    async authenticateForSecretAccess(): Promise<BiometricAuthResult> {
        return this.authenticate('Authenticate to view your secret key');
    }
}


export const biometricAuth = new BiometricAuthService();
