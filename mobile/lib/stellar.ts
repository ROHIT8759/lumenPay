import { Horizon, Keypair, Networks, TransactionBuilder, Asset, Operation } from '@stellar/stellar-sdk';
import * as SecureStore from 'expo-secure-store';


const STELLAR_RPC = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

const server = new Horizon.Server(STELLAR_RPC);


export const saveKeys = async (secret: string) => {
    await SecureStore.setItemAsync('stellar_secret', secret);
};

export const getKeys = async () => {
    return await SecureStore.getItemAsync('stellar_secret');
};

export const clearKeys = async () => {
    await SecureStore.deleteItemAsync('stellar_secret');
};




export const createWallet = async () => {
    const pair = Keypair.random();
    await saveKeys(pair.secret());

    
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


export const sendPayment = async (
    recipientId: string,
    amount: string,
    assetCode?: string,
    assetIssuer?: string
) => {
    const signerKey = await loadWallet();
    if (!signerKey) throw new Error('No wallet found');

    const source = await server.loadAccount(signerKey.publicKey());

    let asset = Asset.native();
    if (assetCode && assetIssuer) {
        asset = new Asset(assetCode, assetIssuer);
    }

    const tx = new TransactionBuilder(source, {
        fee: '100', 
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(Operation.payment({
            destination: recipientId,
            asset: asset,
            amount: amount,
        }))
        .setTimeout(30)
        .build();

    tx.sign(signerKey);

    try {
        const result = await server.submitTransaction(tx);
        return { success: true, hash: result.hash };
    } catch (e: any) {
        console.error('Payment failed:', e.response?.data?.extras?.result_codes || e.message);
        throw new Error('Payment failed');
    }
};
