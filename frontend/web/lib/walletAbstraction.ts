

import { supabase } from './supabaseClient';
import {
    Keypair,
    TransactionBuilder,
    Networks,
    Operation,
    Asset,
    Memo,
    Horizon,
    BASE_FEE,
} from '@stellar/stellar-sdk';

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const HORIZON_PUBLIC = 'https://horizon.stellar.org';

export type NetworkType = 'testnet' | 'public';

export interface BuildTransactionParams {
    sourcePublicKey: string;
    destinationPublicKey: string;
    amount: string;
    assetCode?: string;
    assetIssuer?: string;
    memo?: string;
}

export interface TransactionMetadata {
    fee: string;
    sequence: string;
    expiration: number;
    network: NetworkType;
}

class WalletAbstraction {
    private network: NetworkType;
    private horizonServer: Horizon.Server;

    constructor(network: NetworkType = 'testnet') {
        this.network = network;
        const url = network === 'testnet' ? HORIZON_TESTNET : HORIZON_PUBLIC;
        this.horizonServer = new Horizon.Server(url);
    }

    
    setNetwork(network: NetworkType): void {
        this.network = network;
        const url = network === 'testnet' ? HORIZON_TESTNET : HORIZON_PUBLIC;
        this.horizonServer = new Horizon.Server(url);
    }

    
    getNetworkPassphrase(): string {
        return this.network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
    }

    
    async buildPaymentTransaction(params: BuildTransactionParams): Promise<{
        xdr: string;
        metadata: TransactionMetadata;
        error?: string;
    }> {
        try {
            const {
                sourcePublicKey,
                destinationPublicKey,
                amount,
                assetCode,
                assetIssuer,
                memo,
            } = params;

            
            try {
                Keypair.fromPublicKey(sourcePublicKey);
                Keypair.fromPublicKey(destinationPublicKey);
            } catch {
                throw new Error('Invalid Stellar address format');
            }

            
            const sourceAccount = await this.horizonServer.loadAccount(sourcePublicKey);

            
            let asset: Asset;
            if (!assetCode || assetCode === 'XLM' || assetCode === 'native') {
                asset = Asset.native();
            } else {
                if (!assetIssuer) {
                    throw new Error('Asset issuer required for non-native assets');
                }
                asset = new Asset(assetCode, assetIssuer);
            }

            
            const builder = new TransactionBuilder(sourceAccount, {
                fee: BASE_FEE,
                networkPassphrase: this.getNetworkPassphrase(),
            });

            
            if (memo) {
                builder.addMemo(Memo.text(memo.slice(0, 28))); 
            }

            
            builder.addOperation(
                Operation.payment({
                    destination: destinationPublicKey,
                    asset,
                    amount,
                })
            );

            
            builder.setTimeout(300);

            const transaction = builder.build();

            return {
                xdr: transaction.toXDR(),
                metadata: {
                    fee: BASE_FEE,
                    sequence: sourceAccount.sequenceNumber(),
                    expiration: Date.now() + 300000, 
                    network: this.network,
                },
            };
        } catch (error: any) {
            return {
                xdr: '',
                metadata: {
                    fee: '0',
                    sequence: '0',
                    expiration: 0,
                    network: this.network,
                },
                error: error.message || 'Failed to build transaction',
            };
        }
    }

    
    async submitSignedTransaction(signedXdr: string): Promise<{
        hash: string;
        ledger: number;
        error?: string;
    }> {
        try {
            
            const transaction = TransactionBuilder.fromXDR(
                signedXdr,
                this.getNetworkPassphrase()
            );

            
            const result = await this.horizonServer.submitTransaction(transaction);

            return {
                hash: result.hash,
                ledger: result.ledger,
            };
        } catch (error: any) {
            
            let errorMessage = 'Transaction submission failed';

            if (error.response?.data?.extras?.result_codes) {
                const codes = error.response.data.extras.result_codes;
                errorMessage = `${codes.transaction || ''} ${codes.operations?.join(', ') || ''}`.trim();
            } else if (error.message) {
                errorMessage = error.message;
            }

            return {
                hash: '',
                ledger: 0,
                error: errorMessage,
            };
        }
    }

    
    async getBalances(publicKey: string): Promise<{
        native: string;
        usdc: string;
        assets: Array<{ code: string; issuer: string; balance: string }>;
        error?: string;
    }> {
        try {
            const account = await this.horizonServer.loadAccount(publicKey);

            let native = '0';
            let usdc = '0';
            const assets: Array<{ code: string; issuer: string; balance: string }> = [];

            for (const balance of account.balances) {
                if (balance.asset_type === 'native') {
                    native = balance.balance;
                } else if (
                    balance.asset_type === 'credit_alphanum4' ||
                    balance.asset_type === 'credit_alphanum12'
                ) {
                    if (balance.asset_code === 'USDC') {
                        usdc = balance.balance;
                    }
                    assets.push({
                        code: balance.asset_code,
                        issuer: balance.asset_issuer,
                        balance: balance.balance,
                    });
                }
            }

            return { native, usdc, assets };
        } catch (error: any) {
            if (error.response?.status === 404) {
                return {
                    native: '0',
                    usdc: '0',
                    assets: [],
                    error: 'Account not found on network',
                };
            }
            return {
                native: '0',
                usdc: '0',
                assets: [],
                error: error.message,
            };
        }
    }

    
    async accountExists(publicKey: string): Promise<boolean> {
        try {
            await this.horizonServer.loadAccount(publicKey);
            return true;
        } catch {
            return false;
        }
    }

    
    async fundTestnetAccount(publicKey: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        if (this.network !== 'testnet') {
            return { success: false, error: 'Friendbot only available on testnet' };
        }

        try {
            const response = await fetch(
                `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
            );

            if (!response.ok) {
                throw new Error('Friendbot request failed');
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    
    async getTransactionHistory(
        publicKey: string,
        limit: number = 20
    ): Promise<{
        transactions: any[];
        error?: string;
    }> {
        try {
            const transactions = await this.horizonServer
                .transactions()
                .forAccount(publicKey)
                .order('desc')
                .limit(limit)
                .call();

            return {
                transactions: transactions.records.map((tx: any) => ({
                    id: tx.id,
                    hash: tx.hash,
                    createdAt: tx.created_at,
                    sourceAccount: tx.source_account,
                    successful: tx.successful,
                    feeCharged: tx.fee_charged,
                    memo: tx.memo,
                    memoType: tx.memo_type,
                })),
            };
        } catch (error: any) {
            return {
                transactions: [],
                error: error.message,
            };
        }
    }

    
    async registerWallet(
        userId: string,
        publicKey: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            
            const { data: existing } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (existing) {
                
                const { error } = await supabase
                    .from('wallets')
                    .update({
                        public_key: publicKey,
                        wallet_type: 'non_custodial',
                        is_external: true,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);

                if (error) throw error;
            } else {
                
                const { error } = await supabase.from('wallets').insert({
                    user_id: userId,
                    public_key: publicKey,
                    wallet_type: 'non_custodial',
                    is_external: true,
                    encrypted_secret: null, 
                    encryption_iv: null,
                });

                if (error) throw error;
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    
    async getRegisteredWallet(
        userId: string
    ): Promise<{ publicKey: string | null; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('public_key')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return { publicKey: null }; 
                }
                throw error;
            }

            return { publicKey: data.public_key };
        } catch (error: any) {
            return { publicKey: null, error: error.message };
        }
    }
}

// Lazy initialization to prevent client-side instantiation errors
let _walletAbstractionInstance: WalletAbstraction | null = null;

export const walletAbstraction = {
    get instance(): WalletAbstraction {
        if (!_walletAbstractionInstance) {
            _walletAbstractionInstance = new WalletAbstraction('testnet');
        }
        return _walletAbstractionInstance;
    },
    // Proxy methods
    setNetwork: (network: NetworkType) => walletAbstraction.instance.setNetwork(network),
    getNetworkPassphrase: () => walletAbstraction.instance.getNetworkPassphrase(),
    buildPaymentTransaction: (...args: Parameters<WalletAbstraction['buildPaymentTransaction']>) => 
        walletAbstraction.instance.buildPaymentTransaction(...args),
    submitSignedTransaction: (...args: Parameters<WalletAbstraction['submitSignedTransaction']>) => 
        walletAbstraction.instance.submitSignedTransaction(...args),
    getBalances: (...args: Parameters<WalletAbstraction['getBalances']>) => 
        walletAbstraction.instance.getBalances(...args),
    accountExists: (...args: Parameters<WalletAbstraction['accountExists']>) => 
        walletAbstraction.instance.accountExists(...args),
    getTransactionHistory: (...args: Parameters<WalletAbstraction['getTransactionHistory']>) => 
        walletAbstraction.instance.getTransactionHistory(...args),
    fundTestnetAccount: (...args: Parameters<WalletAbstraction['fundTestnetAccount']>) => 
        walletAbstraction.instance.fundTestnetAccount(...args),
    registerWallet: (...args: Parameters<WalletAbstraction['registerWallet']>) => 
        walletAbstraction.instance.registerWallet(...args),
    getRegisteredWallet: (...args: Parameters<WalletAbstraction['getRegisteredWallet']>) => 
        walletAbstraction.instance.getRegisteredWallet(...args),
};
