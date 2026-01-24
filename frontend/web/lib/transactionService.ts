

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
    | 'emi_payment'
    | 'reward_claim'
    | 'topup';
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
    | 'reward'
    | 'topup';
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
