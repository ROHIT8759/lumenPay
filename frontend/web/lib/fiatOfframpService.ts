/**
 * Fiat Off-ramp Service
 * Integrates with the Soroban fiat_offramp contract for UPI and Bank transfers
 */

import * as StellarSdk from '@stellar/stellar-sdk';

const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

// Contract ID - Replace with deployed contract address
const FIAT_OFFRAMP_CONTRACT_ID = process.env.NEXT_PUBLIC_FIAT_OFFRAMP_CONTRACT_ID || '';

export type OfframpType = 'upi' | 'bank';

export interface OfframpRequest {
  id: number;
  user: string;
  offrampType: OfframpType;
  amountXlm: string;
  amountFiat: string;
  currency: string;
  recipientId: string;
  recipientName: string;
  ifscCode?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  processedAt: number;
  exchangeRate: string;
  fee: string;
}

export interface UPIOfframpParams {
  userAddress: string;
  amountXlm: string;
  upiId: string;
  recipientName: string;
}

export interface BankOfframpParams {
  userAddress: string;
  amountXlm: string;
  accountNumber: string;
  recipientName: string;
  ifscCode: string;
}

export interface ExchangeRateInfo {
  rate: number;
  currency: string;
  fee: number;
  netAmount: number;
  fiatAmount: number;
}

class FiatOfframpService {
  private server: StellarSdk.SorobanRpc.Server;

  constructor() {
    this.server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);
  }

  /**
   * Get current exchange rate and calculate fiat amount
   */
  async getExchangeRateInfo(amountXlm: number, currency: string = 'INR'): Promise<ExchangeRateInfo> {
    // In production, this would fetch from the contract or an oracle
    // For now, using mock data
    const rates: Record<string, number> = {
      INR: 10.5,  // 1 XLM = 10.5 INR
      USD: 0.12,  // 1 XLM = 0.12 USD
    };

    const rate = rates[currency] || rates.INR;
    const feePercent = 0.01; // 1% fee
    const fee = amountXlm * feePercent;
    const netAmount = amountXlm - fee;
    const fiatAmount = netAmount * rate;

    return {
      rate,
      currency,
      fee,
      netAmount,
      fiatAmount,
    };
  }

  /**
   * Get processing time for off-ramp type
   */
  getProcessingTime(type: OfframpType): { hours: number; message: string } {
    if (type === 'upi') {
      return {
        hours: 1,
        message: 'Usually within 1 hour',
      };
    }
    return {
      hours: 24,
      message: 'May take up to 24 hours',
    };
  }

  /**
   * Create UPI off-ramp request
   */
  async requestUPIOfframp(params: UPIOfframpParams): Promise<{ requestId: number; xdr?: string; error?: string }> {
    try {
      // Validate UPI ID format
      if (!this.validateUPIId(params.upiId)) {
        return { requestId: 0, error: 'Invalid UPI ID format' };
      }

      // Build the contract call
      const response = await fetch('/api/offramp/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: params.userAddress,
          amountXlm: params.amountXlm,
          upiId: params.upiId,
          recipientName: params.recipientName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { requestId: 0, error: error.message || 'Failed to create UPI request' };
      }

      const data = await response.json();
      return { requestId: data.requestId, xdr: data.xdr };
    } catch (error: any) {
      return { requestId: 0, error: error.message || 'Failed to create UPI off-ramp request' };
    }
  }

  /**
   * Create Bank off-ramp request
   */
  async requestBankOfframp(params: BankOfframpParams): Promise<{ requestId: number; xdr?: string; error?: string }> {
    try {
      // Validate bank details
      if (!this.validateAccountNumber(params.accountNumber)) {
        return { requestId: 0, error: 'Invalid account number' };
      }
      if (!this.validateIFSC(params.ifscCode)) {
        return { requestId: 0, error: 'Invalid IFSC code' };
      }

      // Build the contract call
      const response = await fetch('/api/offramp/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: params.userAddress,
          amountXlm: params.amountXlm,
          accountNumber: params.accountNumber,
          recipientName: params.recipientName,
          ifscCode: params.ifscCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { requestId: 0, error: error.message || 'Failed to create bank request' };
      }

      const data = await response.json();
      return { requestId: data.requestId, xdr: data.xdr };
    } catch (error: any) {
      return { requestId: 0, error: error.message || 'Failed to create bank off-ramp request' };
    }
  }

  /**
   * Get user's off-ramp requests
   */
  async getUserRequests(userAddress: string): Promise<OfframpRequest[]> {
    try {
      const response = await fetch(`/api/offramp/requests?user=${userAddress}`);
      if (!response.ok) {
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch user requests:', error);
      return [];
    }
  }

  /**
   * Get request status
   */
  async getRequestStatus(requestId: number): Promise<OfframpRequest | null> {
    try {
      const response = await fetch(`/api/offramp/requests/${requestId}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch request status:', error);
      return null;
    }
  }

  /**
   * Cancel a pending request
   */
  async cancelRequest(userAddress: string, requestId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/offramp/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Validation helpers
  private validateUPIId(upiId: string): boolean {
    // UPI ID format: username@bankcode
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return upiRegex.test(upiId);
  }

  private validateAccountNumber(accountNumber: string): boolean {
    // Indian bank account numbers are typically 9-18 digits
    const accountRegex = /^\d{9,18}$/;
    return accountRegex.test(accountNumber);
  }

  private validateIFSC(ifsc: string): boolean {
    // IFSC format: 4 letters + 0 + 6 alphanumeric
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  }
}

export const fiatOfframpService = new FiatOfframpService();
export default fiatOfframpService;
