import { Request, Response, NextFunction } from 'express';
import { tokenService, TokenPayload } from '../services/tokenService';

/**
 * JWT Authentication Middleware
 * 
 * Verifies JWT token and attaches user info to request
 */

export interface AuthenticatedRequest extends Request {
    user?: TokenPayload;
}

export const authenticate = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    const token = tokenService.extractToken(authHeader);

    if (!token) {
        return res.status(401).json({
            error: 'No token provided',
            message: 'Authorization header with Bearer token is required',
        });
    }

    const payload = tokenService.verifyToken(token);

    if (!payload) {
        return res.status(401).json({
            error: 'Invalid token',
            message: 'Token is expired or invalid',
        });
    }

    // Attach user info to request
    req.user = payload;
    next();
};
