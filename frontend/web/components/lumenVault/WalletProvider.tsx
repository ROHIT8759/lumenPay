'use client';



import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    secureStorage,
    walletAuth,
    networkProvider,
    permissionManager,
    mobileStorage,
    biometricAuth
} from '@/lib/lumenVault';
import { WalletData, getKeypairFromWallet } from '@/lib/lumenVault/keyManager';

interface WalletContextType {

    isInitialized: boolean;
    hasWallet: boolean;
    isUnlocked: boolean;
    isAuthenticating: boolean;
    publicKey: string | null;
    network: 'testnet' | 'public';
    balances: any;


    refreshState: () => Promise<void>;
    lockWallet: () => Promise<void>;
    unlockWithPassphrase: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
    switchNetwork: (network: 'testnet' | 'public') => void;
    signInWithWallet: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => void;


    biometricsAvailable: boolean;
    biometricsEnabled: boolean;
    enableBiometrics: () => Promise<{ success: boolean; error?: string }>;
    disableBiometrics: () => Promise<void>;
    unlockWithBiometrics: () => Promise<{ success: boolean; error?: string }>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

interface WalletProviderProps {
    children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasWallet, setHasWallet] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [network, setNetwork] = useState<'testnet' | 'public'>('testnet');
    const [balances, setBalances] = useState<any>({ native: '0', usdc: '0', assets: [] });


    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const [biometricsEnabled, setBiometricsEnabled] = useState(false);


    useEffect(() => {
        initWallet();
    }, []);

    const initWallet = async () => {
        try {

            const ids = await secureStorage.getAllWalletIds();
            setHasWallet(ids.length > 0);


            const settings = await secureStorage.getSettings();
            setNetwork(settings.network);
            networkProvider.switchNetwork(settings.network);


            const unlocked = await secureStorage.isUnlocked();
            setIsUnlocked(unlocked);

            if (unlocked) {
                const session = await secureStorage.getSession();
                if (session) {
                    setPublicKey(session.publicKey);
                    fetchBalances(session.publicKey);
                }
            }


            const bioAvail = await biometricAuth.isAvailable();
            setBiometricsAvailable(bioAvail.available);

            const bioEnabled = await biometricAuth.isEnabled();
            setBiometricsEnabled(bioEnabled);

        } catch (error) {
            console.error('Wallet initialization error:', error);
        } finally {
            setIsInitialized(true);
        }
    };

    const fetchBalances = async (pubKey: string) => {
        try {
            const result = await networkProvider.getAccountBalances(pubKey);
            setBalances(result.balances || { native: '0', usdc: '0', assets: [] });
        } catch (error) {
            console.error('Failed to fetch balances:', error);
        }
    };

    const refreshState = async () => {
        await initWallet();
    };

    const lockWallet = async () => {
        await secureStorage.clearSession();
        setIsUnlocked(false);
        setPublicKey(null);
        setBalances({ native: '0', usdc: '0', assets: [] });
    };

    const unlockWithPassphrase = async (passphrase: string): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!hasWallet) return { success: false, error: 'No wallet found' };

            const ids = await secureStorage.getAllWalletIds();
            const walletId = ids[0];

            if (!walletId) return { success: false, error: 'No wallet ID found' };


            const walletData = await secureStorage.getWallet(walletId);
            if (!walletData) return { success: false, error: 'Wallet data not found' };

            try {
                // Verify passphrase and sign in to backend
                const authResult = await walletAuth.signIn(walletData, passphrase);
                if (!authResult.success) {
                    throw new Error(authResult.error || 'Authentication failed');
                }
            } catch (e) {
                return { success: false, error: 'Invalid passphrase' };
            }


            await secureStorage.storeSession(walletData.publicKey);

            setIsUnlocked(true);
            setPublicKey(walletData.publicKey);
            fetchBalances(walletData.publicKey);

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const switchNetwork = async (newNetwork: 'testnet' | 'public') => {
        setNetwork(newNetwork);
        networkProvider.switchNetwork(newNetwork);


        const settings = await secureStorage.getSettings();
        await secureStorage.storeSettings({ ...settings, network: newNetwork });


        if (publicKey) {
            fetchBalances(publicKey);
        }
    };

    const signInWithWallet = async (passphrase: string): Promise<{ success: boolean; error?: string }> => {
        setIsAuthenticating(true);
        try {
            const ids = await secureStorage.getAllWalletIds();
            const walletId = ids[0];
            if (!walletId) throw new Error('No wallet found');

            const walletData = await secureStorage.getWallet(walletId);
            if (!walletData) throw new Error('Wallet data missing');

            const result = await walletAuth.signIn(walletData, passphrase);
            return result;
        } catch (error: any) {
            return { success: false, error: error.message };
        } finally {
            setIsAuthenticating(false);
        }
    };

    const signOut = () => {
        walletAuth.signOut();
        lockWallet();
    };

    const unlockWithBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
        if (!biometricsEnabled) {
            return { success: false, error: 'Biometrics not enabled' };
        }

        const authResult = await biometricAuth.authenticate();
        if (!authResult.success) {
            return authResult;
        }


        const ids = await secureStorage.getAllWalletIds();
        const walletId = ids[0];
        if (!walletId) return { success: false, error: 'No wallet found' };

        const walletData = await secureStorage.getWallet(walletId);
        if (!walletData) return { success: false, error: 'Wallet data missing' };


        await secureStorage.storeSession(walletData.publicKey);

        setIsUnlocked(true);
        setPublicKey(walletData.publicKey);
        fetchBalances(walletData.publicKey);

        return { success: true };
    };

    const enableBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
        const result = await biometricAuth.enableBiometric();
        if (result.success) {
            setBiometricsEnabled(true);
        }
        return result;
    };

    const disableBiometrics = async (): Promise<void> => {
        await biometricAuth.disableBiometric();
        setBiometricsEnabled(false);
    };

    return (
        <WalletContext.Provider
            value={{
                isInitialized,
                hasWallet,
                isUnlocked,
                isAuthenticating,
                publicKey,
                network,
                balances,
                refreshState,
                lockWallet,
                unlockWithPassphrase,
                switchNetwork,
                signInWithWallet,
                signOut,
                biometricsAvailable,
                biometricsEnabled,
                enableBiometrics,
                disableBiometrics,
                unlockWithBiometrics
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}
