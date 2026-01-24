














import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';


const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';


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
            
            const response = await fetch(`${API_BASE_URL}/api/kyc/didit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wallet_address: walletAddress
                })
            });

            const result: KYCStartResponse = await response.json();

            if (!result.success || !result.verification_url) {
                return {
                    success: false,
                    error: result.error || 'Failed to start verification'
                };
            }

            
            if (result.session_id) {
                await SecureStore.setItemAsync(PENDING_KYC_SESSION_KEY, result.session_id);
            }

            return result;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            console.error('[DiditKYC] Start verification error:', errorMessage);
            return {
                success: false,
                error: errorMessage
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
                `${API_BASE_URL}/api/kyc/didit?wallet_address=${encodeURIComponent(walletAddress)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            return await response.json();

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    


    async getSessionStatus(sessionId: string): Promise<KYCStatusResponse> {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/kyc/didit?session_id=${encodeURIComponent(sessionId)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            return await response.json();

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    



    async pollForCompletion(
        walletAddress: string,
        options: {
            intervalMs?: number;
            timeoutMs?: number;
            onStatusChange?: (status: string) => void;
        } = {}
    ): Promise<KYCStatusResponse> {
        const {
            intervalMs = 3000,
            timeoutMs = 300000, 
            onStatusChange
        } = options;

        const startTime = Date.now();

        return new Promise((resolve) => {
            const poll = async () => {
                
                if (Date.now() - startTime > timeoutMs) {
                    resolve({
                        success: false,
                        status: 'EXPIRED',
                        error: 'Verification timed out'
                    });
                    return;
                }

                const result = await this.getStatus(walletAddress);

                if (!result.success) {
                    
                    setTimeout(poll, intervalMs);
                    return;
                }

                
                if (onStatusChange && result.status) {
                    onStatusChange(result.status);
                }

                
                if (result.status === 'APPROVED' || result.status === 'REJECTED' || result.status === 'EXPIRED') {
                    resolve(result);
                    return;
                }

                
                setTimeout(poll, intervalMs);
            };

            poll();
        });
    }

    


    async getPendingSession(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(PENDING_KYC_SESSION_KEY);
        } catch {
            return null;
        }
    }

    


    async clearPendingSession(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(PENDING_KYC_SESSION_KEY);
        } catch {
            
        }
    }

    


    async isVerified(walletAddress: string): Promise<boolean> {
        const result = await this.getStatus(walletAddress);
        return result.success && result.status === 'APPROVED';
    }

    


    getStatusText(status: string): string {
        switch (status) {
            case 'NOT_STARTED':
                return 'Not Verified';
            case 'PENDING':
                return 'Verification In Progress';
            case 'APPROVED':
                return 'Verified ✓';
            case 'REJECTED':
                return 'Verification Failed';
            case 'EXPIRED':
                return 'Verification Expired';
            default:
                return 'Unknown Status';
        }
    }

    


    getStatusColor(status: string): string {
        switch (status) {
            case 'APPROVED':
                return '#22C55E'; 
            case 'PENDING':
                return '#F59E0B'; 
            case 'REJECTED':
            case 'EXPIRED':
                return '#EF4444'; 
            default:
                return '#6B7280'; 
        }
    }
}

export const diditKYC = new DiditKYCService();
