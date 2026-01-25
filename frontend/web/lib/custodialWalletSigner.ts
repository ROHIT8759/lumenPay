/**
 * Custodial Wallet Signing Service
 * Handles transaction signing using encrypted private keys stored in the database
 */

import { supabase } from './supabaseClient';
import { decryptKey } from './encryption';
import { Keypair, Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';

export interface SigningResult {
  signedXdr: string;
  publicKey: string;
  error?: string;
}

/**
 * Signs a transaction using the user's custodial wallet
 * Retrieves encrypted private key from database, decrypts it, and signs
 */
export async function signTransactionWithCustodialWallet(
  userId: string,
  transactionXdr: string,
  networkPassphrase: string
): Promise<SigningResult> {
  try {
    // 1. Retrieve wallet from database
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('public_key, encrypted_secret, wallet_type, is_external')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found for user');
    }

    // 2. Check if wallet is custodial
    if (wallet.is_external || wallet.wallet_type === 'non_custodial') {
      throw new Error('Cannot sign with non-custodial wallet. User must sign with their own wallet.');
    }

    if (!wallet.encrypted_secret) {
      throw new Error('Custodial wallet private key not found');
    }

    // 3. Decrypt private key
    let secretKey: string;
    try {
      secretKey = decryptKey(wallet.encrypted_secret);
    } catch (decryptError: any) {
      console.error('Failed to decrypt wallet:', decryptError);
      throw new Error('Failed to decrypt wallet private key');
    }

    // 4. Create keypair from secret key
    let keypair: Keypair;
    try {
      keypair = Keypair.fromSecret(secretKey);
    } catch (keypairError: any) {
      console.error('Failed to create keypair:', keypairError);
      throw new Error('Invalid private key format');
    }

    // 5. Verify public key matches
    if (keypair.publicKey() !== wallet.public_key) {
      throw new Error('Public key mismatch - wallet integrity error');
    }

    // 6. Parse and sign transaction
    let transaction: Transaction | FeeBumpTransaction;
    try {
      transaction = new Transaction(transactionXdr, networkPassphrase);
    } catch {
      // Try as FeeBumpTransaction
      transaction = new FeeBumpTransaction(transactionXdr, networkPassphrase);
    }

    // Sign the transaction
    transaction.sign(keypair);

    // 7. Return signed XDR
    return {
      signedXdr: transaction.toXDR(),
      publicKey: keypair.publicKey(),
    };
  } catch (error: any) {
    console.error('Custodial wallet signing error:', error);
    return {
      signedXdr: '',
      publicKey: '',
      error: error.message || 'Failed to sign transaction',
    };
  }
}

/**
 * Gets the public key for a user's custodial wallet
 */
export async function getCustodialWalletPublicKey(userId: string): Promise<string | null> {
  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('public_key, wallet_type, is_external')
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return null;
    }

    // Only return public key if it's a custodial wallet
    if (wallet.is_external || wallet.wallet_type === 'non_custodial') {
      return null;
    }

    return wallet.public_key;
  } catch (error: any) {
    console.error('Error fetching custodial wallet:', error);
    return null;
  }
}

/**
 * Checks if a user has a custodial wallet set up
 */
export async function hasCustodialWallet(userId: string): Promise<boolean> {
  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('wallet_type, is_external, encrypted_secret')
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return false;
    }

    return (
      !wallet.is_external &&
      wallet.wallet_type === 'custodial' &&
      !!wallet.encrypted_secret
    );
  } catch {
    return false;
  }
}

/**
 * Creates a signing function for contract service
 * Returns a function that signs transactions using the custodial wallet
 */
export function createCustodialSigner(
  userId: string,
  networkPassphrase: string
): (xdr: string) => Promise<string> {
  return async (xdr: string): Promise<string> => {
    const result = await signTransactionWithCustodialWallet(userId, xdr, networkPassphrase);
    
    if (result.error || !result.signedXdr) {
      throw new Error(result.error || 'Failed to sign transaction');
    }
    
    return result.signedXdr;
  };
}
