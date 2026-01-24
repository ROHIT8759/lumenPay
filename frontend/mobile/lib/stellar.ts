import { Horizon, Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import * as SecureStore from 'expo-secure-store';

/**
 * @deprecated Use LumenVault Engine instead.
 * This module is kept for backward compatibility but should not be used in new code.
 */

const STELLAR_RPC = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

const server = new Horizon.Server(STELLAR_RPC);

// Key storage functions
/** @deprecated Use LumenVault.KeyManager */
export const saveKeys = async (secret: string) => {
    await SecureStore.setItemAsync('stellar_secret', secret);
};

/** @deprecated Use LumenVault.KeyManager */
export const getKeys = async () => {
    return await SecureStore.getItemAsync('stellar_secret');
};

/** @deprecated Use LumenVault.KeyManager */
export const clearKeys = async () => {
    await SecureStore.deleteItemAsync('stellar_secret');
};

// Wallet management
/** @deprecated Use LumenVault.createWallet() */
export const createWallet = async () => {
    const pair = Keypair.random();
    await saveKeys(pair.secret());

    // Attempt to fund via Friendbot
    try {
        await fetch(`https://friendbot.stellar.org?addr=${pair.publicKey()}`);
    } catch (e) {
        console.warn('Friendbot funding failed:', e);
    }

    return {
        publicKey: pair.publicKey(),
        secret: pair.secret(),
    };
};

/** @deprecated Use LumenVault.KeyManager.retrieveSecret() (Internal) */
export const loadWallet = async () => {
    const secret = await getKeys();
    if (!secret) return null;
    return Keypair.fromSecret(secret);
};

// Account queries (read-only, safe to call Horizon directly)
// This can remain as a helper for read-only data
export const getAccountDetails = async (publicKey: string) => {
    try {
        const account = await server.loadAccount(publicKey);

        const balances = account.balances.map((b: any) => ({
            asset_type: b.asset_type,
            balance: b.balance,
            asset_code: b.asset_code || 'XLM',
            asset_issuer: b.asset_issuer,
        }));

        return {
            id: account.id,
            balances,
            sequence: account.sequence,
        };
    } catch (e) {
        console.error('Error fetching account:', e);
        return null;
    }
};

/**
 * @deprecated Use LumenVault.signTransaction()
 */
export const signTransaction = async (unsignedXDR: string): Promise<string> => {
    const keypair = await loadWallet();
    if (!keypair) {
        throw new Error('No wallet found');
    }

    const transaction = new Transaction(unsignedXDR, NETWORK_PASSPHRASE);
    transaction.sign(keypair);

    return transaction.toXDR();
};

/**
 * @deprecated Use LumenVault.signMessage()
 */
export const signMessage = async (message: string): Promise<string> => {
    const keypair = await loadWallet();
    if (!keypair) {
        throw new Error('No wallet found');
    }

    const messageBuffer = Buffer.from(message, 'utf-8');
    const signature = keypair.sign(messageBuffer);

    return signature.toString('base64');
};
