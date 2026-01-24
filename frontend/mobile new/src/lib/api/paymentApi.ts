import { authApi } from './authApi';
import { Config } from '../config';

/**
 * Payment API Client
 * 
 * Handles backend API calls for payment transactions.
 */

const API_URL = Config.apiUrl;

export interface BuildPaymentRequest {
  to: string;
  amount: string;
  assetCode?: string;
  assetIssuer?: string;
}

export interface BuildPaymentResponse {
  success: boolean;
  xdr: string;
  network: string;
}

export interface SubmitPaymentRequest {
  signedXDR: string;
  to: string;
  amount: string;
  assetCode?: string;
  assetIssuer?: string;
}

export interface SubmitPaymentResponse {
  success: boolean;
  hash: string;
  ledger?: number;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'success' | 'failed';
  ledger?: number;
  createdAt?: string;
  error?: string;
}

export class PaymentApi {
  /**
   * Get authorization header with JWT token
   */
  private async getAuthHeader(): Promise<{ Authorization: string }> {
    const token = await authApi.getStoredToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Build unsigned payment transaction
   * @param request Payment details
   * @returns Unsigned transaction XDR
   */
  async buildPayment(request: BuildPaymentRequest): Promise<BuildPaymentResponse> {
    const headers = await this.getAuthHeader();

    const response = await fetch(`${API_URL}/transactions/build-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to build payment');
    }

    return response.json();
  }

  /**
   * Submit signed payment transaction
   * @param request Signed transaction data
   * @returns Transaction hash and status
   */
  async submitSignedPayment(
    request: SubmitPaymentRequest,
  ): Promise<SubmitPaymentResponse> {
    const headers = await this.getAuthHeader();

    const response = await fetch(`${API_URL}/transactions/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit payment');
    }

    return response.json();
  }

  /**
   * Get transaction status
   * @param hash Transaction hash
   * @returns Transaction status
   */
  async getPaymentStatus(hash: string): Promise<TransactionStatus> {
    const headers = await this.getAuthHeader();

    const response = await fetch(`${API_URL}/transactions/${hash}/status`, {
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get payment status');
    }

    return response.json();
  }

  /**
   * Get account balances
   * @param publicKey Public key to query
   * @returns Account details
   */
  async getAccountBalances(publicKey: string): Promise<any> {
    const headers = await this.getAuthHeader();

    const response = await fetch(
      `${API_URL}/transactions/account/${publicKey}`,
      {
        headers,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get account balances');
    }

    return response.json();
  }
}

export const paymentApi = new PaymentApi();
