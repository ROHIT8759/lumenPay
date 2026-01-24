import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isConnected, getAddress, requestAccess } from "@stellar/freighter-api";
import { walletAuth } from '@/lib/lumenVault/walletAuth';

export type WalletType = 'lumenvault' | 'freighter' | 'internal' | null;

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        checkAuth();
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                await fetchCustodialWallet(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setAddress(null);
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const checkAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                await fetchCustodialWallet(session.user.id);
            }
        } catch (e) {
            console.error("Auth check failed", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustodialWallet = async (userId: string) => {
        try {
            setLoading(true);
            setError(null);

            // Fetch or create wallet for user
            const response = await fetch('/api/wallet', {
                method: 'GET',
                headers: {
                    'x-user-id': userId,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch wallet');
            }

            const data = await response.json();
            
            if (data.publicKey || data.address) {
                setAddress(data.publicKey || data.address);
            }
        } catch (e: any) {
            console.error("Failed to fetch wallet", e);
            setError(e.message || "Failed to load wallet");
        } finally {
            setLoading(false);
        }
    };

    const disconnect = async () => {
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

    return {
        address,
        user,
        loading,
        error,
        disconnect,
        isConnected: !!address,
    };
}
