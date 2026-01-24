import { Horizon, Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import { SecureStorage } from './lumenvault/SecureStorage';

const STELLAR_RPC = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

const server = new Horizon.Server(STELLAR_RPC);

// Key storage functions
export const saveKeys = async (secret: string) => {
  await SecureStorage.setItem('stellar_secret', secret);
};

export const getKeys = async () => {
  return await SecureStorage.getItem('stellar_secret');
};

export const clearKeys = async () => {
  await SecureStorage.deleteItem('stellar_secret');
};

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

export const loadWallet = async () => {
  const secret = await getKeys();
  if (!secret) return null;
  return Keypair.fromSecret(secret);
};

// Account queries (read-only, safe to call Horizon directly)
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
 * Sign an unsigned transaction XDR
 * @param unsignedXDR Unsigned transaction XDR from backend
 * @returns Signed transaction XDR
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
 * Sign an arbitrary message (for authentication)
 * @param message Message to sign (typically a nonce)
 * @returns Base64-encoded signature
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
