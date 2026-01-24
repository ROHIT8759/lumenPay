

import {
    Keypair,
    TransactionBuilder,
    Networks,
    Operation,
    Asset,
    BASE_FEE,
    Memo,
    MemoType,
    Account,
    Contract,
    SorobanRpc,
    xdr,
} from '@stellar/stellar-sdk';

export type NetworkType = 'testnet' | 'public';

export interface PaymentParams {
    sourcePublicKey: string;
    destinationPublicKey: string;
    amount: string;
    assetCode?: string; 
    assetIssuer?: string; 
    memo?: string;
}

export interface SorobanContractCallParams {
    sourcePublicKey: string;
    contractAddress: string;
    method: string;
    args?: xdr.ScVal[];
    memo?: string;
}

export interface TransactionMetadata {
    fee: string;
    operations: number;
    signers: string[];
    memo?: string;
    network: NetworkType;
}

class TransactionBuilderService {
    private network: NetworkType;
    private networkPassphrase: string;
    private horizonServer: any;

    constructor(network: NetworkType = 'testnet') {
        this.network = network;
        this.networkPassphrase =
            network === 'testnet'
                ? Networks.TESTNET
                : Networks.PUBLIC;
    }

    
    setHorizonServer(server: any): void {
        this.horizonServer = server;
    }

    
    switchNetwork(network: NetworkType): void {
        this.network = network;
        this.networkPassphrase =
            network === 'testnet'
                ? Networks.TESTNET
                : Networks.PUBLIC;
    }

    
    async buildPaymentTransaction(params: PaymentParams): Promise<{
        xdr: string;
        metadata: TransactionMetadata;
        error?: string;
    }> {
        try {
            if (!this.horizonServer) {
                throw new Error('Horizon server not initialized');
            }

            const { sourcePublicKey, destinationPublicKey, amount, assetCode, assetIssuer, memo } = params;

            
            const sourceAccount = await this.horizonServer
                .loadAccount(sourcePublicKey);

            
            const builder = new TransactionBuilder(sourceAccount, {
                fee: BASE_FEE,
                networkPassphrase: this.networkPassphrase,
            });

            
            if (memo) {
                builder.addMemo(Memo.text(memo));
            }

            
            let asset: Asset;
            if (!assetCode || assetCode === 'XLM') {
                asset = Asset.native();
            } else {
                if (!assetIssuer) {
                    throw new Error('Asset issuer required for non-native assets');
                }
                asset = new Asset(assetCode, assetIssuer);
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
                    operations: 1,
                    signers: [sourcePublicKey],
                    memo,
                    network: this.network,
                },
            };
        } catch (error: any) {
            return {
                xdr: '',
                metadata: {
                    fee: '0',
                    operations: 0,
                    signers: [],
                    network: this.network,
                },
                error: error.message || 'Failed to build payment transaction',
            };
        }
    }

    
    async buildContractCallTransaction(params: SorobanContractCallParams): Promise<{
        xdr: string;
        metadata: TransactionMetadata;
        error?: string;
    }> {
        try {
            if (!this.horizonServer) {
                throw new Error('Horizon server not initialized');
            }

            const { sourcePublicKey, contractAddress, method, args = [], memo } = params;

            
            const sourceAccount = await this.horizonServer
                .loadAccount(sourcePublicKey);

            
            const contract = new Contract(contractAddress);

            
            const builder = new TransactionBuilder(sourceAccount, {
                fee: BASE_FEE,
                networkPassphrase: this.networkPassphrase,
            });

            
            if (memo) {
                builder.addMemo(Memo.text(memo));
            }

            
            builder.addOperation(
                contract.call(method, ...args)
            );

            
            builder.setTimeout(300);

            
            const transaction = builder.build();

            return {
                xdr: transaction.toXDR(),
                metadata: {
                    fee: BASE_FEE,
                    operations: 1,
                    signers: [sourcePublicKey],
                    memo,
                    network: this.network,
                },
            };
        } catch (error: any) {
            return {
                xdr: '',
                metadata: {
                    fee: '0',
                    operations: 0,
                    signers: [],
                    network: this.network,
                },
                error: error.message || 'Failed to build contract call transaction',
            };
        }
    }

    
    async estimateFee(operationCount: number = 1): Promise<string> {
        
        
        return (parseInt(BASE_FEE) * operationCount).toString();
    }

    
    validateAddress(address: string): boolean {
        try {
            Keypair.fromPublicKey(address);
            return true;
        } catch {
            return false;
        }
    }

    
    parseTransactionXDR(xdr: string): {
        source: string;
        operations: any[];
        fee: string;
        memo?: string;
    } | null {
        try {
            const transaction = TransactionBuilder.fromXDR(xdr, this.networkPassphrase);

            return {
                source: transaction.source,
                operations: transaction.operations.map((op: any) => ({
                    type: op.type,
                    ...op,
                })),
                fee: transaction.fee,
                memo: transaction.memo ? transaction.memo.value?.toString() : undefined,
            };
        } catch (error) {
            console.error('Failed to parse transaction XDR:', error);
            return null;
        }
    }
}

// Lazy initialization for safety
let _transactionBuilderInstance: TransactionBuilderService | null = null;

export const transactionBuilder = {
    get instance(): TransactionBuilderService {
        if (!_transactionBuilderInstance) {
            _transactionBuilderInstance = new TransactionBuilderService();
        }
        return _transactionBuilderInstance;
    },
    // Proxy methods
    setHorizonServer: (server: any) => transactionBuilder.instance.setHorizonServer(server),
    switchNetwork: (network: NetworkType) => transactionBuilder.instance.switchNetwork(network),
    buildPaymentTransaction: (...args: Parameters<TransactionBuilderService['buildPaymentTransaction']>) => 
        transactionBuilder.instance.buildPaymentTransaction(...args),
    buildSorobanContractCall: (...args: Parameters<TransactionBuilderService['buildSorobanContractCall']>) => 
        transactionBuilder.instance.buildSorobanContractCall(...args),
    parseTransactionXDR: (...args: Parameters<TransactionBuilderService['parseTransactionXDR']>) => 
        transactionBuilder.instance.parseTransactionXDR(...args),
};
