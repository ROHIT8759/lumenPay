/**
 * API Client for LumenPay
 * 
 * Centralized client for communicating with the Express backend.
 * All API calls should go through this client to ensure:
 * - Consistent authentication headers
 * - Proper error handling
 * - Type safety
 */

import { API } from './config';

const API_URL = API.BASE_URL;

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

/**
 * Get authentication headers from localStorage
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  
  if (userId) {
    headers['x-user-id'] = userId;
  }
  
  return headers;
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  /**
   * Request a nonce for wallet authentication
   */
  async requestNonce(publicKey: string) {
    return apiFetch<{ nonce: string; expiresAt: string; message: string }>(
      `${API.AUTH.NONCE}?publicKey=${encodeURIComponent(publicKey)}`
    );
  },

  /**
   * Verify signature and get JWT token
   */
  async verifySignature(publicKey: string, signature: string, nonce: string) {
    return apiFetch<{ success: boolean; token: string; user: { id: string; publicKey: string } }>(
      API.AUTH.VERIFY,
      {
        method: 'POST',
        body: JSON.stringify({ publicKey, signature, nonce }),
      }
    );
  },
};

// ============================================================================
// TRANSACTION API
// ============================================================================

export const txApi = {
  /**
   * Build an unsigned payment transaction (requires auth)
   */
  async buildPayment(to: string, amount: string, assetCode?: string, assetIssuer?: string) {
    return apiFetch<{ success: boolean; xdr: string; network: string }>(
      API.TX.BUILD,
      {
        method: 'POST',
        body: JSON.stringify({ to, amount, assetCode, assetIssuer }),
      }
    );
  },

  /**
   * Submit a signed transaction (requires auth)
   */
  async submitTransaction(signedXDR: string, to?: string, amount?: string) {
    return apiFetch<{ success: boolean; hash: string }>(
      API.TX.SUBMIT,
      {
        method: 'POST',
        body: JSON.stringify({ signedXDR, to, amount }),
      }
    );
  },
};

// ============================================================================
// KYC API
// ============================================================================

export const kycApi = {
  /**
   * Start KYC verification with Didit
   */
  async startVerification() {
    return apiFetch<{ redirectUrl: string; sessionId: string }>(
      API.KYC.DIDIT_START,
      { method: 'POST' }
    );
  },

  /**
   * Check KYC status
   */
  async getStatus() {
    return apiFetch<{ status: string; verified: boolean }>(
      API.KYC.DIDIT_STATUS
    );
  },
};

// ============================================================================
// LEDGER API (Off-Chain)
// ============================================================================

export const ledgerApi = {
  /**
   * Get all off-chain balances
   */
  async getBalances() {
    return apiFetch<{ walletAddress: string; balances: Array<{ balance: number; asset: string }> }>(
      API.LEDGER.BALANCE
    );
  },

  /**
   * Get specific asset balance
   */
  async getBalance(asset: string) {
    return apiFetch<{ balance: number; asset: string; walletAddress: string }>(
      `${API.LEDGER.BALANCE}/${asset}`
    );
  },

  /**
   * Internal off-chain transfer
   */
  async transfer(toWallet: string, amount: number, asset: string = 'XLM', memo?: string) {
    return apiFetch<{ success: boolean; transactionId: string }>(
      API.LEDGER.TRANSFER,
      {
        method: 'POST',
        body: JSON.stringify({ toWallet, amount, asset, memo }),
      }
    );
  },

  /**
   * Get transaction history
   */
  async getTransactions(limit?: number, ledger?: 'ON_CHAIN' | 'OFF_CHAIN' | 'HYBRID') {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (ledger) params.append('ledger', ledger);
    return apiFetch<{ transactions: any[] }>(
      `${API.LEDGER.TRANSACTIONS}?${params.toString()}`
    );
  },
};

// ============================================================================
// RAMP API (On/Off Ramps)
// ============================================================================

export const rampApi = {
  /**
   * Create on-ramp intent (INR -> Crypto)
   */
  async createOnRamp(inrAmount: number, asset?: string) {
    return apiFetch<{
      id: string;
      inrAmount: number;
      cryptoAmount: number;
      exchangeRate: number;
      paymentInstructions: any;
    }>(
      API.RAMP.ON_CREATE,
      {
        method: 'POST',
        body: JSON.stringify({ inrAmount, asset }),
      }
    );
  },

  /**
   * Get on-ramp intent status
   */
  async getOnRampStatus(intentId: string) {
    return apiFetch<{ intent: any }>(
      `${API.RAMP.ON_STATUS}/${intentId}`
    );
  },

  /**
   * Create off-ramp intent (Crypto -> INR)
   */
  async createOffRamp(
    cryptoAmount: number,
    asset?: string,
    bankAccountNo?: string,
    bankIfsc?: string,
    upiId?: string
  ) {
    return apiFetch<{
      id: string;
      cryptoAmount: number;
      inrAmount: number;
      exchangeRate: number;
    }>(
      API.RAMP.OFF_CREATE,
      {
        method: 'POST',
        body: JSON.stringify({ cryptoAmount, asset, bankAccountNo, bankIfsc, upiId }),
      }
    );
  },

  /**
   * Get off-ramp intent status
   */
  async getOffRampStatus(intentId: string) {
    return apiFetch<{ intent: any }>(
      `${API.RAMP.OFF_STATUS}/${intentId}`
    );
  },

  /**
   * Get ramp history
   */
  async getHistory() {
    return apiFetch<{ onRamps: any[]; offRamps: any[] }>(
      API.RAMP.HISTORY
    );
  },
};

// ============================================================================
// ESCROW API
// ============================================================================

export const escrowApi = {
  /**
   * Build lock collateral invocation
   */
  async buildLock(params: {
    loanId: number;
    lender: string;
    collateralToken: string;
    collateralAmount: string;
    loanAmount: string;
    durationSeconds: number;
  }) {
    return apiFetch<{ xdr: string; network: string }>(
      API.ESCROW.BUILD_LOCK,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  },

  /**
   * Build release collateral invocation
   */
  async buildRelease(loanId: number) {
    return apiFetch<{ xdr: string; network: string }>(
      API.ESCROW.BUILD_RELEASE,
      {
        method: 'POST',
        body: JSON.stringify({ loanId }),
      }
    );
  },

  /**
   * Get escrow status
   */
  async getStatus(loanId: number) {
    return apiFetch<{ escrow: any }>(
      `${API.ESCROW.STATUS}/${loanId}`
    );
  },
};

// ============================================================================
// STOCKS API
// ============================================================================

export const stocksApi = {
  /**
   * List all available stocks
   */
  async list() {
    return apiFetch<{ stocks: any[]; count: number }>(
      API.STOCKS.LIST
    );
  },

  /**
   * Get stock quote
   */
  async getQuote(symbol: string) {
    return apiFetch<{ quote: any }>(
      `${API.STOCKS.QUOTE}/${symbol}`
    );
  },

  /**
   * Buy stock
   */
  async buy(symbol: string, units: number, paymentAsset?: string) {
    return apiFetch<{ success: boolean; position: any }>(
      API.STOCKS.BUY,
      {
        method: 'POST',
        body: JSON.stringify({ symbol, units, paymentAsset }),
      }
    );
  },

  /**
   * Sell stock
   */
  async sell(symbol: string, units: number) {
    return apiFetch<{ success: boolean; proceeds: number }>(
      API.STOCKS.SELL,
      {
        method: 'POST',
        body: JSON.stringify({ symbol, units }),
      }
    );
  },

  /**
   * Get user's portfolio
   */
  async getPortfolio() {
    return apiFetch<{ positions: any[]; totalValue: number }>(
      API.STOCKS.PORTFOLIO
    );
  },
};

// ============================================================================
// TELEGRAM API
// ============================================================================

export const telegramApi = {
  /**
   * Request link code
   */
  async requestLinkCode() {
    return apiFetch<{ linkCode: string; expiresAt: string; botUsername: string; instructions: string }>(
      API.TELEGRAM.LINK_REQUEST,
      { method: 'POST' }
    );
  },

  /**
   * Check link status
   */
  async getStatus() {
    return apiFetch<{ linked: boolean; telegramUserId?: string }>(
      API.TELEGRAM.STATUS
    );
  },

  /**
   * Unlink Telegram
   */
  async unlink() {
    return apiFetch<{ success: boolean }>(
      API.TELEGRAM.UNLINK,
      { method: 'POST' }
    );
  },
};

// ============================================================================
// WALLET API
// ============================================================================

export const walletApi = {
  /**
   * Get wallet balance
   */
  async getBalance(publicKey: string) {
    return apiFetch<{ native: string; usdc: string }>(
      `/api/wallet/balance?publicKey=${encodeURIComponent(publicKey)}`
    );
  },
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  auth: authApi,
  tx: txApi,
  kyc: kycApi,
  ledger: ledgerApi,
  ramp: rampApi,
  escrow: escrowApi,
  stocks: stocksApi,
  telegram: telegramApi,
  wallet: walletApi,
};
