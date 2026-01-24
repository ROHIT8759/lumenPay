import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  Operation,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';

const CONTRACT_ID = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || process.env.STELLAR_CONTRACT_ID;
const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
// Initialize Soroban RPC Server
const server = new rpc.Server(SOROBAN_RPC_URL);

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
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

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
    const simulated = await server.simulateTransaction(transaction);
    
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    // Prepare and sign the transaction
    const prepared = rpc.assembleTransaction(transaction, simulated).build();
    prepared.sign(sourceKeypair);

    // Submit the transaction
    const result = await server.sendTransaction(prepared);

    // Wait for confirmation
    let status = await server.getTransaction(result.hash);
    while (status.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await server.getTransaction(result.hash);
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
    const sourceAccount = await server.getAccount(address);
    
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

    const simulated = await server.simulateTransaction(transaction);
    
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
    const userAccount = await server.getAccount(userKeypair.publicKey());

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

    const simulated = await server.simulateTransaction(transaction);
    
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const prepared = rpc.assembleTransaction(transaction, simulated).build();
    prepared.sign(userKeypair);

    const result = await server.sendTransaction(prepared);
    
    let status = await server.getTransaction(result.hash);
    while (status.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await server.getTransaction(result.hash);
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
    const requesterAccount = await server.getAccount(requesterKeypair.publicKey());

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

    const simulated = await server.simulateTransaction(transaction);
    
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const prepared = rpc.assembleTransaction(transaction, simulated).build();
    prepared.sign(requesterKeypair);

    const result = await getServer().sendTransaction(prepared);
    
    let status = await getServer().getTransaction(result.hash);
    while (status.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await getServer().getTransaction(result.hash);
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
