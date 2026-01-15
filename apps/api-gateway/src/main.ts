import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createLogger } from '@protecliter/logger';
import { authMiddleware } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';

const logger = createLogger('api-gateway');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Service URLs
const SERVICES = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    crawler: process.env.CRAWLER_SERVICE_URL || 'http://localhost:3002',
    detection: process.env.DETECTION_SERVICE_URL || 'http://localhost:3003',
    cases: process.env.CASE_SERVICE_URL || 'http://localhost:3004',
    takedown: process.env.TAKEDOWN_SERVICE_URL || 'http://localhost:3005',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3006',
};

// Proxy configuration
const createServiceProxy = (target: string) => createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(/^\/api\/v1\/[^/]+/, '/api/v1'),
    on: {
        error: (err, req, res) => {
            logger.error(`Proxy error: ${err.message}`);
            (res as express.Response).status(503).json({
                success: false,
                error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' },
            });
        },
    },
});

// Public routes (no auth required)
app.use('/api/v1/auth/register', createServiceProxy(SERVICES.auth));
app.use('/api/v1/auth/login', createServiceProxy(SERVICES.auth));
app.use('/api/v1/auth/refresh', createServiceProxy(SERVICES.auth));

// Protected routes (auth required)
app.use('/api/v1/auth', authMiddleware, createServiceProxy(SERVICES.auth));
app.use('/api/v1/users', authMiddleware, createServiceProxy(SERVICES.auth));
app.use('/api/v1/works', authMiddleware, createServiceProxy(SERVICES.cases));
app.use('/api/v1/monitoring-jobs', authMiddleware, createServiceProxy(SERVICES.crawler));
app.use('/api/v1/detections', authMiddleware, createServiceProxy(SERVICES.detection));
app.use('/api/v1/cases', authMiddleware, createServiceProxy(SERVICES.cases));
app.use('/api/v1/takedowns', authMiddleware, createServiceProxy(SERVICES.takedown));
app.use('/api/v1/subscriptions', authMiddleware, createServiceProxy(SERVICES.billing));
app.use('/api/v1/plans', authMiddleware, createServiceProxy(SERVICES.billing));
app.use('/api/v1/billing', authMiddleware, createServiceProxy(SERVICES.billing));

// Public report endpoint with stricter rate limiting
const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 reports per hour per IP
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Report limit exceeded' } },
});
app.use('/api/v1/public/report', reportLimiter, createServiceProxy(SERVICES.cases));

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    });
});

const PORT = process.env.API_GATEWAY_PORT || 3000;

app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
    logger.info(`Services configured: ${Object.keys(SERVICES).join(', ')}`);
});
