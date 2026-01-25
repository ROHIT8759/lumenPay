'use client';

import { useWallet as useWalletContext } from '@/components/lumenVault/WalletProvider';

export type WalletType = 'lumenvault' | null;

export function useWallet() {
  const {
    isInitialized,
    publicKey,
    signOut,
  } = useWalletContext();

  return {
    address: publicKey,
    user: null,
    loading: !isInitialized,
    error: null,
    walletType: publicKey ? 'lumenvault' : null,
    disconnect: async () => {
      signOut();
      return true;
    },
    connectLumenVault: (_walletAddress: string) => {
    },
    isConnected: !!publicKey,
  };
}

