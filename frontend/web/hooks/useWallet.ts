import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Simplified wallet hook for custodial-only wallet system
 * No external wallet connections - all wallets are managed server-side
 */
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
        try {
            await supabase.auth.signOut();
            setAddress(null);
            setUser(null);
        } catch (e: any) {
            setError(e.message || "Failed to sign out");
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
