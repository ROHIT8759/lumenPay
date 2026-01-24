

import { Horizon } from '@stellar/stellar-sdk';

export type StellarNetwork = 'mainnet' | 'testnet';

const HORIZON_URLS = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org'
};

function getServer(network: StellarNetwork = 'mainnet'): Horizon.Server {
  return new Horizon.Server(HORIZON_URLS[network]);
}

export interface ExpoTransaction {
  id: string;
  hash: string;
  ledger: number;
  created_at: string;
  source_account: string;
  fee_charged: string;
  operation_count: number;
  memo?: string;
  memo_type?: string;
  successful: boolean;
  paging_token: string;
}

export interface ExpoOperation {
  id: string;
  type: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  transaction_hash: string;
}

export interface ExpoAccountBalance {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

export interface ExpoAccount {
  id: string;
  account_id: string;
  sequence: string;
  subentry_count: number;
  balances: ExpoAccountBalance[];
  flags: {
    auth_required: boolean;
    auth_revocable: boolean;
  };
}


export async function fetchRecentTransactions(limit: number = 20, network: StellarNetwork = 'mainnet'): Promise<ExpoTransaction[]> {
  try {
    const server = getServer(network);
    const response = await server
      .transactions()
      .order('desc')
      .limit(limit)
      .call();

    return response.records.map((tx: any) => ({
      id: tx.id,
      hash: tx.hash,
      ledger: tx.ledger_attr,
      created_at: tx.created_at,
      source_account: tx.source_account,
      fee_charged: tx.fee_charged,
      operation_count: tx.operation_count,
      memo: tx.memo,
      memo_type: tx.memo_type,
      successful: tx.successful,
      paging_token: tx.paging_token,
    }));
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    throw new Error('Failed to fetch transactions from Stellar network');
  }
}


export async function fetchTransactionByHash(hash: string, network: StellarNetwork = 'mainnet'): Promise<any> {
  try {
    const server = getServer(network);
    const transaction = await server.transactions().transaction(hash).call();
    return transaction;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      throw new Error('Transaction not found');
    }
    console.error('Error fetching transaction:', error);
    throw new Error('Failed to fetch transaction');
  }
}


export async function fetchTransactionOperations(hash: string, network: StellarNetwork = 'mainnet'): Promise<ExpoOperation[]> {
  try {
    const server = getServer(network);
    const response = await server
      .operations()
      .forTransaction(hash)
      .limit(200)
      .call();

    return response.records.map((op: any) => ({
      id: op.id,
      type: op.type,
      from: op.from,
      to: op.to,
      amount: op.amount,
      asset_type: op.asset_type,
      asset_code: op.asset_code,
      asset_issuer: op.asset_issuer,
      transaction_hash: op.transaction_hash || hash,
    }));
  } catch (error) {
    console.error('Error fetching transaction operations:', error);
    return [];
  }
}


export async function fetchAccountByAddress(address: string, network: StellarNetwork = 'mainnet'): Promise<ExpoAccount> {
  try {
    const server = getServer(network);
    const account = await server.accounts().accountId(address).call();

    return {
      id: account.id,
      account_id: account.account_id,
      sequence: account.sequence,
      subentry_count: account.subentry_count,
      balances: account.balances.map((bal: any) => ({
        balance: bal.balance,
        asset_type: bal.asset_type,
        asset_code: bal.asset_code,
        asset_issuer: bal.asset_issuer,
      })),
      flags: {
        auth_required: account.flags.auth_required,
        auth_revocable: account.flags.auth_revocable,
      },
    };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      throw new Error('Account not found');
    }
    console.error('Error fetching account:', error);
    throw new Error('Failed to fetch account');
  }
}


export async function fetchAccountTransactions(
  address: string,
  limit: number = 20,
  network: StellarNetwork = 'mainnet'
): Promise<ExpoTransaction[]> {
  try {
    const server = getServer(network);
    const response = await server
      .transactions()
      .forAccount(address)
      .order('desc')
      .limit(limit)
      .call();

    return response.records.map((tx: any) => ({
      id: tx.id,
      hash: tx.hash,
      ledger: tx.ledger_attr,
      created_at: tx.created_at,
      source_account: tx.source_account,
      fee_charged: tx.fee_charged,
      operation_count: tx.operation_count,
      memo: tx.memo,
      memo_type: tx.memo_type,
      successful: tx.successful,
      paging_token: tx.paging_token,
    }));
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    throw new Error('Failed to fetch account transactions');
  }
}


export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(address);
}


export function isValidTransactionHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}


export function formatAsset(
  asset_type: string,
  asset_code?: string,
  asset_issuer?: string
): string {
  if (asset_type === 'native') {
    return 'XLM';
  }
  return asset_code || 'Unknown';
}


export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}


export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
