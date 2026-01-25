import { Keypair } from '@stellar/stellar-sdk';

type CacheEntry = {
  keypair: Keypair;
  expiresAt: number;
};

const unlockedKeypairs = new Map<string, CacheEntry>();

export function setUnlockedKeypair(publicKey: string, keypair: Keypair, expiresAt: number) {
  unlockedKeypairs.set(publicKey, { keypair, expiresAt });
}

export function getUnlockedKeypair(publicKey: string): Keypair | null {
  const entry = unlockedKeypairs.get(publicKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    unlockedKeypairs.delete(publicKey);
    return null;
  }
  return entry.keypair;
}

export function clearUnlockedKeypair(publicKey?: string) {
  if (publicKey) {
    unlockedKeypairs.delete(publicKey);
    return;
  }
  unlockedKeypairs.clear();
}

