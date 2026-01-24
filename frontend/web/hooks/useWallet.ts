import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isConnected, getAddress, requestAccess } from "@stellar/freighter-api";
import { walletAuth } from '@/lib/lumenVault/walletAuth';

export type WalletType = 'lumenvault' | 'freighter' | 'internal' | null;

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [walletType, setWalletType] = useState<WalletType>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const savedType = localStorage.getItem('walletType') as WalletType;
        if (savedType === 'lumenvault') {
            checkLumenVault();
        } else if (savedType === 'freighter') {
            checkFreighter();
        } else if (savedType === 'internal') {
            fetchInternalWallet();
        } else {
            setLoading(false);
        }
    }, []);

    const checkLumenVault = async () => {
        try {
            const session = walletAuth.getSession();
            if (session) {
                setAddress(session.address);
                setWalletType('lumenvault');
            } else {
                localStorage.removeItem('walletType');
            }
        } catch (e) {
            console.error("LumenVault check failed", e);
        } finally {
            setLoading(false);
        }
    };

    const connectLumenVault = async (passphrase: string) => {
        setLoading(true);
        setError(null);
        try {
            const stored = localStorage.getItem('lumenvault_wallet');
            if (!stored) {
                setError("No wallet found. Please import from mobile.");
                return false;
            }

            const walletData = JSON.parse(stored);
            const result = await walletAuth.signIn(walletData, passphrase);

            if (result.success && result.session) {
                setAddress(result.session.address);
                setWalletType('lumenvault');
                localStorage.setItem('walletType', 'lumenvault');
                return true;
            } else {
                setError(result.error || "Authentication failed");
                return false;
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Connection failed");
            return false;
        } finally {
            setLoading(false);
        }
    };


    const checkFreighter = async () => {
        try {
            const connected = await isConnected();
            if (connected.isConnected) {
                const addressResult = await getAddress();
                if (addressResult.error) {
                    console.error("Failed to get address", addressResult.error);
                } else {
                    setAddress(addressResult.address);
                    setWalletType('freighter');
                }
            }
        } catch (e) {
            console.error("Freighter check failed", e);
        } finally {
            setLoading(false);
        }
    };

    const connectFreighter = async () => {
        setLoading(true);
        setError(null);
        try {
            const checkConnection = async () => {
                const timeout = new Promise<{ isConnected: boolean }>((resolve) => setTimeout(() => resolve({ isConnected: false }), 2000));

                const connection = isConnected();
                return Promise.race([connection, timeout]);
            };

            const connected = await checkConnection();

            if (!connected.isConnected) {

                setError("Freighter not detected. Please install it.");
                return false;
            }
            const accessResult = await requestAccess();
            if (accessResult.error) {
                setError(accessResult.error as string);
                return false;
            }
            setAddress(accessResult.address);
            setWalletType('freighter');
            localStorage.setItem('walletType', 'freighter');
            return true;
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to connect Freighter");
            return false;
        } finally {
            setLoading(false);
        }
    };


    const fetchInternalWallet = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return false;
            }

            const { data: wallet } = await supabase
                .from('wallets')
                .select('public_key')
                .eq('user_id', user.id)
                .single();

            if (wallet) {
                setAddress(wallet.public_key);
                setWalletType('internal');
                localStorage.setItem('walletType', 'internal');
                return true;
            }
        } catch (e) {
            console.error("Fetch wallet error", e);
        } finally {
            setLoading(false);
        }
        return false;
    };



    const syncInternal = async () => {
        return await fetchInternalWallet();
    }

    const disconnect = async () => {
        setAddress(null);
        setWalletType(null);
        localStorage.removeItem('walletType');
        await supabase.auth.signOut();
    }

    return {
        address,
        walletType,
        loading,
        error,
        connectFreighter,
        connectLumenVault,
        syncInternal,
        disconnect
    };
}
