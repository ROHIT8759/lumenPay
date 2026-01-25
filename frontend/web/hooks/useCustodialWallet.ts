/**
 * Custodial Wallet Hook
 * Provides easy access to custodial wallet functions from React components
 */

import { useState, useCallback } from 'react';
import { Networks } from '@stellar/stellar-sdk';

export interface CustodialWalletState {
  publicKey: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useCustodialWallet() {
  const [state, setState] = useState<CustodialWalletState>({
    publicKey: null,
    isLoading: false,
    error: null,
  });

  /**
   * Sign a transaction using the custodial wallet
   */
  const signTransaction = useCallback(
    async (transactionXdr: string, networkPassphrase: string = Networks.TESTNET): Promise<string> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Get auth token from localStorage or session
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Call server-side signing endpoint
        const response = await fetch('/api/wallet/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            transactionXdr,
            networkPassphrase,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to sign transaction');
        }

        const data = await response.json();
        
        setState((prev) => ({
          ...prev,
          publicKey: data.publicKey,
          isLoading: false,
        }));

        return data.signedXdr;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to sign transaction';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    []
  );

  /**
   * Get the public key of the custodial wallet
   */
  const getPublicKey = useCallback(async (): Promise<string | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/wallet?action=info', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallet info');
      }

      const data = await response.json();
      
      setState((prev) => ({
        ...prev,
        publicKey: data.publicKey,
        isLoading: false,
      }));

      return data.publicKey;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch public key';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  /**
   * Check if user has a custodial wallet
   */
  const hasCustodialWallet = useCallback(async (): Promise<boolean> => {
    try {
      const publicKey = await getPublicKey();
      return !!publicKey;
    } catch {
      return false;
    }
  }, [getPublicKey]);

  return {
    ...state,
    signTransaction,
    getPublicKey,
    hasCustodialWallet,
  };
}
