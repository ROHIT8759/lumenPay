import { Keypair, Networks } from '@stellar/stellar-sdk';
import { supabase } from './supabaseClient';

const NONCE_TTL_MS = 5 * 60 * 1000;

export interface NonceResponse {
    nonce: string;
    expiresAt: number;
}

export interface SignatureVerification {
    valid: boolean;
    walletAddress?: string;
    error?: string;
}

export interface AuthTokenResponse {
    token: string;
    walletAddress: string;
    expiresAt: number;
}

class WalletAuthService {
    private nonceStore: Map<string, { nonce: string; expiresAt: number }> = new Map();

    generateNonce(): NonceResponse {
        const nonce = this.generateRandomString(32);
        const expiresAt = Date.now() + NONCE_TTL_MS;

        this.nonceStore.set(nonce, { nonce, expiresAt });

        return { nonce, expiresAt };
    }

    verifySignedNonce(nonce: string, signature: string): SignatureVerification {
        const storedNonce = this.nonceStore.get(nonce);

        if (!storedNonce) {
            return {
                valid: false,
                error: 'Nonce not found or expired',
            };
        }

        if (Date.now() > storedNonce.expiresAt) {
            this.nonceStore.delete(nonce);
            return {
                valid: false,
                error: 'Nonce expired',
            };
        }

        try {
            const message = Buffer.from(nonce, 'utf-8');
            const signatureBuffer = Buffer.from(signature, 'base64');

            const publicKey = Keypair.fromPublicKey(
                this.extractPublicKeyFromSignature(signature, nonce)
            );

            const isValid = publicKey.verify(message, signatureBuffer);

            if (isValid) {
                this.nonceStore.delete(nonce);
                return {
                    valid: true,
                    walletAddress: publicKey.publicKey(),
                };
            }

            return {
                valid: false,
                error: 'Signature verification failed',
            };
        } catch (error: any) {
            return {
                valid: false,
                error: error.message || 'Failed to verify signature',
            };
        }
    }

    async createUser(walletAddress: string): Promise<{ success: boolean; userId?: string; error?: string }> {
        try {
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('wallet_address', walletAddress)
                .single();

            if (existing) {
                return { success: true, userId: existing.id };
            }

            const { data, error } = await supabase
                .from('users')
                .insert({
                    wallet_address: walletAddress,
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, userId: data?.id };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async verifyTransaction(
        transactionXdr: string,
        sourcePublicKey: string
    ): Promise<{ valid: boolean; error?: string }> {
        try {
            const transaction = Keypair.fromPublicKey(sourcePublicKey);
            return { valid: true };
        } catch (error: any) {
            return {
                valid: false,
                error: error.message || 'Invalid transaction or source key',
            };
        }
    }

    private generateRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private extractPublicKeyFromSignature(signature: string, nonce: string): string {
        try {
            const decoded = Buffer.from(signature, 'base64');
            if (decoded.length < 32) {
                throw new Error('Invalid signature format');
            }
            return decoded.slice(0, 32).toString('base64');
        } catch (error) {
            throw new Error('Failed to extract public key from signature');
        }
    }

    cleanupExpiredNonces(): void {
        const now = Date.now();
        for (const [nonce, data] of this.nonceStore.entries()) {
            if (now > data.expiresAt) {
                this.nonceStore.delete(nonce);
            }
        }
    }
}

export const walletAuthService = new WalletAuthService();

setInterval(() => {
    walletAuthService.cleanupExpiredNonces();
}, 60000);
