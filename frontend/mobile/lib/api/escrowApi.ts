import { authApi } from './authApi';

/**
 * Escrow API Client
 * 
 * Handles backend API calls for Soroban escrow operations.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface BuildEscrowLockRequest {
    loanId: number;
    lender: string;
    collateralToken: string;
    collateralAmount: string;
    loanAmount: string;
    durationSeconds: number;
}

export interface BuildEscrowResponse {
    success: boolean;
    xdr: string;
    network: string;
}

export class EscrowApi {
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
     * Build unsigned escrow lock invocation
     * @param request Escrow lock details
     * @returns Unsigned transaction XDR
     */
    async buildEscrowLock(request: BuildEscrowLockRequest): Promise<BuildEscrowResponse> {
        const headers = await this.getAuthHeader();

        const response = await fetch(`${API_URL}/escrow/build-lock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to build escrow lock');
        }

        return response.json();
    }

    /**
     * Build unsigned escrow release invocation
     * @param loanId Loan ID
     * @returns Unsigned transaction XDR
     */
    async buildEscrowRelease(loanId: number): Promise<BuildEscrowResponse> {
        const headers = await this.getAuthHeader();

        const response = await fetch(`${API_URL}/escrow/build-release`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify({ loanId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to build escrow release');
        }

        return response.json();
    }

    /**
     * Get escrow status from Soroban
     * @param loanId Loan ID
     * @returns Escrow status
     */
    async getEscrowStatus(loanId: number): Promise<any> {
        const headers = await this.getAuthHeader();

        const response = await fetch(`${API_URL}/escrow/${loanId}`, {
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get escrow status');
        }

        return response.json();
    }
}

export const escrowApi = new EscrowApi();
