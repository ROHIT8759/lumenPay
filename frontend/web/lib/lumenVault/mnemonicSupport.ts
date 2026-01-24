import { Keypair } from '@stellar/stellar-sdk';
const WORD_COUNT_12 = 12;
const WORD_COUNT_24 = 24;
const STELLAR_PATH = "m/44'/148'/0'";
export function generateStellarMnemonic(wordCount: 12 | 24 = 12): string {
    const entropy = new Uint8Array(wordCount === 12 ? 16 : 32);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(entropy);
    } else {

        const crypto = require('crypto');
        const randomBytes = crypto.randomBytes(entropy.length);
        entropy.set(randomBytes);
    }

    const entropyHex = Array.from(entropy)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    const keypair = Keypair.random();
    return keypair.secret();
}
export function keypairFromMnemonic(mnemonic: string): Keypair {

    if (mnemonic.startsWith('S') && mnemonic.length === 56) {
        return Keypair.fromSecret(mnemonic);
    }
    throw new Error('BIP-39 word recovery requires bip39 library. For now, use secret key.');
}




export function validateMnemonic(mnemonic: string): { valid: boolean; error?: string } {
    const words = mnemonic.trim().split(/\s+/);


    if (mnemonic.startsWith('S') && mnemonic.length === 56) {
        try {
            Keypair.fromSecret(mnemonic);
            return { valid: true };
        } catch {
            return { valid: false, error: 'Invalid secret key' };
        }
    }


    if (words.length !== WORD_COUNT_12 && words.length !== WORD_COUNT_24) {
        return {
            valid: false,
            error: `Mnemonic must be ${WORD_COUNT_12} or ${WORD_COUNT_24} words`
        };
    }


    return { valid: true };
}




export function formatSecretForBackup(secretKey: string): string[] {

    const groups: string[] = [];
    for (let i = 0; i < secretKey.length; i += 4) {
        groups.push(secretKey.slice(i, i + 4));
    }
    return groups;
}




export interface WalletBackup {
    publicKey: string;
    secretKey: string;
    createdAt: string;
    network: 'testnet' | 'public';
}

export function createWalletBackup(
    keypair: Keypair,
    network: 'testnet' | 'public' = 'testnet'
): WalletBackup {
    return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        createdAt: new Date().toISOString(),
        network,
    };
}




export async function encryptBackupForTransfer(
    backup: WalletBackup,
    pin: string
): Promise<string> {
    const data = JSON.stringify(backup);


    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const pinBytes = encoder.encode(pin.padEnd(32, '0'));

    const encrypted = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
        encrypted[i] = dataBytes[i] ^ pinBytes[i % pinBytes.length];
    }


    return btoa(String.fromCharCode(...encrypted));
}




export async function decryptBackupFromTransfer(
    encryptedData: string,
    pin: string
): Promise<WalletBackup> {
    try {

        const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));


        const encoder = new TextEncoder();
        const pinBytes = encoder.encode(pin.padEnd(32, '0'));

        const decrypted = new Uint8Array(encrypted.length);
        for (let i = 0; i < encrypted.length; i++) {
            decrypted[i] = encrypted[i] ^ pinBytes[i % pinBytes.length];
        }

        const decoder = new TextDecoder();
        const data = decoder.decode(decrypted);

        return JSON.parse(data) as WalletBackup;
    } catch (error) {
        throw new Error('Failed to decrypt backup. Check your PIN.');
    }
}
