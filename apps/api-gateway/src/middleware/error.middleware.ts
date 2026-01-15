import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('api-gateway');

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message,
        },
    });
}
