import { useState, useEffect, useCallback } from 'react';
import * as Keychain from 'react-native-keychain';
import {
  BiometricAuth,
  BiometricAuthResult,
} from '../lib/lumenvault/BiometricAuth';

interface UseBiometricsReturn {
  isAvailable: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  biometricType: string;

  authenticate: (message?: string) => Promise<BiometricAuthResult>;
  enable: () => Promise<BiometricAuthResult>;
  disable: () => Promise<void>;
  refresh: () => Promise<void>;

  authenticateForPayment: (
    amount: string,
    recipient: string,
  ) => Promise<BiometricAuthResult>;
  authenticateForSecretAccess: () => Promise<BiometricAuthResult>;
}

export function useBiometrics(): UseBiometricsReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricType, setBiometricType] = useState('Biometrics');

  const checkAvailability = useCallback(async () => {
    setIsLoading(true);
    try {
      const availability = await BiometricAuth.isAvailable();
      setIsAvailable(availability.available);

      if (availability.available) {
        setBiometricType(
          BiometricAuth.getBiometricTypeName(
            availability.biometricTypes as Keychain.BIOMETRY_TYPE[],
          ),
        );
      }

      const enabled = await BiometricAuth.isEnabled();
      setIsEnabled(enabled);
    } catch (error) {
      console.error('Biometric check error:', error);
      setIsAvailable(false);
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const authenticate = useCallback(
    async (message?: string): Promise<BiometricAuthResult> => {
      return BiometricAuth.authenticate(message);
    },
    [],
  );

  const enable = useCallback(async (): Promise<BiometricAuthResult> => {
    const result = await BiometricAuth.enable();
    if (result.success) {
      setIsEnabled(true);
    }
    return result;
  }, []);

  const disable = useCallback(async (): Promise<void> => {
    await BiometricAuth.disable();
    setIsEnabled(false);
  }, []);

  const authenticateForPayment = useCallback(
    async (amount: string, recipient: string): Promise<BiometricAuthResult> => {
      return BiometricAuth.authenticate(
        `Confirm payment of ${amount} to ${recipient}`,
      );
    },
    [],
  );

  const authenticateForSecretAccess =
    useCallback(async (): Promise<BiometricAuthResult> => {
      return BiometricAuth.authenticate(
        'Authenticate to view your secret key',
      );
    }, []);

  return {
    isAvailable,
    isEnabled,
    isLoading,
    biometricType,
    authenticate,
    enable,
    disable,
    refresh: checkAvailability,
    authenticateForPayment,
    authenticateForSecretAccess,
  };
}
