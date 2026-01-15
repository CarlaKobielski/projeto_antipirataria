import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkDto } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('case-service');

@Injectable()
export class WorksService {
    constructor(private prisma: PrismaService) { }

    async create(tenantId: string, dto: CreateWorkDto) {
        const work = await this.prisma.work.create({
            data: {
                tenantId,
                title: dto.title,
                author: dto.author,
                isbn: dto.isbn,
                description: dto.description,
                excerpt: dto.excerpt,
                keywords: dto.keywords || [],
            },
        });

        logger.info(`Created work: ${work.title} for tenant ${tenantId}`);
        return work;
    }

    async findAll(tenantId: string, options: { page?: number; limit?: number; search?: string }) {
        const { page = 1, limit = 20, search } = options;
        const skip = (page - 1) * limit;

        const where: any = { tenantId };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { author: { contains: search, mode: 'insensitive' } },
                { isbn: { contains: search } },
            ];
        }

        const [works, total] = await Promise.all([
            this.prisma.work.findMany({
                where,
                skip,
                take: limit,
                include: {
                    _count: {
                        select: {
                            monitoringJobs: true,
                            detections: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.work.count({ where }),
        ]);

        return {
            data: works,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(id: string, tenantId: string) {
        const work = await this.prisma.work.findFirst({
            where: { id, tenantId },
            include: {
                monitoringJobs: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
                detections: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        case: { select: { id: true, status: true } },
                    },
                },
            },
        });

        if (!work) {
            throw new NotFoundException('Work not found');
        }

        return work;
    }

    async update(id: string, tenantId: string, dto: Partial<CreateWorkDto>) {
        await this.findById(id, tenantId);

        return this.prisma.work.update({
            where: { id },
            data: dto,
        });
    }

    async delete(id: string, tenantId: string) {
        await this.findById(id, tenantId);
        await this.prisma.work.delete({ where: { id } });
        return { message: 'Work deleted' };
    }

    async getStats(tenantId: string) {
        const [totalWorks, totalDetections, activeJobs] = await Promise.all([
            this.prisma.work.count({ where: { tenantId } }),
            this.prisma.detection.count({ where: { work: { tenantId } } }),
            this.prisma.monitoringJob.count({ where: { tenantId, status: 'ACTIVE' } }),
        ]);

        return { totalWorks, totalDetections, activeJobs };
    }
}
