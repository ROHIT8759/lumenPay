import jwt from 'jsonwebtoken';

/**
 * JWT Token Service
 * 
 * Handles JWT token issuance and verification for authenticated sessions.
 */

const JWT_EXPIRY = '7d'; // 7 days

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is required');
    }
    return secret;
}

export interface TokenPayload {
    walletAddress: string;
    iat?: number;
    exp?: number;
}

export class TokenService {
    /**
     * Issue a JWT token for an authenticated wallet
     * @param walletAddress Stellar public key
     * @returns JWT token string
     */
    issueToken(walletAddress: string): string {
        const payload: TokenPayload = {
            walletAddress,
        };

        return jwt.sign(payload, getJwtSecret(), {
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
            const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
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
