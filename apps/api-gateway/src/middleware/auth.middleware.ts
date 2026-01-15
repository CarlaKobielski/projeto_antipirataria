import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '@protecliter/shared-types';

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

export function authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
        });
        return;
    }

    const token = authHeader.slice(7);

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'dev-secret-change-in-production',
        ) as JwtPayload;

        req.user = decoded;

        // Forward user info to downstream services
        req.headers['x-user-id'] = decoded.sub;
        req.headers['x-user-email'] = decoded.email;
        req.headers['x-user-role'] = decoded.role;
        if (decoded.tenantId) {
            req.headers['x-tenant-id'] = decoded.tenantId;
        }

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' },
            });
            return;
        }

        res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Invalid access token' },
        });
    }
}
