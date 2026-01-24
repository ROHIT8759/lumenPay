import { SecureStorage } from '../lumenvault/SecureStorage';
import { Config } from '../config';

/**
 * Auth API Client
 * 
 * Handles wallet-based authentication with the backend.
 */

const API_URL = Config.apiUrl;
const TOKEN_KEY = 'lumenpay_jwt_token';

export interface NonceResponse {
  nonce: string;
  expiresAt: string;
  message: string;
}

export interface VerifyResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    publicKey: string;
  };
}

export class AuthApi {
  /**
   * Request a nonce for wallet signing
   * @param publicKey Stellar public key
   * @returns Nonce data
   */
  async requestNonce(publicKey: string): Promise<NonceResponse> {
    const response = await fetch(
      `${API_URL}/auth/nonce?publicKey=${encodeURIComponent(publicKey)}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to request nonce');
    }

    return response.json();
  }

  /**
   * Register a new wallet (Signup)
   * @param publicKey Stellar public key
   */
  async signup(publicKey: string): Promise<{ success: boolean; user?: any }> {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicKey,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    return response.json();
  }

  /**
   * Verify wallet signature and get JWT token
   * @param publicKey Stellar public key
   * @param signature Base64 signature
   * @param nonce Nonce that was signed
   * @returns JWT token and user info
   */
  async verifyWallet(
    publicKey: string,
    signature: string,
    nonce: string,
  ): Promise<VerifyResponse> {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicKey,
        signature,
        nonce,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const data = await response.json();

    // Store token in SecureStorage
    await SecureStorage.setItem(TOKEN_KEY, data.token);

    return data;
  }

  /**
   * Get stored JWT token
   * @returns JWT token or null
   */
  async getStoredToken(): Promise<string | null> {
    return await SecureStorage.getItem(TOKEN_KEY);
  }

  /**
   * Clear stored token (logout)
   */
  async clearSession(): Promise<void> {
    await SecureStorage.deleteItem(TOKEN_KEY);
  }

  /**
   * Check if user is authenticated
   * @returns True if token exists
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return token !== null;
  }

  /**
   * Authenticated Fetch Wrapper
   */
  async authenticatedFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getStoredToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    const fullUrl = url.startsWith('http')
      ? url
      : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;

    return fetch(fullUrl, {
      ...options,
      headers,
    });
  }
}

export const authApi = new AuthApi();
