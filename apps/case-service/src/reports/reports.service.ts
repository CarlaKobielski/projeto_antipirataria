import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('case-service');

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardStats(tenantId: string) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalWorks,
            totalDetections,
            pendingDetections,
            successfulTakedowns,
            detectionsThisMonth,
            takedownsThisMonth,
        ] = await Promise.all([
            this.prisma.work.count({ where: { tenantId } }),
            this.prisma.detection.count({ where: { work: { tenantId } } }),
            this.prisma.detection.count({
                where: { work: { tenantId }, status: 'NEW' },
            }),
            this.prisma.takedownRequest.count({
                where: {
                    case: { detection: { work: { tenantId } } },
                    status: 'REMOVED',
                },
            }),
            this.prisma.detection.count({
                where: {
                    work: { tenantId },
                    createdAt: { gte: monthStart },
                },
            }),
            this.prisma.takedownRequest.count({
                where: {
                    case: { detection: { work: { tenantId } } },
                    status: 'REMOVED',
                    respondedAt: { gte: monthStart },
                },
            }),
        ]);

        const totalTakedowns = await this.prisma.takedownRequest.count({
            where: { case: { detection: { work: { tenantId } } } },
        });

        return {
            totalWorks,
            totalDetections,
            pendingDetections,
            successfulTakedowns,
            takedownRate: totalTakedowns > 0 ? (successfulTakedowns / totalTakedowns) * 100 : 0,
            detectionsThisMonth,
            takedownsThisMonth,
        };
    }

    async getDetectionTrend(tenantId: string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const detections = await this.prisma.detection.groupBy({
            by: ['createdAt'],
            where: {
                work: { tenantId },
                createdAt: { gte: startDate },
            },
            _count: true,
        });

        // Aggregate by day
        const dailyCounts = new Map<string, number>();
        for (const d of detections) {
            const day = d.createdAt.toISOString().split('T')[0]!;
            dailyCounts.set(day, (dailyCounts.get(day) || 0) + d._count);
        }

        return Array.from(dailyCounts.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    async exportCSV(tenantId: string, type: 'detections' | 'takedowns') {
        if (type === 'detections') {
            const detections = await this.prisma.detection.findMany({
                where: { work: { tenantId } },
                include: { work: { select: { title: true } } },
                orderBy: { createdAt: 'desc' },
                take: 1000,
            });

            const headers = ['ID', 'Work', 'URL', 'Domain', 'Score', 'Confidence', 'Status', 'Date'];
            const rows = detections.map(d => [
                d.id,
                d.work.title,
                d.url,
                d.domain,
                d.score.toFixed(2),
                d.confidence,
                d.status,
                d.createdAt.toISOString(),
            ]);

            return this.formatCSV(headers, rows);
        }

        const takedowns = await this.prisma.takedownRequest.findMany({
            where: { case: { detection: { work: { tenantId } } } },
            include: {
                case: {
                    include: {
                        detection: {
                            include: { work: { select: { title: true } } },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });

        const headers = ['ID', 'Work', 'URL', 'Platform', 'Status', 'Sent At', 'Response At'];
        const rows = takedowns.map(t => [
            t.id,
            t.case.detection.work.title,
            t.case.detection.url,
            t.platform,
            t.status,
            t.sentAt?.toISOString() || '',
            t.respondedAt?.toISOString() || '',
        ]);

        return this.formatCSV(headers, rows);
    }

    private formatCSV(headers: string[], rows: string[][]): string {
        const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
        const lines = [headers.map(escape).join(',')];
        for (const row of rows) {
            lines.push(row.map(escape).join(','));
        }
        return lines.join('\n');
    }
}
