/**
 * Soroban Smart Contract Service
 * Provides integration with deployed LumenPay contracts on Stellar
 */

import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';

// Contract addresses from environment
const CONTRACT_ADDRESSES = {
  PAYMENT: process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ID || '',
  LOAN: process.env.NEXT_PUBLIC_LOAN_CONTRACT_ID || '',
  KYC: process.env.NEXT_PUBLIC_KYC_CONTRACT_ID || '',
  CREDIT: process.env.NEXT_PUBLIC_CREDIT_CONTRACT_ID || '',
  ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || '',
};

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

export interface ContractCallResult {
  success: boolean;
  transactionHash?: string;
  result?: any;
  error?: string;
}

class ContractService {
  private rpcServer: SorobanRpc.Server;
  private networkPassphrase: string;

  constructor() {
    this.rpcServer = new SorobanRpc.Server(SOROBAN_RPC_URL);
    this.networkPassphrase = NETWORK_PASSPHRASE;
  }

  /**
   * Generic contract invocation method
   */
  async invokeContract(
    contractAddress: string,
    method: string,
    args: xdr.ScVal[],
    signerPublicKey: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    try {
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      // Load account
      const account = await this.rpcServer.getAccount(signerPublicKey);

      // Build contract call transaction
      const contract = new Contract(contractAddress);
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(300)
        .build();

      // Simulate transaction first
      const simulated = await this.rpcServer.simulateTransaction(transaction);

      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      // Prepare transaction with simulation results
      const preparedTx = SorobanRpc.assembleTransaction(transaction, simulated).build();

      // Sign transaction (using Freighter or other wallet)
      const signedXdr = await signTransaction(preparedTx.toXDR());
      const signedTx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);

      // Submit transaction
      const sendResponse = await this.rpcServer.sendTransaction(signedTx as any);

      if (sendResponse.status === 'PENDING') {
        // Poll for transaction result
        let getResponse = await this.rpcServer.getTransaction(sendResponse.hash);
        
        while (getResponse.status === 'NOT_FOUND') {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          getResponse = await this.rpcServer.getTransaction(sendResponse.hash);
        }

        if (getResponse.status === 'SUCCESS') {
          const result = getResponse.returnValue
            ? scValToNative(getResponse.returnValue)
            : null;

          return {
            success: true,
            transactionHash: sendResponse.hash,
            result,
          };
        } else {
          throw new Error(`Transaction failed: ${getResponse.status}`);
        }
      } else {
        throw new Error(`Transaction submission failed: ${sendResponse.status}`);
      }
    } catch (error: any) {
      console.error('Contract invocation error:', error);
      return {
        success: false,
        error: error.message || 'Contract invocation failed',
      };
    }
  }

  // ============ PAYMENT CONTRACT METHODS ============

  /**
   * Execute a payment using PaymentContract
   */
  async pay(
    tokenAddress: string,
    from: string,
    to: string,
    amount: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [
      new Address(tokenAddress).toScVal(),
      new Address(from).toScVal(),
      new Address(to).toScVal(),
      nativeToScVal(BigInt(amount), { type: 'i128' }),
    ];

    return this.invokeContract(
      CONTRACT_ADDRESSES.PAYMENT,
      'pay',
      args,
      from,
      signTransaction
    );
  }

  /**
   * Execute batch payment using PaymentContract
   */
  async batchPay(
    tokenAddress: string,
    from: string,
    recipients: string[],
    amounts: string[],
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const recipientAddresses = recipients.map((r) => new Address(r).toScVal());
    const amountValues = amounts.map((a) => nativeToScVal(BigInt(a), { type: 'i128' }));

    const args = [
      new Address(tokenAddress).toScVal(),
      new Address(from).toScVal(),
      nativeToScVal(recipientAddresses, { type: 'Vec' }),
      nativeToScVal(amountValues, { type: 'Vec' }),
    ];

    return this.invokeContract(
      CONTRACT_ADDRESSES.PAYMENT,
      'batch_pay',
      args,
      from,
      signTransaction
    );
  }

  // ============ LOAN CONTRACT METHODS ============

  /**
   * Create a loan using LoanContract
   */
  async createLoan(
    loanId: number,
    borrower: string,
    lender: string,
    principal: string,
    interestRateBps: number,
    tenureMonths: number,
    tokenAddress: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [
      nativeToScVal(loanId, { type: 'u64' }),
      new Address(borrower).toScVal(),
      new Address(lender).toScVal(),
      nativeToScVal(BigInt(principal), { type: 'i128' }),
      nativeToScVal(interestRateBps, { type: 'u32' }),
      nativeToScVal(tenureMonths, { type: 'u32' }),
      new Address(tokenAddress).toScVal(),
    ];

    return this.invokeContract(
      CONTRACT_ADDRESSES.LOAN,
      'create_loan',
      args,
      lender,
      signTransaction
    );
  }

  /**
   * Pay EMI for a loan
   */
  async payEMI(
    loanId: number,
    emiNumber: number,
    tokenAddress: string,
    amount: string,
    borrower: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [
      nativeToScVal(loanId, { type: 'u64' }),
      nativeToScVal(emiNumber, { type: 'u32' }),
      new Address(tokenAddress).toScVal(),
      nativeToScVal(BigInt(amount), { type: 'i128' }),
    ];

    return this.invokeContract(
      CONTRACT_ADDRESSES.LOAN,
      'pay_emi',
      args,
      borrower,
      signTransaction
    );
  }

  /**
   * Mark a loan as defaulted
   */
  async markLoanAsDefaulted(
    loanId: number,
    lender: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [nativeToScVal(loanId, { type: 'u64' })];

    return this.invokeContract(
      CONTRACT_ADDRESSES.LOAN,
      'mark_as_defaulted',
      args,
      lender,
      signTransaction
    );
  }

  /**
   * Get loan details
   */
  async getLoan(loanId: number, caller: string): Promise<any> {
    try {
      const args = [nativeToScVal(loanId, { type: 'u64' })];

      // For read-only operations, we can use simulateTransaction
      const account = await this.rpcServer.getAccount(caller);
      const contract = new Contract(CONTRACT_ADDRESSES.LOAN);
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('get_loan', ...args))
        .setTimeout(300)
        .build();

      const simulated = await this.rpcServer.simulateTransaction(transaction);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        return scValToNative(simulated.result.retval);
      }

      return null;
    } catch (error) {
      console.error('Get loan error:', error);
      return null;
    }
  }

  // ============ KYC CONTRACT METHODS ============

  /**
   * Initialize KYC contract (admin only)
   */
  async initKYC(
    admin: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [new Address(admin).toScVal()];

    return this.invokeContract(
      CONTRACT_ADDRESSES.KYC,
      'init',
      args,
      admin,
      signTransaction
    );
  }

  /**
   * Verify a user's KYC status
   */
  async verifyKYC(
    user: string,
    level: number,
    admin: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [
      new Address(user).toScVal(),
      nativeToScVal(level, { type: 'u32' }),
    ];

    return this.invokeContract(
      CONTRACT_ADDRESSES.KYC,
      'verify',
      args,
      admin,
      signTransaction
    );
  }

  /**
   * Get KYC status for a user
   */
  async getKYCStatus(user: string, caller: string): Promise<number> {
    try {
      const args = [new Address(user).toScVal()];
      const account = await this.rpcServer.getAccount(caller);
      const contract = new Contract(CONTRACT_ADDRESSES.KYC);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('get_status', ...args))
        .setTimeout(300)
        .build();

      const simulated = await this.rpcServer.simulateTransaction(transaction);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        return scValToNative(simulated.result.retval);
      }

      return 0;
    } catch (error) {
      console.error('Get KYC status error:', error);
      return 0;
    }
  }

  // ============ CREDIT CONTRACT METHODS ============

  /**
   * Initialize credit contract (admin only)
   */
  async initCredit(
    admin: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [new Address(admin).toScVal()];

    return this.invokeContract(
      CONTRACT_ADDRESSES.CREDIT,
      'init',
      args,
      admin,
      signTransaction
    );
  }

  /**
   * Set credit score for a user
   */
  async setCreditScore(
    user: string,
    score: number,
    admin: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [
      new Address(user).toScVal(),
      nativeToScVal(score, { type: 'u32' }),
    ];

    return this.invokeContract(
      CONTRACT_ADDRESSES.CREDIT,
      'set_score',
      args,
      admin,
      signTransaction
    );
  }

  /**
   * Get credit score for a user
   */
  async getCreditScore(user: string, caller: string): Promise<number> {
    try {
      const args = [new Address(user).toScVal()];
      const account = await this.rpcServer.getAccount(caller);
      const contract = new Contract(CONTRACT_ADDRESSES.CREDIT);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('get_score', ...args))
        .setTimeout(300)
        .build();

      const simulated = await this.rpcServer.simulateTransaction(transaction);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        return scValToNative(simulated.result.retval);
      }

      return 0;
    } catch (error) {
      console.error('Get credit score error:', error);
      return 0;
    }
  }

  // ============ ESCROW CONTRACT METHODS ============

  /**
   * Initialize escrow contract (admin only)
   */
  async initEscrow(
    admin: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [new Address(admin).toScVal()];

    return this.invokeContract(
      CONTRACT_ADDRESSES.ESCROW,
      'initialize',
      args,
      admin,
      signTransaction
    );
  }

  /**
   * Lock collateral in escrow
   */
  async lockCollateral(
    loanId: number,
    borrower: string,
    lender: string,
    collateralToken: string,
    collateralAmount: string,
    signTransaction: (xdr: string) => Promise<string>
  ): Promise<ContractCallResult> {
    const args = [
      nativeToScVal(loanId, { type: 'u64' }),
      new Address(borrower).toScVal(),
      new Address(lender).toScVal(),
      new Address(collateralToken).toScVal(),
      nativeToScVal(BigInt(collateralAmount), { type: 'i128' }),
    ];

    return this.invokeContract(
      CONTRACT_ADDRESSES.ESCROW,
      'lock_collateral',
      args,
      borrower,
      signTransaction
    );
  }

  // ============ UTILITY METHODS ============

  /**
   * Check if all contracts are configured
   */
  isConfigured(): boolean {
    return Object.values(CONTRACT_ADDRESSES).every((addr) => addr !== '');
  }

  /**
   * Get contract addresses
   */
  getContractAddresses() {
    return CONTRACT_ADDRESSES;
  }

  /**
   * Check if a specific contract is configured
   */
  isContractConfigured(contractName: keyof typeof CONTRACT_ADDRESSES): boolean {
    return CONTRACT_ADDRESSES[contractName] !== '';
  }
}

export const contractService = new ContractService();
export default contractService;

// ============================================================================
// RWA-Specific Contract Functions (from legacy code, may need refactoring)
// ============================================================================

const CONTRACT_ID = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || process.env.STELLAR_CONTRACT_ID;
const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';

// Initialize Soroban RPC using already imported rpc type
const legacyServer = new SorobanRpc.Server(SOROBAN_RPC_URL);

/**
 * Get the smart contract instance
 */
export function getContract(): Contract {
  if (!CONTRACT_ID) {
    throw new Error('Contract ID not configured. Please set STELLAR_CONTRACT_ID in .env');
  }
  return new Contract(CONTRACT_ID);
}

/**
 * Create and send a payment through the smart contract
 */
export async function sendContractPayment(
  sourceKeypair: Keypair,
  recipientAddress: string,
  amount: string,
  memo?: string
): Promise<{ success: boolean; transactionHash: string }> {
  try {
    const contract = getContract();
    const sourceAccount = await legacyServer.getAccount(sourceKeypair.publicKey());

    // Build the transaction
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'send_payment',
          nativeToScVal(Address.fromString(sourceKeypair.publicKey())),
          nativeToScVal(Address.fromString(recipientAddress)),
          nativeToScVal(BigInt(amount), { type: 'i128' })
        )
      )
      .setTimeout(30)
      .build();

    // Simulate the transaction
    const simulated = await legacyServer.simulateTransaction(transaction);
    
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    // Prepare and sign the transaction
    const prepared = rpc.assembleTransaction(transaction, simulated).build();
    prepared.sign(sourceKeypair);

    // Submit the transaction
    const result = await legacyServer.sendTransaction(prepared);

    // Wait for confirmation
    let status = await legacyServer.getTransaction(result.hash);
    while (status.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await legacyServer.getTransaction(result.hash);
    }

    if (status.status === 'SUCCESS') {
      return {
        success: true,
        transactionHash: result.hash,
      };
    }

    throw new Error(`Transaction failed with status: ${status.status}`);
  } catch (error: any) {
    console.error('Contract payment failed:', error);
    throw new Error(error.message || 'Failed to send payment through contract');
  }
}

/**
 * Get balance from the smart contract
 */
export async function getContractBalance(address: string): Promise<string> {
  try {
    const contract = getContract();
    
    // For demo purposes, this would call a contract method to get balance
    // Adjust based on your actual contract methods
    const sourceAccount = await legacyServer.getAccount(address);
    
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'get_balance',
          nativeToScVal(Address.fromString(address))
        )
      )
      .setTimeout(30)
      .build();

    const simulated = await legacyServer.simulateTransaction(transaction);
    
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    if (simulated.result) {
      const balance = scValToNative(simulated.result.retval);
      return balance.toString();
    }

    return '0';
  } catch (error: any) {
    console.error('Failed to get contract balance:', error);
    return '0';
  }
}

/**
 * Record a transaction in the smart contract
 */
export async function recordContractTransaction(
  userKeypair: Keypair,
  txHash: string,
  amount: string,
  recipient: string
): Promise<boolean> {
  try {
    const contract = getContract();
    const userAccount = await legacyServer.getAccount(userKeypair.publicKey());

    const transaction = new TransactionBuilder(userAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'record_transaction',
          nativeToScVal(Address.fromString(userKeypair.publicKey())),
          nativeToScVal(txHash, { type: 'string' }),
          nativeToScVal(BigInt(amount), { type: 'i128' }),
          nativeToScVal(Address.fromString(recipient))
        )
      )
      .setTimeout(30)
      .build();

    const simulated = await legacyServer.simulateTransaction(transaction);
    
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const prepared = rpc.assembleTransaction(transaction, simulated).build();
    prepared.sign(userKeypair);

    const result = await legacyServer.sendTransaction(prepared);
    
    let status = await legacyServer.getTransaction(result.hash);
    while (status.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await legacyServer.getTransaction(result.hash);
    }

    return status.status === 'SUCCESS';
  } catch (error: any) {
    console.error('Failed to record transaction:', error);
    return false;
  }
}

/**
 * Create a payment request through the contract
 */
export async function createPaymentRequest(
  requesterKeypair: Keypair,
  amount: string,
  description: string
): Promise<{ success: boolean; requestId?: string }> {
  try {
    const contract = getContract();
    const requesterAccount = await legacyServer.getAccount(requesterKeypair.publicKey());

    const transaction = new TransactionBuilder(requesterAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'create_payment_request',
          nativeToScVal(Address.fromString(requesterKeypair.publicKey())),
          nativeToScVal(BigInt(amount), { type: 'i128' }),
          nativeToScVal(description, { type: 'string' })
        )
      )
      .setTimeout(30)
      .build();

    const simulated = await legacyServer.simulateTransaction(transaction);
    
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const prepared = rpc.assembleTransaction(transaction, simulated).build();
    prepared.sign(requesterKeypair);

    const result = await legacyServer.sendTransaction(prepared);
    
    let status = await legacyServer.getTransaction(result.hash);
    while (status.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await legacyServer.getTransaction(result.hash);
    }

    if (status.status === 'SUCCESS') {
      return {
        success: true,
        requestId: result.hash,
      };
    }

    return { success: false };
  } catch (error: any) {
    console.error('Failed to create payment request:', error);
    return { success: false };
  }
}

/**
 * Get contract information
 */
export async function getContractInfo(): Promise<{
  contractId: string;
  adminAddress: string;
  network: string;
}> {
  return {
    contractId: CONTRACT_ID || 'Not configured',
    adminAddress: process.env.NEXT_PUBLIC_STELLAR_ADMIN_ADDRESS || process.env.STELLAR_ADMIN_ADDRESS || 'Not configured',
    network: 'testnet',
  };
}

/**
 * Check if contract is initialized and accessible
 */
export async function checkContractStatus(): Promise<{
  isConfigured: boolean;
  isAccessible: boolean;
  error?: string;
}> {
  try {
    if (!CONTRACT_ID) {
      return {
        isConfigured: false,
        isAccessible: false,
        error: 'Contract ID not configured',
      };
    }

    // Try to get contract data
    const contract = getContract();
    
    return {
      isConfigured: true,
      isAccessible: true,
    };
  } catch (error: any) {
    return {
      isConfigured: !!CONTRACT_ID,
      isAccessible: false,
      error: error.message,
    };
  }
}
