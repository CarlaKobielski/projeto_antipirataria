import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a new registry for application metrics
const register = new Registry();

// Collect default Node.js metrics
collectDefaultMetrics({
    register,
    prefix: 'protecliter_',
});

// HTTP Request metrics
export const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status', 'service'],
    registers: [register],
});

export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status', 'service'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
});

// Business metrics
export const detectionsTotal = new Counter({
    name: 'protecliter_detections_total',
    help: 'Total number of detections',
    labelNames: ['status', 'confidence'],
    registers: [register],
});

export const takedownsTotal = new Counter({
    name: 'protecliter_takedowns_total',
    help: 'Total number of takedown requests',
    labelNames: ['status', 'platform'],
    registers: [register],
});

export const crawlJobsTotal = new Counter({
    name: 'protecliter_crawl_jobs_total',
    help: 'Total number of crawl jobs processed',
    labelNames: ['status'],
    registers: [register],
});

export const crawlJobDuration = new Histogram({
    name: 'protecliter_crawl_job_duration_seconds',
    help: 'Duration of crawl jobs in seconds',
    labelNames: ['status'],
    buckets: [1, 5, 10, 30, 60, 120, 300],
    registers: [register],
});

// Queue metrics
export const queueWaiting = new Gauge({
    name: 'bullmq_queue_waiting',
    help: 'Number of jobs waiting in queue',
    labelNames: ['queue'],
    registers: [register],
});

export const queueActive = new Gauge({
    name: 'bullmq_queue_active',
    help: 'Number of active jobs in queue',
    labelNames: ['queue'],
    registers: [register],
});

export const queueCompleted = new Counter({
    name: 'bullmq_queue_completed',
    help: 'Total number of completed jobs',
    labelNames: ['queue'],
    registers: [register],
});

export const queueFailed = new Counter({
    name: 'bullmq_queue_failed',
    help: 'Total number of failed jobs',
    labelNames: ['queue'],
    registers: [register],
});

// Authentication metrics
export const authAttemptsTotal = new Counter({
    name: 'protecliter_auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['type', 'status'],
    registers: [register],
});

// Billing metrics
export const subscriptionEvents = new Counter({
    name: 'protecliter_subscription_events_total',
    help: 'Total number of subscription events',
    labelNames: ['event_type', 'plan'],
    registers: [register],
});

// Export the registry for metrics endpoint
export { register };

// Middleware factory for Express/NestJS
export function createMetricsMiddleware(serviceName: string) {
    return (req: any, res: any, next: any) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            const path = req.route?.path || req.path || 'unknown';
            const labels = {
                method: req.method,
                path,
                status: res.statusCode.toString(),
                service: serviceName,
            };

            httpRequestsTotal.inc(labels);
            httpRequestDuration.observe(labels, duration);
        });

        next();
    };
}

// Utility to update queue metrics
export async function updateQueueMetrics(queueName: string, counts: {
    waiting: number;
    active: number;
}) {
    queueWaiting.set({ queue: queueName }, counts.waiting);
    queueActive.set({ queue: queueName }, counts.active);
}
