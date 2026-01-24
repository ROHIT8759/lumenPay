

import {
    Horizon,
    rpc,
    Networks,
} from '@stellar/stellar-sdk';

export type NetworkType = 'testnet' | 'public';

export interface BalanceInfo {
    native: string;
    usdc: string;
    assets: Array<{
        code: string;
        issuer: string;
        balance: string;
    }>;
}

export interface TransactionHistoryItem {
    id: string;
    hash: string;
    ledger: number;
    createdAt: string;
    sourceAccount: string;
    type: string;
    successful: boolean;
}

export interface AccountInfo {
    id: string;
    sequence: string;
    balances: Horizon.ServerApi.AccountRecord['balances'];
    signers: Horizon.ServerApi.AccountRecord['signers'];
    flags: Horizon.ServerApi.AccountRecord['flags'];
}

class NetworkProviderService {
    private horizonServer: Horizon.Server;
    private sorobanServer: rpc.Server | null = null;
    private network: NetworkType;

    constructor(network: NetworkType = 'testnet') {
        this.network = network;
        this.horizonServer = this.createHorizonServer(network);

        if (network === 'testnet') {
            this.sorobanServer = new rpc.Server(
                'https://soroban-testnet.stellar.org'
            );
        }
    }


    private createHorizonServer(network: NetworkType): Horizon.Server {
        const url =
            network === 'testnet'
                ? 'https://horizon-testnet.stellar.org'
                : 'https://horizon.stellar.org';

        return new Horizon.Server(url);
    }


    switchNetwork(network: NetworkType): void {
        this.network = network;
        this.horizonServer = this.createHorizonServer(network);


        if (network === 'testnet') {
            this.sorobanServer = new rpc.Server(
                'https://soroban-testnet.stellar.org'
            );
        } else {
            this.sorobanServer = new rpc.Server(
                'https://soroban-mainnet.stellar.org'
            );
        }
    }


    getHorizonServer(): Horizon.Server {
        return this.horizonServer;
    }


    getSorobanServer(): rpc.Server | null {
        return this.sorobanServer;
    }


    async submitTransaction(signedXDR: string): Promise<{
        hash: string;
        ledger?: number;
        error?: string;
    }> {
        try {
            const result = await this.horizonServer.submitTransaction(
                signedXDR as any
            );

            return {
                hash: result.hash,
                ledger: result.ledger,
            };
        } catch (error: unknown) {
            const horizonError = error as { response?: { data?: { extras?: { result_codes?: { transaction?: string } } } }; message?: string };
            return {
                hash: '',
                error: horizonError.response?.data?.extras?.result_codes?.transaction || horizonError.message || 'Failed to submit transaction',
            };
        }
    }


    async getBalances(publicKey: string): Promise<{
        balances: BalanceInfo;
        error?: string;
    }> {
        try {
            const account = await this.horizonServer
                .loadAccount(publicKey);

            let nativeBalance = '0';
            let usdcBalance = '0';
            const assets: Array<{ code: string; issuer: string; balance: string }> = [];

            for (const balance of account.balances) {
                if (balance.asset_type === 'native') {
                    nativeBalance = balance.balance;
                } else if (
                    balance.asset_type === 'credit_alphanum4' ||
                    balance.asset_type === 'credit_alphanum12'
                ) {
                    const assetBalance = {
                        code: balance.asset_code!,
                        issuer: balance.asset_issuer!,
                        balance: balance.balance,
                    };


                    if (balance.asset_code === 'USDC') {
                        usdcBalance = balance.balance;
                    }

                    assets.push(assetBalance);
                }
            }

            return {
                balances: {
                    native: nativeBalance,
                    usdc: usdcBalance,
                    assets,
                },
            };
        } catch (error: unknown) {
            return {
                balances: {
                    native: '0',
                    usdc: '0',
                    assets: [],
                },
                error: error instanceof Error ? error.message : 'Failed to fetch balances',
            };
        }
    }


    async getTransactionHistory(
        publicKey: string,
        limit: number = 20
    ): Promise<{
        transactions: TransactionHistoryItem[];
        error?: string;
    }> {
        try {
            const txs = await this.horizonServer
                .transactions()
                .forAccount(publicKey)
                .order('desc')
                .limit(limit)
                .call();

            const transactions: TransactionHistoryItem[] = txs.records.map((tx: any) => ({
                id: tx.id,
                hash: tx.hash,
                ledger: tx.ledger_attr,
                createdAt: tx.created_at,
                sourceAccount: tx.source_account,
                type: tx.memo_type || 'none',
                successful: tx.successful,
            }));

            return { transactions };
        } catch (error: unknown) {
            return {
                transactions: [],
                error: error instanceof Error ? error.message : 'Failed to fetch transaction history',
            };
        }
    }


    async getAccountInfo(publicKey: string): Promise<{
        account: AccountInfo | null;
        error?: string;
    }> {
        try {
            const account = await this.horizonServer.loadAccount(publicKey);

            return {
                account: {
                    id: account.id,
                    sequence: account.sequence,
                    balances: account.balances,
                    signers: account.signers,
                    flags: account.flags,
                },
            };
        } catch (error: any) {
            return {
                account: null,
                error: error.message || 'Failed to fetch account info',
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
            return {
                success: false,
                error: 'Friendbot only available on testnet',
            };
        }

        try {
            const response = await fetch(
                `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
            );

            if (!response.ok) {
                throw new Error(`Friendbot returned ${response.status}`);
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to fund account',
            };
        }
    }


    async pollTransactionStatus(
        hash: string,
        timeout: number = 30000
    ): Promise<{
        successful: boolean;
        error?: string;
    }> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const tx = await this.horizonServer
                    .transactions()
                    .transaction(hash)
                    .call();

                return { successful: tx.successful };
            } catch (error: any) {

                if (error.response?.status === 404) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    continue;
                }


                return {
                    successful: false,
                    error: error.message,
                };
            }
        }

        return {
            successful: false,
            error: 'Transaction polling timeout',
        };
    }


    getCurrentNetwork(): NetworkType {
        return this.network;
    }


    getNetworkPassphrase(): string {
        return this.network === 'testnet'
            ? Networks.TESTNET
            : Networks.PUBLIC;
    }
}

// Lazy initialization to prevent client-side instantiation errors
let _networkProviderInstance: NetworkProviderService | null = null;

export const networkProvider = {
    get instance(): NetworkProviderService {
        if (!_networkProviderInstance) {
            _networkProviderInstance = new NetworkProviderService();
        }
        return _networkProviderInstance;
    },
    // Proxy commonly used methods
    getHorizonServer: () => networkProvider.instance.getHorizonServer(),
    getSorobanServer: () => networkProvider.instance.getSorobanServer(),
    submitTransaction: (signedXDR: string) => networkProvider.instance.submitTransaction(signedXDR),
    getAccount: (publicKey: string) => networkProvider.instance.getAccountInfo(publicKey),
    getBalances: (publicKey: string) => networkProvider.instance.getBalances(publicKey),
    getTransactionHistory: (publicKey: string, limit?: number) => networkProvider.instance.getTransactionHistory(publicKey, limit),
    switchNetwork: (network: NetworkType) => networkProvider.instance.switchNetwork(network),
    getCurrentNetwork: () => networkProvider.instance.getCurrentNetwork(),
    getNetworkPassphrase: () => networkProvider.instance.getNetworkPassphrase(),
};
