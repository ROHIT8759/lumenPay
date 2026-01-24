import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

async function resolveChatId(walletAddress: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('telegram_links')
      .select('telegram_chat_id')
      .eq('wallet_address', walletAddress)
      .single();
    return data?.telegram_chat_id || null;
  } catch {
    return null;
  }
}

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN || !chatId || !text) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function formatTxUrl(txHash: string): string {
  if (!txHash) return '';
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

export async function notifyPaymentSent(walletAddress: string, amount: string, assetCode: string, toAddress: string, txHash: string) {
  const chatId = await resolveChatId(walletAddress);
  if (!chatId) return;
  const url = formatTxUrl(txHash);
  const text = `✅ Payment Sent\nAmount: ${amount} ${assetCode}\nTo: ${toAddress}\nTx: ${url}`;
  await sendTelegramMessage(chatId, text);
}

export async function notifyPaymentReceived(walletAddress: string, amount: string, assetCode: string, fromAddress: string, txHash: string) {
  const chatId = await resolveChatId(walletAddress);
  if (!chatId) return;
  const url = formatTxUrl(txHash);
  const text = `💰 Payment Received\nAmount: ${amount} ${assetCode}\nFrom: ${fromAddress}\nTx: ${url}`;
  await sendTelegramMessage(chatId, text);
}

export async function notifyEscrowCreated(walletAddress: string, amount: string, assetCode: string, recipient: string, txHash: string) {
  const chatId = await resolveChatId(walletAddress);
  if (!chatId) return;
  const url = formatTxUrl(txHash);
  const text = `🔒 Escrow Created\nAmount: ${amount} ${assetCode}\nRecipient: ${recipient}\nStatus: Locked\nTx: ${url}`;
  await sendTelegramMessage(chatId, text);
}

export async function notifyEscrowSettled(walletAddress: string, txHash: string) {
  const chatId = await resolveChatId(walletAddress);
  if (!chatId) return;
  const url = formatTxUrl(txHash);
  const text = `✅ Escrow Settled\nFunds released\nTx: ${url}`;
  await sendTelegramMessage(chatId, text);
}

export async function notifyTransactionFailed(walletAddress: string, reason: string) {
  const chatId = await resolveChatId(walletAddress);
  if (!chatId) return;
  const text = `❌ Transaction Failed\nReason: ${reason}`;
  await sendTelegramMessage(chatId, text);
}

export async function notifyKYCStatusUpdate(walletAddress: string, status: string) {
  const chatId = await resolveChatId(walletAddress);
  if (!chatId) return;
  const text = status === 'APPROVED'
    ? `🆔 Identity Verified\nYour biometric verification was successful.`
    : `🆔 KYC Status Update\nStatus: ${status}`;
  await sendTelegramMessage(chatId, text);
}
