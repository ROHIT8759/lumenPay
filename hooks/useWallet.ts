import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createInternalWallet } from '@/app/actions/wallet';
import { isConnected, getAddress, requestAccess } from "@stellar/freighter-api";

export type WalletType = 'internal' | 'freighter' | null;

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [walletType, setWalletType] = useState<WalletType>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        
        const savedType = localStorage.getItem('walletType') as WalletType;
        if (savedType === 'freighter') {
            checkFreighter();
        } else if (savedType === 'internal') {
            fetchInternalWallet();
        } else {
            setLoading(false);
        }
    }, []);

    
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
        } catch (e: any) {
            setError(e.message || "Failed to connect Freighter");
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
        syncInternal,
        disconnect
    };
}
