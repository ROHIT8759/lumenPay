import { PrismaClient } from '@prisma/client';
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
    private prisma: PrismaClient;

    constructor(prismaClient: PrismaClient) {
        this.prisma = prismaClient;
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

        // Store nonce in database (create new nonce record)
        await this.prisma.authNonce.create({
            data: {
                walletAddress: publicKey,
                nonce,
                expiresAt,
            },
        });

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
        // Find the specific nonce that matches the wallet and nonce string
        const nonceData = await this.prisma.authNonce.findFirst({
            where: {
                walletAddress: publicKey,
                nonce: nonce,
            },
        });

        if (!nonceData) {
            return {
                success: false,
                error: 'Invalid or expired nonce. Please request a new nonce.',
            };
        }

        // Check if nonce is expired
        if (nonceData.expiresAt < new Date()) {
            // Clean up expired nonce
            await this.prisma.authNonce.delete({
                where: { id: nonceData.id },
            });

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
            await this.prisma.authNonce.delete({
                where: { id: nonceData.id },
            });

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
     * Ensure user profile exists in database
     * Called after successful signature verification
     */
    async ensureUserExists(publicKey: string): Promise<{ userId: string; isNew: boolean }> {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { walletAddress: publicKey },
        });

        if (existingUser) {
            return { userId: existingUser.walletAddress, isNew: false };
        }

        // Create new user
        const newUser = await this.prisma.user.create({
            data: {
                walletAddress: publicKey,
                kycStatus: 'PENDING',
            },
        });
        
        // Initialize default off-chain balance (USDC)
        await this.prisma.offchainBalance.create({
            data: {
                walletAddress: publicKey,
                asset: 'USDC',
                balance: 0.0
            }
        });

        return { userId: newUser.walletAddress, isNew: true };
    }

    /**
     * Clean up expired nonces (should be run periodically)
     */
    async cleanupExpiredNonces(): Promise<number> {
        const result = await this.prisma.authNonce.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });

        return result.count;
    }
}
