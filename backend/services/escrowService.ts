import {
    Contract,
    SorobanRpc,
    TransactionBuilder,
    Networks,
    BASE_FEE,
    xdr,
    Address,
    nativeToScVal,
} from '@stellar/stellar-sdk';

/**
 * Escrow Service
 * 
 * Builds unsigned Soroban contract invocations for escrow operations.
 * The escrow contract must be deployed and its ID stored in env.
 */

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const ESCROW_CONTRACT_ID = process.env.ESCROW_CONTRACT_ID || '';

const NETWORK_PASSPHRASE = STELLAR_NETWORK === 'public'
    ? Networks.PUBLIC
    : Networks.TESTNET;

const server = new SorobanRpc.Server(SOROBAN_RPC_URL);

export interface UnsignedEscrowInvocation {
    xdr: string;
    network: string;
}

export class EscrowService {
    /**
     * Build unsigned Soroban invocation to lock collateral
     * @param loanId Unique loan ID
     * @param borrowerPublicKey Borrower's public key
     * @param lenderPublicKey Lender's public key
     * @param collateralToken Token contract address
     * @param collateralAmount Amount to lock
     * @param loanAmount Loan amount
     * @param durationSeconds Duration in seconds
     * @returns Unsigned transaction XDR
     */
    async buildLockCollateral(
        loanId: number,
        borrowerPublicKey: string,
        lenderPublicKey: string,
        collateralToken: string,
        collateralAmount: bigint,
        loanAmount: bigint,
        durationSeconds: number
    ): Promise<UnsignedEscrowInvocation> {
        if (!ESCROW_CONTRACT_ID) {
            throw new Error('ESCROW_CONTRACT_ID not configured');
        }

        try {
            // Load source account
            const sourceAccount = await server.getAccount(borrowerPublicKey);

            // Create contract instance
            const contract = new Contract(ESCROW_CONTRACT_ID);

            // Build parameters
            const params = [
                nativeToScVal(loanId, { type: 'u64' }),
                new Address(borrowerPublicKey).toScVal(),
                new Address(lenderPublicKey).toScVal(),
                new Address(collateralToken).toScVal(),
                nativeToScVal(collateralAmount, { type: 'i128' }),
                nativeToScVal(loanAmount, { type: 'i128' }),
                nativeToScVal(durationSeconds, { type: 'u64' }),
            ];

            // Build transaction
            const transaction = new TransactionBuilder(sourceAccount, {
                fee: BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(contract.call('lock_collateral', ...params))
                .setTimeout(30)
                .build();

            // Prepare transaction for simulation
            const preparedTx = await server.prepareTransaction(transaction);

            return {
                xdr: preparedTx.toXDR(),
                network: STELLAR_NETWORK,
            };
        } catch (error: any) {
            throw new Error(`Failed to build lock collateral invocation: ${error.message}`);
        }
    }

    /**
     * Build unsigned Soroban invocation to release collateral
     * @param loanId Loan ID
     * @param lenderPublicKey Lender's public key (must sign)
     * @returns Unsigned transaction XDR
     */
    async buildReleaseCollateral(
        loanId: number,
        lenderPublicKey: string
    ): Promise<UnsignedEscrowInvocation> {
        if (!ESCROW_CONTRACT_ID) {
            throw new Error('ESCROW_CONTRACT_ID not configured');
        }

        try {
            const sourceAccount = await server.getAccount(lenderPublicKey);
            const contract = new Contract(ESCROW_CONTRACT_ID);

            const params = [
                nativeToScVal(loanId, { type: 'u64' }),
            ];

            const transaction = new TransactionBuilder(sourceAccount, {
                fee: BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(contract.call('release_collateral', ...params))
                .setTimeout(30)
                .build();

            const preparedTx = await server.prepareTransaction(transaction);

            return {
                xdr: preparedTx.toXDR(),
                network: STELLAR_NETWORK,
            };
        } catch (error: any) {
            throw new Error(`Failed to build release collateral invocation: ${error.message}`);
        }
    }

    /**
     * Get escrow status from contract
     * @param loanId Loan ID
     * @returns Escrow data
     */
    async getEscrowStatus(loanId: number): Promise<any> {
        if (!ESCROW_CONTRACT_ID) {
            throw new Error('ESCROW_CONTRACT_ID not configured');
        }

        try {
            const contract = new Contract(ESCROW_CONTRACT_ID);

            // This is a read-only call, no transaction needed
            // Implementation depends on how the contract exposes data
            // For now, return a placeholder
            return {
                loanId,
                status: 'active',
                message: 'Soroban read-only calls require SDK v11+ implementation',
            };
        } catch (error: any) {
            throw new Error(`Failed to get escrow status: ${error.message}`);
        }
    }
}

export const escrowService = new EscrowService();
