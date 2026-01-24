import { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

/**
 * Authentication Service
 * 
 * Implements wallet-based authentication using challenge-response nonces.
 * This service NEVER handles private keys - it only verifies signatures.
 */

const NONCE_EXPIRY_MINUTES = 10;

export interface NonceResponse {
    nonce: string;
    expiresAt: Date;
}

export interface VerifyResult {
    success: boolean;
    publicKey?: string;
    error?: string;
}

export class AuthService {
    private supabase: SupabaseClient;

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Generate a time-limited nonce for wallet signing
     * @param publicKey Stellar public key (G...)
     * @returns Nonce and expiration timestamp
     */
    async generateNonce(publicKey: string): Promise<NonceResponse> {
        // Validate public key format
        if (!publicKey.startsWith('G') || publicKey.length !== 56) {
            throw new Error('Invalid Stellar public key format');
        }

        // Generate cryptographically secure random nonce
        const nonce = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000);

        // Store nonce in database (upsert to handle multiple requests from same wallet)
        const { error } = await this.supabase
            .from('auth_nonces')
            .upsert({
                public_key: publicKey,
                nonce,
                expires_at: expiresAt.toISOString(),
            }, {
                onConflict: 'public_key'
            });

        if (error) {
            throw new Error(`Failed to store nonce: ${error.message}`);
        }

        return { nonce, expiresAt };
    }

    /**
     * Verify a signed nonce from a wallet
     * @param publicKey Stellar public key
     * @param signature Base64-encoded signature
     * @param nonce The nonce that was signed
     * @returns Verification result
     */
    async verifySignature(
        publicKey: string,
        signature: string,
        nonce: string
    ): Promise<VerifyResult> {
        // Retrieve stored nonce from database
        const { data: nonceData, error } = await this.supabase
            .from('auth_nonces')
            .select('nonce, expires_at')
            .eq('public_key', publicKey)
            .single();

        if (error || !nonceData) {
            return {
                success: false,
                error: 'No nonce found for this public key. Please request a new nonce.',
            };
        }

        // Check if nonce matches
        if (nonceData.nonce !== nonce) {
            return {
                success: false,
                error: 'Nonce mismatch. Please request a new nonce.',
            };
        }

        // Check if nonce is expired
        const expiresAt = new Date(nonceData.expires_at);
        if (expiresAt < new Date()) {
            // Clean up expired nonce
            await this.supabase
                .from('auth_nonces')
                .delete()
                .eq('public_key', publicKey);

            return {
                success: false,
                error: 'Nonce expired. Please request a new nonce.',
            };
        }

        // Verify the signature using Stellar SDK
        try {
            const { Keypair } = await import('@stellar/stellar-sdk');

            const keypair = Keypair.fromPublicKey(publicKey);
            const messageBuffer = Buffer.from(nonce, 'utf-8');
            const signatureBuffer = Buffer.from(signature, 'base64');

            const isValid = keypair.verify(messageBuffer, signatureBuffer);

            if (!isValid) {
                return {
                    success: false,
                    error: 'Invalid signature',
                };
            }

            // Delete nonce after successful verification (one-time use)
            await this.supabase
                .from('auth_nonces')
                .delete()
                .eq('public_key', publicKey);

            return {
                success: true,
                publicKey,
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Signature verification failed: ${error.message}`,
            };
        }
    }

    /**
     * Ensure user profile and wallet exist in database
     * Called after successful signature verification
     */
    async ensureUserExists(publicKey: string): Promise<{ userId: string; isNew: boolean }> {
        // Check if wallet already exists
        const { data: existingWallet } = await this.supabase
            .from('wallets')
            .select('user_id, id')
            .eq('public_key', publicKey)
            .single();

        if (existingWallet) {
            return { userId: existingWallet.user_id, isNew: false };
        }

        // Create new profile and wallet
        // Note: We generate a UUID for the user since Supabase auth is deprecated
        const userId = crypto.randomUUID();

        // Insert profile
        const { error: profileError } = await this.supabase
            .from('profiles')
            .insert({
                id: userId,
                display_name: `User ${publicKey.substring(0, 8)}`,
                created_at: new Date().toISOString(),
            });

        if (profileError) {
            throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        // Insert wallet
        const { error: walletError } = await this.supabase
            .from('wallets')
            .insert({
                user_id: userId,
                public_key: publicKey,
                wallet_type: 'non-custodial',
                network: 'testnet',
                is_primary: true,
            });

        if (walletError) {
            // Rollback profile creation
            await this.supabase.from('profiles').delete().eq('id', userId);
            throw new Error(`Failed to create wallet: ${walletError.message}`);
        }

        return { userId, isNew: true };
    }

    /**
     * Clean up expired nonces (should be run periodically)
     */
    async cleanupExpiredNonces(): Promise<number> {
        const { data, error } = await this.supabase
            .from('auth_nonces')
            .delete()
            .lt('expires_at', new Date().toISOString())
            .select();

        if (error) {
            console.error('Failed to cleanup expired nonces:', error);
            return 0;
        }

        return data?.length || 0;
    }
}
