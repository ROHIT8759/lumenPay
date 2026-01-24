import { Linking } from 'react-native';
import { SecureStorage } from './lumenvault/SecureStorage';
import { Config } from './config';

const API_BASE_URL = Config.apiUrl;

const PENDING_KYC_SESSION_KEY = 'lumenpay_pending_kyc_session';

export interface KYCStartResponse {
  success: boolean;
  verification_url?: string;
  session_id?: string;
  error?: string;
}

export interface KYCStatusResponse {
  success: boolean;
  status?: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  confidence_score?: number;
  verified_at?: string;
  error?: string;
}

class DiditKYCService {
  async startVerification(walletAddress: string): Promise<KYCStartResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/kyc/didit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
        }),
      });

      const result: KYCStartResponse = await response.json();

      if (!result.success || !result.verification_url) {
        return {
          success: false,
          error: result.error || 'Failed to start verification',
        };
      }

      if (result.session_id) {
        await SecureStorage.setItem(PENDING_KYC_SESSION_KEY, result.session_id);
      }

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Network error';
      console.error('[DiditKYC] Start verification error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async openVerificationUrl(url: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        console.error('[DiditKYC] Cannot open URL:', url);
        return false;
      }

      await Linking.openURL(url);
      return true;
    } catch (error) {
      console.error('[DiditKYC] Open URL error:', error);
      return false;
    }
  }

  async getStatus(walletAddress: string): Promise<KYCStatusResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/kyc/status?wallet_address=${encodeURIComponent(walletAddress)}`,
      );

      if (!response.ok) {
        return {
          success: false,
          error: 'Failed to get KYC status',
        };
      }

      return await response.json();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Network error';
      console.error('[DiditKYC] Get status error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async pollForCompletion(
    walletAddress: string,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      onStatusChange?: (status: string) => void;
    } = {},
  ): Promise<KYCStatusResponse> {
    const { intervalMs = 3000, timeoutMs = 600000, onStatusChange } = options;

    const startTime = Date.now();

    return new Promise(resolve => {
      const poll = async () => {
        if (Date.now() - startTime > timeoutMs) {
          resolve({
            success: false,
            status: 'EXPIRED',
            error: 'Verification timeout',
          });
          return;
        }

        const result = await this.getStatus(walletAddress);

        if (result.success && result.status) {
          if (onStatusChange) {
            onStatusChange(result.status);
          }

          if (
            result.status === 'APPROVED' ||
            result.status === 'REJECTED' ||
            result.status === 'EXPIRED'
          ) {
            resolve(result);
            return;
          }
        }

        setTimeout(poll, intervalMs);
      };

      poll();
    });
  }

  async clearPendingSession(): Promise<void> {
    await SecureStorage.deleteItem(PENDING_KYC_SESSION_KEY);
  }

  async getPendingSessionId(): Promise<string | null> {
    return await SecureStorage.getItem(PENDING_KYC_SESSION_KEY);
  }
}

export const diditKYC = new DiditKYCService();
