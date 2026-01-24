import { useState, useEffect, useCallback } from 'react';
import { biometricAuth, BiometricAuthResult, BiometricAvailabilityResult } from '../lib/biometricAuth';
import * as LocalAuthentication from 'expo-local-authentication';

interface UseBiometricsReturn {
    
    isAvailable: boolean;
    isEnabled: boolean;
    isLoading: boolean;
    biometricType: string;

    
    authenticate: (message?: string) => Promise<BiometricAuthResult>;
    enable: () => Promise<BiometricAuthResult>;
    disable: () => Promise<void>;
    refresh: () => Promise<void>;

    
    authenticateForPayment: (amount: string, recipient: string) => Promise<BiometricAuthResult>;
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
            const availability = await biometricAuth.isAvailable();
            setIsAvailable(availability.available);

            if (availability.available) {
                setBiometricType(biometricAuth.getBiometricTypeName(availability.biometricTypes));
            }

            const enabled = await biometricAuth.isEnabled();
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

    const authenticate = useCallback(async (message?: string): Promise<BiometricAuthResult> => {
        return biometricAuth.authenticate(message);
    }, []);

    const enable = useCallback(async (): Promise<BiometricAuthResult> => {
        const result = await biometricAuth.enable();
        if (result.success) {
            setIsEnabled(true);
        }
        return result;
    }, []);

    const disable = useCallback(async (): Promise<void> => {
        await biometricAuth.disable();
        setIsEnabled(false);
    }, []);

    const authenticateForPayment = useCallback(async (amount: string, recipient: string): Promise<BiometricAuthResult> => {
        return biometricAuth.authenticateForTransaction(amount, recipient);
    }, []);

    const authenticateForSecretAccess = useCallback(async (): Promise<BiometricAuthResult> => {
        return biometricAuth.authenticateForSecretAccess();
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
