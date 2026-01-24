import * as Keychain from 'react-native-keychain';
import { SecureStorage } from './SecureStorage';

const BIOMETRIC_ENABLED_KEY = 'lumenpay_biometric_enabled';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export interface BiometricAvailabilityResult {
  available: boolean;
  biometricTypes: Keychain.BIOMETRY_TYPE[];
  error?: string;
}

export class BiometricAuth {
  /**
   * Check if biometrics are available on the device
   */
  static async isAvailable(): Promise<BiometricAvailabilityResult> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();

      if (!biometryType) {
        return {
          available: false,
          biometricTypes: [],
          error: 'No biometric hardware available or not enrolled',
        };
      }

      return {
        available: true,
        biometricTypes: [biometryType],
      };
    } catch (error: any) {
      return {
        available: false,
        biometricTypes: [],
        error: error.message,
      };
    }
  }

  /**
   * Get user-friendly name for biometric type
   */
  static getBiometricTypeName(types: Keychain.BIOMETRY_TYPE[]): string {
    if (types.includes(Keychain.BIOMETRY_TYPE.FACE_ID)) {
      return 'Face ID';
    }
    if (types.includes(Keychain.BIOMETRY_TYPE.TOUCH_ID)) {
      return 'Touch ID';
    }
    if (types.includes(Keychain.BIOMETRY_TYPE.FINGERPRINT)) {
      return 'Fingerprint';
    }
    if (types.includes(Keychain.BIOMETRY_TYPE.IRIS)) {
      return 'Iris';
    }
    if (types.includes(Keychain.BIOMETRY_TYPE.FACE)) {
      return 'Face Recognition';
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
      return { success: false, error: availability.error };
    }

    try {
      // Use a dummy key to trigger biometric auth
      const authKey = 'lumenpay_biometric_auth_check';

      // First, set a value with biometric protection
      await Keychain.setGenericPassword(authKey, 'auth_check', {
        service: authKey,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      // Then retrieve it (this will trigger biometric prompt)
      const result = await Keychain.getGenericPassword({
        service: authKey,
        authenticationPrompt: {
          title: promptMessage || 'Unlock LumenPay',
          cancel: 'Cancel',
        },
      });

      // Clean up
      await Keychain.resetGenericPassword({ service: authKey });

      if (result) {
        return { success: true };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error: any) {
      if (error.message?.includes('cancel')) {
        return { success: false, error: 'Authentication cancelled' };
      }
      return { success: false, error: error.message || 'Authentication failed' };
    }
  }
}
