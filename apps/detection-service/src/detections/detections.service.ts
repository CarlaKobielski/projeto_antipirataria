import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DetectionStatus } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('detection-service');

@Injectable()
export class DetectionsService {
    constructor(private prisma: PrismaService) { }

    async findAll(
        tenantId: string,
        options: {
            page?: number;
            limit?: number;
            status?: DetectionStatus;
            workId?: string;
            minScore?: number;
        },
    ) {
        const { page = 1, limit = 20, status, workId, minScore } = options;
        const skip = (page - 1) * limit;

        const where: any = {
            work: { tenantId },
        };
        if (status) where.status = status;
        if (workId) where.workId = workId;
        if (minScore !== undefined) where.score = { gte: minScore };

        const [detections, total] = await Promise.all([
            this.prisma.detection.findMany({
                where,
                skip,
                take: limit,
                include: {
                    work: {
                        select: { id: true, title: true, author: true },
                    },
                    evidence: {
                        select: { id: true, sha256: true, storagePath: true },
                    },
                    case: {
                        select: { id: true, status: true },
                    },
                },
                orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
            }),
            this.prisma.detection.count({ where }),
        ]);

        return {
            data: detections,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(id: string, tenantId: string) {
        const detection = await this.prisma.detection.findFirst({
            where: {
                id,
                work: { tenantId },
            },
            include: {
                work: true,
                evidence: true,
                case: {
                    include: {
                        takedownRequests: true,
                    },
                },
                crawlResult: true,
                feedbacks: {
                    include: {
                        user: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!detection) {
            throw new NotFoundException('Detection not found');
        }

        return detection;
    }

    async updateStatus(id: string, tenantId: string, status: DetectionStatus) {
        const detection = await this.findById(id, tenantId);

        const updated = await this.prisma.detection.update({
            where: { id },
            data: {
                status,
                reviewedAt: new Date(),
            },
        });

        // If validated, automatically create a case
        if (status === 'VALIDATED' && !detection.case) {
            await this.prisma.case.create({
                data: {
                    detectionId: id,
                    status: 'NEW',
                    priority: Math.round(detection.score * 10), // 0-10 based on score
                },
            });
            logger.info(`Created case for detection ${id}`);
        }

        return updated;
    }

    async addFeedback(
        id: string,
        tenantId: string,
        userId: string,
        label: string,
        comment?: string,
    ) {
        await this.findById(id, tenantId);

        return this.prisma.feedback.create({
            data: {
                detectionId: id,
                userId,
                label,
                comment,
            },
        });
    }

    async getStats(tenantId: string) {
        const [total, byStatus, byConfidence, avgScore] = await Promise.all([
            this.prisma.detection.count({ where: { work: { tenantId } } }),
            this.prisma.detection.groupBy({
                by: ['status'],
                where: { work: { tenantId } },
                _count: true,
            }),
            this.prisma.detection.groupBy({
                by: ['confidence'],
                where: { work: { tenantId } },
                _count: true,
            }),
            this.prisma.detection.aggregate({
                where: { work: { tenantId } },
                _avg: { score: true },
            }),
        ]);

        return {
            total,
            byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
            byConfidence: Object.fromEntries(byConfidence.map(c => [c.confidence, c._count])),
            averageScore: avgScore._avg.score || 0,
        };
    }
}
