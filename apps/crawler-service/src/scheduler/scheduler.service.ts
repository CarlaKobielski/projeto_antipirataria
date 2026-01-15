import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlJobMessage } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('crawler-service');

@Injectable()
export class SchedulerService implements OnModuleInit {
    private schedulerInterval: NodeJS.Timeout | null = null;

    constructor(
        private prisma: PrismaService,
        @InjectQueue('crawl') private crawlQueue: Queue,
    ) { }

    onModuleInit() {
        // Start scheduler
        this.startScheduler();
        logger.info('Scheduler service started');
    }

    private startScheduler() {
        // Check for due jobs every minute
        this.schedulerInterval = setInterval(() => {
            this.checkAndQueueDueJobs();
        }, 60 * 1000);

        // Also run immediately on start
        this.checkAndQueueDueJobs();
    }

    private async checkAndQueueDueJobs() {
        try {
            const now = new Date();

            // Find jobs that are due to run
            const dueJobs = await this.prisma.monitoringJob.findMany({
                where: {
                    status: 'ACTIVE',
                    nextRunAt: { lte: now },
                },
                take: 100, // Limit batch size
            });

            for (const job of dueJobs) {
                logger.debug(`Scheduling job: ${job.id}`);

                // Queue crawl jobs
                for (let i = 0; i < job.queries.length; i++) {
                    const query = job.queries[i]!;
                    const message: CrawlJobMessage = {
                        jobId: job.id,
                        workId: job.workId,
                        tenantId: job.tenantId,
                        query,
                        priority: i,
                    };

                    await this.crawlQueue.add('crawl', message, {
                        priority: i,
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 5000 },
                    });
                }

                // Calculate next run time based on cron schedule
                const nextRunAt = this.calculateNextRun(job.schedule);

                await this.prisma.monitoringJob.update({
                    where: { id: job.id },
                    data: {
                        lastRunAt: now,
                        nextRunAt,
                        runCount: { increment: 1 },
                    },
                });
            }

            if (dueJobs.length > 0) {
                logger.info(`Scheduled ${dueJobs.length} jobs`);
            }
        } catch (error: any) {
            logger.error(`Scheduler error: ${error.message}`);
        }
    }

    private calculateNextRun(cronSchedule: string): Date {
        // Simple implementation for common patterns
        // In production, use a proper cron parser like 'cron-parser'

        const now = new Date();

        // Default patterns
        if (cronSchedule === '0 */6 * * *') {
            // Every 6 hours
            return new Date(now.getTime() + 6 * 60 * 60 * 1000);
        }
        if (cronSchedule === '0 */12 * * *') {
            // Every 12 hours
            return new Date(now.getTime() + 12 * 60 * 60 * 1000);
        }
        if (cronSchedule === '0 0 * * *') {
            // Daily at midnight
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }

        // Default: run again in 6 hours
        return new Date(now.getTime() + 6 * 60 * 60 * 1000);
    }

    onModuleDestroy() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
        }
    }
}
