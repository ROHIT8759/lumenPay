import jwt from 'jsonwebtoken';

/**
 * JWT Token Service
 * 
 * Handles JWT token issuance and verification for authenticated sessions.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

export interface TokenPayload {
    publicKey: string;
    userId: string;
    iat?: number;
    exp?: number;
}

export class TokenService {
    /**
     * Issue a JWT token for an authenticated wallet
     * @param publicKey Stellar public key
     * @param userId User ID from database
     * @returns JWT token string
     */
    issueToken(publicKey: string, userId: string): string {
        const payload: TokenPayload = {
            publicKey,
            userId,
        };

        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRY,
        });
    }

    /**
     * Verify a JWT token and extract payload
     * @param token JWT token string
     * @returns Decoded payload or null if invalid
     */
    verifyToken(token: string): TokenPayload | null {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
            return decoded;
        } catch (error) {
            return null;
        }
    }

    /**
     * Extract token from Authorization header
     * @param authHeader Authorization header value
     * @returns Token string or null
     */
    extractToken(authHeader: string | undefined): string | null {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
}

export const tokenService = new TokenService();
