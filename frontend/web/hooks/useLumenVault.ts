'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    generateKeypair,
    createWalletData,
    getKeypairFromWallet,
    WalletData,
} from '@/lib/lumenVault/keyManager';
import { signingEngine } from '@/lib/lumenVault/signingEngine';
import { walletAuth, AuthSession } from '@/lib/lumenVault/walletAuth';
import { NETWORK } from '@/lib/config';

export interface LumenVaultState {
    // Wallet state
    isInitialized: boolean;
    isLocked: boolean;
    publicKey: string | null;

    // Auth state
    isAuthenticated: boolean;
    session: AuthSession | null;

    // Loading states
    isCreating: boolean;
    isSigning: boolean;
    isAuthenticating: boolean;

    // Error state
    error: string | null;
}

export interface LumenVaultActions {
    // Wallet management
    createWallet: (passphrase: string) => Promise<{ publicKey: string } | null>;
    importWallet: (secretKey: string, passphrase: string) => Promise<{ publicKey: string } | null>;
    unlockWallet: (passphrase: string) => Promise<boolean>;
    lockWallet: () => void;
    deleteWallet: () => Promise<void>;

    // Authentication
    signIn: (passphrase: string) => Promise<boolean>;
    signOut: () => void;

    // Transaction signing
    signTransaction: (xdr: string, passphrase: string) => Promise<{ signedXdr: string; hash: string } | null>;

    // Utility
    clearError: () => void;
}

const WALLET_STORAGE_KEY = 'lumenvault_wallet';

export function useLumenVault(): [LumenVaultState, LumenVaultActions] {
    const [state, setState] = useState<LumenVaultState>({
        isInitialized: false,
        isLocked: true,
        publicKey: null,
        isAuthenticated: false,
        session: null,
        isCreating: false,
        isSigning: false,
        isAuthenticating: false,
        error: null,
    });

    const [walletData, setWalletData] = useState<WalletData | null>(null);

    // Initialize on mount
    useEffect(() => {
        initializeWallet();
    }, []);

    const initializeWallet = async () => {
        try {
            // Check for existing wallet in localStorage
            const stored = localStorage.getItem(WALLET_STORAGE_KEY);
            if (stored) {
                const data: WalletData = JSON.parse(stored);
                setWalletData(data);
                setState(prev => ({
                    ...prev,
                    isInitialized: true,
                    publicKey: data.publicKey,
                    isLocked: true, // Always start locked
                }));
            } else {
                setState(prev => ({ ...prev, isInitialized: true }));
            }

            // Check for existing auth session
            const session = walletAuth.getSession();
            if (session) {
                setState(prev => ({
                    ...prev,
                    isAuthenticated: true,
                    session,
                }));
            }
        } catch (error) {
            console.error('Failed to initialize wallet:', error);
            setState(prev => ({ ...prev, isInitialized: true }));
        }
    };

    const createWallet = useCallback(async (passphrase: string): Promise<{ publicKey: string } | null> => {
        setState(prev => ({ ...prev, isCreating: true, error: null }));

        try {
            // Generate new keypair
            const keypair = generateKeypair();

            // Create wallet data with encrypted secret
            const data = await createWalletData(keypair, passphrase);

            // Store in localStorage
            localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(data));

            setWalletData(data);
            setState(prev => ({
                ...prev,
                isCreating: false,
                publicKey: data.publicKey,
                isLocked: false,
            }));

            return { publicKey: data.publicKey };
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isCreating: false,
                error: error instanceof Error ? error.message : 'Failed to create wallet',
            }));
            return null;
        }
    }, []);

    const importWallet = useCallback(async (
        secretKey: string,
        passphrase: string
    ): Promise<{ publicKey: string } | null> => {
        setState(prev => ({ ...prev, isCreating: true, error: null }));

        try {
            // Import keypair from secret
            const { importKeypair } = await import('@/lib/lumenVault/keyManager');
            const keypair = importKeypair(secretKey);

            // Create wallet data
            const data = await createWalletData(keypair, passphrase);

            // Store in localStorage
            localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(data));

            setWalletData(data);
            setState(prev => ({
                ...prev,
                isCreating: false,
                publicKey: data.publicKey,
                isLocked: false,
            }));

            return { publicKey: data.publicKey };
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isCreating: false,
                error: error instanceof Error ? error.message : 'Failed to import wallet',
            }));
            return null;
        }
    }, []);

    const unlockWallet = useCallback(async (passphrase: string): Promise<boolean> => {
        if (!walletData) {
            setState(prev => ({ ...prev, error: 'No wallet found' }));
            return false;
        }

        try {
            // Try to decrypt - will throw if wrong passphrase
            await getKeypairFromWallet(walletData, passphrase);

            setState(prev => ({ ...prev, isLocked: false, error: null }));
            return true;
        } catch (_error: unknown) {
            setState(prev => ({
                ...prev,
                error: 'Invalid passphrase',
            }));
            return false;
        }
    }, [walletData]);

    const lockWallet = useCallback(() => {
        setState(prev => ({ ...prev, isLocked: true }));
    }, []);

    const deleteWallet = useCallback(async () => {
        localStorage.removeItem(WALLET_STORAGE_KEY);
        walletAuth.signOut();
        setWalletData(null);
        setState({
            isInitialized: true,
            isLocked: true,
            publicKey: null,
            isAuthenticated: false,
            session: null,
            isCreating: false,
            isSigning: false,
            isAuthenticating: false,
            error: null,
        });
    }, []);

    const signIn = useCallback(async (passphrase: string): Promise<boolean> => {
        if (!walletData) {
            setState(prev => ({ ...prev, error: 'No wallet found' }));
            return false;
        }

        setState(prev => ({ ...prev, isAuthenticating: true, error: null }));

        try {
            const result = await walletAuth.signIn(walletData, passphrase);

            if (!result.success) {
                throw new Error(result.error || 'Authentication failed');
            }

            setState(prev => ({
                ...prev,
                isAuthenticating: false,
                isAuthenticated: true,
                isLocked: false,
                session: result.session!,
            }));

            return true;
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isAuthenticating: false,
                error: error instanceof Error ? error.message : 'Authentication failed',
            }));
            return false;
        }
    }, [walletData]);

    const signOut = useCallback(() => {
        walletAuth.signOut();
        setState(prev => ({
            ...prev,
            isAuthenticated: false,
            session: null,
            isLocked: true,
        }));
    }, []);

    const signTransaction = useCallback(async (
        xdr: string,
        passphrase: string
    ): Promise<{ signedXdr: string; hash: string } | null> => {
        if (!walletData) {
            setState(prev => ({ ...prev, error: 'No wallet found' }));
            return null;
        }

        setState(prev => ({ ...prev, isSigning: true, error: null }));

        try {
            const result = await signingEngine.signTransaction({
                xdr,
                walletData,
                passphrase,
                network: NETWORK.CURRENT,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            setState(prev => ({ ...prev, isSigning: false }));

            return {
                signedXdr: result.signedTransaction.signedXDR,
                hash: result.signedTransaction.hash,
            };
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isSigning: false,
                error: error instanceof Error ? error.message : 'Failed to sign transaction',
            }));
            return null;
        }
    }, [walletData]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const actions: LumenVaultActions = {
        createWallet,
        importWallet,
        unlockWallet,
        lockWallet,
        deleteWallet,
        signIn,
        signOut,
        signTransaction,
        clearError,
    };

    return [state, actions];
}
