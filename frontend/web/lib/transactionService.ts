

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RecordTransactionParams {
  userId: string;
  txHash?: string | null;
  txType:
    | 'payment_out'
    | 'payment_in'
    | 'loan_disbursement'
    | 'loan_repayment'
    | 'flash_loan_borrow'
    | 'flash_loan_repay'
    | 'rwa_purchase'
    | 'rwa_sale'
    | 'bank_payout'
    | 'upi_payout'
    | 'emi_payment'
    | 'reward_claim'
    | 'topup'
    | 'swap'
    | 'deposit'
    | 'withdrawal';
  txDirection?: 'sent' | 'received' | 'internal';
  amount: number; 
  assetCode?: string;
  senderWallet?: string | null;
  senderDisplayName?: string | null;
  receiverWallet?: string | null;
  receiverDisplayName?: string | null;
  recipientName?: string | null;
  recipientAddress?: string | null;
  payIdUsed?: string | null;
  memo?: string | null;
  reference?: string | null;
  status?: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  errorMessage?: string | null;
  fee?: number;
  relatedFeature?:
    | 'payment'
    | 'loan'
    | 'flash_loan'
    | 'rwa'
    | 'bank_payout'
    | 'upi_payout'
    | 'reward'
    | 'topup'
    | 'offramp';
  metaData?: any;
}


export async function recordTransaction(params: RecordTransactionParams) {
  try {
    const { data, error } = await supabase.from('transactions').insert({
      user_id: params.userId,
      tx_hash: params.txHash,
      tx_type: params.txType,
      tx_direction: params.txDirection,
      amount: params.amount,
      asset_code: params.assetCode || 'USDC',
      sender_wallet: params.senderWallet,
      sender_display_name: params.senderDisplayName,
      receiver_wallet: params.receiverWallet,
      receiver_display_name: params.receiverDisplayName,
      recipient_name: params.recipientName,
      recipient_address: params.recipientAddress,
      pay_id_used: params.payIdUsed,
      memo: params.memo,
      reference: params.reference,
      status: params.status || 'pending',
      error_message: params.errorMessage,
      fee: params.fee || 0,
      related_feature: params.relatedFeature,
      meta_data: params.metaData || {},
      confirmed_at: params.status === 'success' ? new Date().toISOString() : null,
    }).select().single();

    if (error) {
      console.error('Error recording transaction:', error);
      throw new Error('Failed to record transaction');
    }

    return data;
  } catch (error) {
    console.error('Transaction recording error:', error);
    throw error;
  }
}


export async function updateTransactionStatus(
  transactionId: string,
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled',
  txHash?: string,
  errorMessage?: string
) {
  try {
    const updateData: any = {
      status,
      error_message: errorMessage,
    };

    if (txHash) {
      updateData.tx_hash = txHash;
    }

    if (status === 'success') {
      updateData.confirmed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      throw new Error('Failed to update transaction');
    }

    return data;
  } catch (error) {
    console.error('Transaction update error:', error);
    throw error;
  }
}


export async function recordPayment(params: {
  userId: string;
  txHash?: string;
  amount: number;
  assetCode?: string;
  senderWallet: string;
  receiverWallet: string;
  receiverName?: string;
  payId?: string;
  memo?: string;
  fee?: number;
  status?: 'pending' | 'success' | 'failed';
}) {
  return recordTransaction({
    userId: params.userId,
    txHash: params.txHash,
    txType: 'payment_out',
    txDirection: 'sent',
    amount: params.amount,
    assetCode: params.assetCode,
    senderWallet: params.senderWallet,
    receiverWallet: params.receiverWallet,
    receiverDisplayName: params.receiverName,
    recipientName: params.receiverName,
    recipientAddress: params.receiverWallet,
    payIdUsed: params.payId,
    memo: params.memo,
    status: params.status,
    fee: params.fee,
    relatedFeature: 'payment',
  });
}


export async function recordLoanTransaction(params: {
  userId: string;
  txHash?: string;
  amount: number;
  loanId: string;
  isRepayment: boolean;
  status?: 'pending' | 'success' | 'failed';
  errorMessage?: string;
}) {
  return recordTransaction({
    userId: params.userId,
    txHash: params.txHash,
    txType: params.isRepayment ? 'loan_repayment' : 'loan_disbursement',
    txDirection: params.isRepayment ? 'sent' : 'received',
    amount: params.amount,
    status: params.status,
    errorMessage: params.errorMessage,
    relatedFeature: 'loan',
    metaData: { loan_id: params.loanId },
  });
}


export async function recordRWATransaction(params: {
  userId: string;
  txHash?: string;
  amount: number;
  assetCode: string;
  isPurchase: boolean;
  rwaAssetId: string;
  status?: 'pending' | 'success' | 'failed';
}) {
  return recordTransaction({
    userId: params.userId,
    txHash: params.txHash,
    txType: params.isPurchase ? 'rwa_purchase' : 'rwa_sale',
    txDirection: params.isPurchase ? 'sent' : 'received',
    amount: params.amount,
    assetCode: params.assetCode,
    status: params.status,
    relatedFeature: 'rwa',
    metaData: { rwa_asset_id: params.rwaAssetId },
  });
}


export async function getTransactionByHash(txHash: string) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('tx_hash', txHash)
      .single();

    if (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Transaction fetch error:', error);
    return null;
  }
}


// =====================
// UPI OFF-RAMP TRANSACTION
// =====================
export async function recordUPIOfframp(params: {
  userId?: string;
  senderWallet: string;
  amountXlm: number;
  fee: number;
  fiatAmount: number;
  exchangeRate: number;
  upiId: string;
  recipientName: string;
  status?: 'pending' | 'processing' | 'success' | 'failed';
  reference?: string;
}) {
  return recordTransaction({
    userId: params.userId || '',
    txType: 'upi_payout',
    txDirection: 'sent',
    amount: params.amountXlm,
    assetCode: 'XLM',
    senderWallet: params.senderWallet,
    recipientName: params.recipientName,
    status: params.status || 'pending',
    fee: params.fee,
    reference: params.reference,
    relatedFeature: 'upi_payout',
    metaData: {
      upi_id: params.upiId,
      fiat_amount: params.fiatAmount,
      fiat_currency: 'INR',
      exchange_rate: params.exchangeRate,
      offramp_type: 'upi',
    },
  });
}


// =====================
// BANK OFF-RAMP TRANSACTION
// =====================
export async function recordBankOfframp(params: {
  userId?: string;
  senderWallet: string;
  amountXlm: number;
  fee: number;
  fiatAmount: number;
  exchangeRate: number;
  accountNumber: string;
  ifscCode: string;
  recipientName: string;
  bankName?: string;
  status?: 'pending' | 'processing' | 'success' | 'failed';
  reference?: string;
}) {
  return recordTransaction({
    userId: params.userId || '',
    txType: 'bank_payout',
    txDirection: 'sent',
    amount: params.amountXlm,
    assetCode: 'XLM',
    senderWallet: params.senderWallet,
    recipientName: params.recipientName,
    status: params.status || 'pending',
    fee: params.fee,
    reference: params.reference,
    relatedFeature: 'bank_payout',
    metaData: {
      bank_account_number: params.accountNumber.slice(0, 4) + '****' + params.accountNumber.slice(-4),
      bank_ifsc_code: params.ifscCode,
      bank_name: params.bankName,
      fiat_amount: params.fiatAmount,
      fiat_currency: 'INR',
      exchange_rate: params.exchangeRate,
      offramp_type: 'bank',
    },
  });
}


// =====================
// GET USER TRANSACTIONS
// =====================
export async function getUserTransactions(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    txType?: string;
    status?: string;
    relatedFeature?: string;
  }
) {
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.txType) {
      query = query.eq('tx_type', options.txType);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.relatedFeature) {
      query = query.eq('related_feature', options.relatedFeature);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }

    return data || [];
  } catch (error) {
    console.error('Transaction fetch error:', error);
    throw error;
  }
}


// =====================
// GET TRANSACTIONS BY WALLET
// =====================
export async function getTransactionsByWallet(
  walletAddress: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .or(`sender_wallet.eq.${walletAddress},receiver_wallet.eq.${walletAddress}`)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching wallet transactions:', error);
      throw new Error('Failed to fetch wallet transactions');
    }

    return data || [];
  } catch (error) {
    console.error('Wallet transaction fetch error:', error);
    throw error;
  }
}


// =====================
// GET TRANSACTION STATS
// =====================
export async function getTransactionStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('tx_type, amount, status, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching transaction stats:', error);
      throw new Error('Failed to fetch transaction stats');
    }

    const transactions = data || [];
    
    const stats = {
      totalTransactions: transactions.length,
      totalSent: 0,
      totalReceived: 0,
      pendingCount: 0,
      successCount: 0,
      failedCount: 0,
      byType: {} as Record<string, number>,
    };

    transactions.forEach((tx) => {
      // Count by status
      if (tx.status === 'pending' || tx.status === 'processing') stats.pendingCount++;
      else if (tx.status === 'success') stats.successCount++;
      else if (tx.status === 'failed') stats.failedCount++;

      // Count by type
      stats.byType[tx.tx_type] = (stats.byType[tx.tx_type] || 0) + 1;

      // Sum amounts
      if (tx.tx_type.includes('out') || tx.tx_type.includes('payout') || tx.tx_type === 'payment_out') {
        stats.totalSent += Number(tx.amount);
      } else if (tx.tx_type.includes('in') || tx.tx_type === 'payment_in' || tx.tx_type === 'topup') {
        stats.totalReceived += Number(tx.amount);
      }
    });

    return stats;
  } catch (error) {
    console.error('Transaction stats error:', error);
    throw error;
  }
}
