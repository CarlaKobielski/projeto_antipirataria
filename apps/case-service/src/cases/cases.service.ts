import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaseStatus } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('case-service');

@Injectable()
export class CasesService {
    constructor(private prisma: PrismaService) { }

    async findAll(
        tenantId: string,
        options: {
            page?: number;
            limit?: number;
            status?: CaseStatus;
            analystId?: string;
        },
    ) {
        const { page = 1, limit = 20, status, analystId } = options;
        const skip = (page - 1) * limit;

        const where: any = {
            detection: { work: { tenantId } },
        };
        if (status) where.status = status;
        if (analystId) where.analystId = analystId;

        const [cases, total] = await Promise.all([
            this.prisma.case.findMany({
                where,
                skip,
                take: limit,
                include: {
                    detection: {
                        include: {
                            work: { select: { id: true, title: true } },
                        },
                    },
                    analyst: { select: { id: true, name: true } },
                    takedownRequests: {
                        select: { id: true, platform: true, status: true },
                    },
                },
                orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            }),
            this.prisma.case.count({ where }),
        ]);

        return {
            data: cases,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(id: string, tenantId: string) {
        const caseRecord = await this.prisma.case.findFirst({
            where: {
                id,
                detection: { work: { tenantId } },
            },
            include: {
                detection: {
                    include: {
                        work: true,
                        evidence: true,
                    },
                },
                analyst: { select: { id: true, name: true, email: true } },
                takedownRequests: true,
            },
        });

        if (!caseRecord) {
            throw new NotFoundException('Case not found');
        }

        return caseRecord;
    }

    async assignAnalyst(id: string, tenantId: string, analystId: string) {
        await this.findById(id, tenantId);

        return this.prisma.case.update({
            where: { id },
            data: { analystId },
        });
    }

    async updateStatus(id: string, tenantId: string, status: CaseStatus, notes?: string) {
        await this.findById(id, tenantId);

        const data: any = { status };
        if (notes) data.notes = notes;
        if (status === 'VALIDATED') data.validatedAt = new Date();
        if (status === 'CLOSED') data.closedAt = new Date();

        const updated = await this.prisma.case.update({
            where: { id },
            data,
        });

        logger.info(`Case ${id} status updated to ${status}`);

        return updated;
    }

    async addComment(id: string, tenantId: string, userId: string, comment: string) {
        const caseRecord = await this.findById(id, tenantId);

        const existingComments = (caseRecord.internalComments as any[]) || [];
        const newComment = {
            userId,
            comment,
            timestamp: new Date().toISOString(),
        };

        return this.prisma.case.update({
            where: { id },
            data: {
                internalComments: [...existingComments, newComment],
            },
        });
    }

    async getStats(tenantId: string) {
        const [total, byStatus, pendingHighPriority] = await Promise.all([
            this.prisma.case.count({ where: { detection: { work: { tenantId } } } }),
            this.prisma.case.groupBy({
                by: ['status'],
                where: { detection: { work: { tenantId } } },
                _count: true,
            }),
            this.prisma.case.count({
                where: {
                    detection: { work: { tenantId } },
                    status: { in: ['NEW', 'VALIDATED'] },
                    priority: { gte: 7 },
                },
            }),
        ]);

        return {
            total,
            byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
            pendingHighPriority,
        };
    }
}
