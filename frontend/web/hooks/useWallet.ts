import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { walletAuth } from '@/lib/lumenVault/walletAuth';

export type WalletType = 'lumenvault' | 'internal' | null;

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [walletType, setWalletType] = useState<WalletType>(null);

    useEffect(() => {
        checkAuth();
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                await fetchCustodialWallet(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setAddress(null);
                setUser(null);
                setWalletType(null);
            }
        });

        // Check for LumenVault session
        const lumenVaultSession = walletAuth.getSession();
        if (lumenVaultSession) {
            setAddress(lumenVaultSession.address);
            setWalletType('lumenvault');
        }

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

            const data = await response.json();

            // Handle database not configured error gracefully
            if (!response.ok) {
                if (data.error?.includes('Database') || data.error?.includes('table')) {
                    console.warn('Database not configured - wallet features limited');
                    return; // Don't show error to user
                }
                throw new Error(data.error || 'Failed to fetch wallet');
            }
            
            if (data.publicKey || data.address) {
                setAddress(data.publicKey || data.address);
                setWalletType('internal');
            }
        } catch (e: any) {
            // Only log, don't show error for database issues
            console.warn("Wallet service unavailable:", e.message);
        } finally {
            setLoading(false);
        }
    };

    const connectLumenVault = (walletAddress: string) => {
        setAddress(walletAddress);
        setWalletType('lumenvault');
        setError(null);
    };

    const disconnect = async () => {
        setLoading(true);
        setError(null);
        try {
            // Sign out from LumenVault if connected
            if (walletType === 'lumenvault') {
                walletAuth.signOut();
            }
            
            // Sign out from Supabase
            await supabase.auth.signOut();
            
            setAddress(null);
            setUser(null);
            setWalletType(null);
            return true;
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to disconnect");
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
        walletType,
        disconnect,
        connectLumenVault,
        isConnected: !!address,
    };
}
