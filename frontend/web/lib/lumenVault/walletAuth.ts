import { signingEngine } from './signingEngine';
import { WalletData } from './keyManager';
import { API } from '../config';
import { Keypair } from '@stellar/stellar-sdk';

export interface AuthNonceResponse {
    nonce: string;
    expiresAt: number;
}

export interface AuthVerifyResponse {
    token: string;
    user: {
        address: string;
    };
}

export interface AuthSession {
    token: string;
    address: string;
    expiresAt: number;
}

class WalletAuthService {
    private session: AuthSession | null = null;
    private readonly SESSION_KEY = 'lumenvault_session';


    async requestNonce(publicKey: string): Promise<{
        nonce: string;
        expiresAt: number;
        error?: string;
    }> {
        try {
            const response = await fetch(`${API.BASE_URL}${API.AUTH.NONCE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ publicKey }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data: AuthNonceResponse = await response.json();
            return data;
        } catch (error: any) {
            return {
                nonce: '',
                expiresAt: 0,
                error: error.message || 'Failed to request nonce',
            };
        }
    }


    async signIn(
        walletData: WalletData,
        passphrase: string
    ): Promise<{
        success: boolean;
        session?: AuthSession;
        error?: string;
    }> {
        try {
            const publicKey = walletData.publicKey;


            const nonceResult = await this.requestNonce(publicKey);
            if (nonceResult.error || !nonceResult.nonce) {
                throw new Error(nonceResult.error || 'Failed to get nonce');
            }


            const signResult = await signingEngine.signMessage({
                message: nonceResult.nonce,
                walletData,
                passphrase,
            });

            if (signResult.error || !signResult.signedMessage.signature) {
                throw new Error(signResult.error || 'Failed to sign nonce');
            }


            const verifyResponse = await fetch(`${API.BASE_URL}${API.AUTH.VERIFY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    publicKey,
                    signature: signResult.signedMessage.signature,
                    nonce: nonceResult.nonce,
                }),
            });

            if (!verifyResponse.ok) {
                throw new Error(`Verification failed: HTTP ${verifyResponse.status}`);
            }

            const verifyData: AuthVerifyResponse = await verifyResponse.json();


            const session: AuthSession = {
                token: verifyData.token,
                address: verifyData.user.address,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            };

            this.session = session;
            this.persistSession(session);

            return {
                success: true,
                session,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Authentication failed',
            };
        }
    }

    async linkWalletWithKeypair(
        keypair: Keypair
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            const publicKey = keypair.publicKey();
            const nonceResult = await this.requestNonce(publicKey);
            if (nonceResult.error || !nonceResult.nonce) {
                throw new Error(nonceResult.error || 'Failed to get nonce');
            }

            const signature = keypair.sign(Buffer.from(nonceResult.nonce)).toString('base64');

            const verifyResponse = await fetch(`${API.BASE_URL}${API.AUTH.VERIFY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    publicKey,
                    signature,
                    nonce: nonceResult.nonce,
                }),
            });

            if (!verifyResponse.ok) {
                throw new Error(`Verification failed: HTTP ${verifyResponse.status}`);
            }

            const verifyData: AuthVerifyResponse = await verifyResponse.json();

            // Link Wallet to Account
            const linkResponse = await fetch(`${API.BASE_URL}/api/wallet/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${verifyData.token}`
                },
                body: JSON.stringify({ publicKey })
            });

            if (!linkResponse.ok) {
                throw new Error(`Link failed: HTTP ${linkResponse.status}`);
            }

            return { success: true };

        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Link failed',
            };
        }
    }


    signOut(): void {
        this.session = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem(this.SESSION_KEY);
        }
    }


    getSession(): AuthSession | null {
        if (this.session) {

            if (Date.now() > this.session.expiresAt) {
                this.signOut();
                return null;
            }
            return this.session;
        }


        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(this.SESSION_KEY);
            if (stored) {
                try {
                    const session: AuthSession = JSON.parse(stored);
                    if (Date.now() <= session.expiresAt) {
                        this.session = session;
                        return session;
                    }
                } catch {

                    this.signOut();
                }
            }
        }

        return null;
    }


    isAuthenticated(): boolean {
        return !!this.getSession();
    }


    getToken(): string | null {
        const session = this.getSession();
        return session ? session.token : null;
    }


    getAuthenticatedAddress(): string | null {
        const session = this.getSession();
        return session ? session.address : null;
    }


    private persistSession(session: AuthSession): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        }
    }


    async refreshSession(): Promise<{
        success: boolean;
        error?: string;
    }> {
        const currentSession = this.getSession();
        if (!currentSession) {
            return {
                success: false,
                error: 'No active session',
            };
        }

        try {
            const response = await fetch(`${API.BASE_URL}${API.AUTH.SESSION}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${currentSession.token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();


            const updatedSession: AuthSession = {
                ...currentSession,
                expiresAt: data.expiresAt,
            };

            this.session = updatedSession;
            this.persistSession(updatedSession);

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to refresh session',
            };
        }
    }


    async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
        const token = this.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        // Handle relative URLs
        const fullUrl = url.startsWith('http') ? url : `${API.BASE_URL}${url}`;

        return fetch(fullUrl, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
            },
        });
    }
}

export const walletAuth = new WalletAuthService();
