import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/jobs.dto';
import { CrawlJobMessage } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('crawler-service');

@Injectable()
export class JobsService {
    constructor(
        private prisma: PrismaService,
        @InjectQueue('crawl') private crawlQueue: Queue,
    ) { }

    async create(tenantId: string, dto: CreateJobDto) {
        // Verify work exists and belongs to tenant
        const work = await this.prisma.work.findFirst({
            where: { id: dto.workId, tenantId },
        });

        if (!work) {
            throw new NotFoundException('Work not found');
        }

        const job = await this.prisma.monitoringJob.create({
            data: {
                tenantId,
                workId: dto.workId,
                queries: dto.queries,
                schedule: dto.schedule || '0 */6 * * *', // Default: every 6 hours
                status: 'ACTIVE',
                nextRunAt: new Date(), // Run immediately on creation
            },
            include: {
                work: {
                    select: { id: true, title: true },
                },
            },
        });

        // Trigger initial crawl
        await this.triggerJob(job.id, tenantId);

        logger.info(`Created monitoring job: ${job.id} for work: ${work.title}`);

        return job;
    }

    async findAll(tenantId: string, options: { page?: number; limit?: number; workId?: string }) {
        const { page = 1, limit = 20, workId } = options;
        const skip = (page - 1) * limit;

        const where: any = { tenantId };
        if (workId) where.workId = workId;

        const [jobs, total] = await Promise.all([
            this.prisma.monitoringJob.findMany({
                where,
                skip,
                take: limit,
                include: {
                    work: {
                        select: { id: true, title: true, author: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.monitoringJob.count({ where }),
        ]);

        return {
            data: jobs,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(id: string, tenantId: string) {
        const job = await this.prisma.monitoringJob.findFirst({
            where: { id, tenantId },
            include: {
                work: true,
                crawlResults: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!job) {
            throw new NotFoundException('Monitoring job not found');
        }

        return job;
    }

    async update(id: string, tenantId: string, dto: UpdateJobDto) {
        const job = await this.prisma.monitoringJob.findFirst({
            where: { id, tenantId },
        });

        if (!job) {
            throw new NotFoundException('Monitoring job not found');
        }

        return this.prisma.monitoringJob.update({
            where: { id },
            data: dto,
        });
    }

    async delete(id: string, tenantId: string) {
        const job = await this.prisma.monitoringJob.findFirst({
            where: { id, tenantId },
        });

        if (!job) {
            throw new NotFoundException('Monitoring job not found');
        }

        await this.prisma.monitoringJob.delete({ where: { id } });

        return { message: 'Monitoring job deleted' };
    }

    async triggerJob(id: string, tenantId: string, specificQueries?: string[]) {
        const job = await this.prisma.monitoringJob.findFirst({
            where: { id, tenantId },
        });

        if (!job) {
            throw new NotFoundException('Monitoring job not found');
        }

        const queriesToRun = specificQueries || job.queries;

        // Add jobs to queue for each query
        for (let i = 0; i < queriesToRun.length; i++) {
            const query = queriesToRun[i]!;
            const message: CrawlJobMessage = {
                jobId: job.id,
                workId: job.workId,
                tenantId: job.tenantId,
                query,
                priority: i, // Lower index = higher priority
            };

            await this.crawlQueue.add('crawl', message, {
                priority: i,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            });
        }

        // Update last run timestamp
        await this.prisma.monitoringJob.update({
            where: { id },
            data: {
                lastRunAt: new Date(),
                runCount: { increment: 1 },
            },
        });

        logger.info(`Triggered job ${id} with ${queriesToRun.length} queries`);

        return { message: `Queued ${queriesToRun.length} crawl jobs` };
    }

    async getStats(tenantId: string) {
        const [totalJobs, activeJobs, totalRuns] = await Promise.all([
            this.prisma.monitoringJob.count({ where: { tenantId } }),
            this.prisma.monitoringJob.count({ where: { tenantId, status: 'ACTIVE' } }),
            this.prisma.crawlResult.count({
                where: { job: { tenantId } },
            }),
        ]);

        return {
            totalJobs,
            activeJobs,
            totalRuns,
        };
    }
}
