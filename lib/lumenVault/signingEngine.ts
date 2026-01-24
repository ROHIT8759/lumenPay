

import {
    Keypair,
    Transaction,
    FeeBumpTransaction,
    Networks,
} from '@stellar/stellar-sdk';
import { getKeypairFromWallet, WalletData } from './keyManager';
import { secureStorage } from './secureStorage';

export interface SignTransactionParams {
    xdr: string;
    walletData: WalletData;
    passphrase: string;
    network: 'testnet' | 'public';
}

export interface SignMessageParams {
    message: string;
    walletData: WalletData;
    passphrase: string;
}

export interface SignedTransaction {
    signedXDR: string;
    hash: string;
}

export interface SignedMessage {
    signature: string;
    publicKey: string;
    message: string;
}

class SigningEngineService {
    
    async signTransaction(params: SignTransactionParams): Promise<{
        signedTransaction: SignedTransaction;
        error?: string;
    }> {
        try {
            const { xdr, walletData, passphrase, network } = params;

            
            const keypair = await getKeypairFromWallet(walletData, passphrase);

            
            const networkPassphrase =
                network === 'testnet'
                    ? Networks.TESTNET
                    : Networks.PUBLIC;

            
            const transaction = new Transaction(xdr, networkPassphrase);

            
            transaction.sign(keypair);

            
            const signedXDR = transaction.toXDR();
            const hash = transaction.hash().toString('hex');

            return {
                signedTransaction: {
                    signedXDR,
                    hash,
                },
            };
        } catch (error: any) {
            return {
                signedTransaction: {
                    signedXDR: '',
                    hash: '',
                },
                error: error.message || 'Failed to sign transaction',
            };
        }
    }

    
    async signMessage(params: SignMessageParams): Promise<{
        signedMessage: SignedMessage;
        error?: string;
    }> {
        try {
            const { message, walletData, passphrase } = params;

            
            const keypair = await getKeypairFromWallet(walletData, passphrase);

            
            const messageBuffer = Buffer.from(message, 'utf8');

            
            const signature = keypair.sign(messageBuffer);

            return {
                signedMessage: {
                    signature: signature.toString('base64'),
                    publicKey: keypair.publicKey(),
                    message,
                },
            };
        } catch (error: any) {
            return {
                signedMessage: {
                    signature: '',
                    publicKey: '',
                    message: '',
                },
                error: error.message || 'Failed to sign message',
            };
        }
    }

    
    verifyMessageSignature(params: {
        message: string;
        signature: string;
        publicKey: string;
    }): boolean {
        try {
            const { message, signature, publicKey } = params;

            
            const keypair = Keypair.fromPublicKey(publicKey);

            
            const messageBuffer = Buffer.from(message, 'utf8');
            const signatureBuffer = Buffer.from(signature, 'base64');

            
            return keypair.verify(messageBuffer, signatureBuffer);
        } catch (error) {
            console.error('Signature verification failed:', error);
            return false;
        }
    }

    
    getTransactionDetails(xdr: string, network: 'testnet' | 'public'): {
        source: string;
        sequence: string;
        fee: string;
        operations: any[];
        memo?: string;
    } | null {
        try {
            const networkPassphrase =
                network === 'testnet'
                    ? Networks.TESTNET
                    : Networks.PUBLIC;

            const transaction = new Transaction(xdr, networkPassphrase);

            return {
                source: transaction.source,
                sequence: transaction.sequence,
                fee: transaction.fee,
                operations: transaction.operations.map((op: any) => ({
                    type: op.type,
                    ...op,
                })),
                memo: transaction.memo?.value?.toString(),
            };
        } catch (error) {
            console.error('Failed to get transaction details:', error);
            return null;
        }
    }

    
    async canSign(): Promise<boolean> {
        return await secureStorage.isUnlocked();
    }

    
    async signTransactionWithSession(
        xdr: string,
        network: 'testnet' | 'public'
    ): Promise<{
        signedTransaction: SignedTransaction;
        error?: string;
    }> {
        try {
            
            const session = await secureStorage.getSession();
            if (!session) {
                throw new Error('No active session - wallet is locked');
            }

            
            const walletData = await secureStorage.getWallet(session.publicKey);
            if (!walletData) {
                throw new Error('Wallet not found');
            }

            
            
            
            throw new Error('Session-based signing requires passphrase');
        } catch (error: any) {
            return {
                signedTransaction: {
                    signedXDR: '',
                    hash: '',
                },
                error: error.message,
            };
        }
    }
}


export const signingEngine = new SigningEngineService();
