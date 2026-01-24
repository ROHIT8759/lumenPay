import {
    Horizon,
    Keypair,
    Networks,
    TransactionBuilder,
    Asset,
    Operation,
    Transaction,
    BASE_FEE
} from '@stellar/stellar-sdk';

/**
 * Wallet Service
 * 
 * REFACTORED: This service NO LONGER handles private keys or signing.
 * It only builds UNSIGNED transactions for the client to sign.
 */

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';

const NETWORK_PASSPHRASE = STELLAR_NETWORK === 'public'
    ? Networks.PUBLIC
    : Networks.TESTNET;

const server = new Horizon.Server(HORIZON_URL);

export interface UnsignedTransactionResult {
    xdr: string;
    network: string;
}

export class WalletService {
    /**
     * Build an unsigned payment transaction
     * @param fromPublicKey Source account public key
     * @param toAddress Destination address
     * @param amount Amount to send
     * @param assetCode Optional asset code (default: XLM)
     * @param assetIssuer Optional asset issuer
     * @returns Unsigned transaction XDR
     */
    async buildUnsignedPayment(
        fromPublicKey: string,
        toAddress: string,
        amount: string,
        assetCode?: string,
        assetIssuer?: string
    ): Promise<UnsignedTransactionResult> {
        try {
            // Load source account
            const sourceAccount = await server.loadAccount(fromPublicKey);

            // Determine asset
            let asset: Asset;
            if (assetCode && assetIssuer) {
                asset = new Asset(assetCode, assetIssuer);
            } else {
                asset = Asset.native();
            }

            // Build transaction
            const transaction = new TransactionBuilder(sourceAccount, {
                fee: BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(
                    Operation.payment({
                        destination: toAddress,
                        asset: asset,
                        amount: amount,
                    })
                )
                .setTimeout(30) // 30 second timeout
                .build();

            return {
                xdr: transaction.toXDR(),
                network: STELLAR_NETWORK,
            };
        } catch (error: any) {
            throw new Error(`Failed to build payment transaction: ${error.message}`);
        }
    }

    /**
     * Validate a signed transaction XDR
     * @param signedXDR Signed transaction XDR
     * @returns True if valid
     */
    validateSignedTransaction(signedXDR: string): boolean {
        try {
            const transaction = new Transaction(signedXDR, NETWORK_PASSPHRASE);

            // Check if transaction has at least one signature
            if (transaction.signatures.length === 0) {
                throw new Error('Transaction has no signatures');
            }

            return true;
        } catch (error: any) {
            throw new Error(`Invalid transaction: ${error.message}`);
        }
    }

    /**
     * Get account details from Horizon
     * @param publicKey Public key to query
     * @returns Account details including balances
     */
    async getAccountDetails(publicKey: string) {
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
        } catch (error: any) {
            throw new Error(`Failed to fetch account: ${error.message}`);
        }
    }

    /**
     * Fund a testnet account using Friendbot
     * @param publicKey Public key to fund
     * @returns Success status
     */
    async fundTestnetAccount(publicKey: string): Promise<boolean> {
        if (STELLAR_NETWORK !== 'testnet') {
            throw new Error('Friendbot is only available on testnet');
        }

        try {
            const response = await fetch(
                `https://friendbot.stellar.org?addr=${publicKey}`
            );

            if (!response.ok) {
                throw new Error('Friendbot request failed');
            }

            return true;
        } catch (error: any) {
            throw new Error(`Failed to fund account: ${error.message}`);
        }
    }
}

export const walletService = new WalletService();
