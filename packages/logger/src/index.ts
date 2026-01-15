import winston from 'winston';

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp: ts, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${ts} [${service || 'app'}] ${level}: ${message} ${metaStr}`;
});

// Create logger factory
export function createLogger(service: string) {
    const isDev = process.env.NODE_ENV !== 'production';

    return winston.createLogger({
        level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
        defaultMeta: { service },
        format: combine(
            errors({ stack: true }),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        ),
        transports: [
            new winston.transports.Console({
                format: isDev
                    ? combine(colorize(), devFormat)
                    : json(),
            }),
        ],
    });
}

// Default logger instance
export const logger = createLogger('protecliter');

// Export types
export type Logger = ReturnType<typeof createLogger>;
