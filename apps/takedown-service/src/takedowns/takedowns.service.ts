import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TemplatesService, TemplateData } from '../templates/templates.service';
import { TakedownPlatform, TakedownJobMessage } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('takedown-service');

@Injectable()
export class TakedownsService {
    constructor(
        private prisma: PrismaService,
        private templates: TemplatesService,
        @InjectQueue('takedown') private takedownQueue: Queue,
    ) { }

    async create(
        caseId: string,
        tenantId: string,
        platform: TakedownPlatform,
        templateId: string,
        additionalData?: Partial<TemplateData>,
    ) {
        // Verify case exists and belongs to tenant
        const caseRecord = await this.prisma.case.findFirst({
            where: {
                id: caseId,
                detection: { work: { tenantId } },
            },
            include: {
                detection: {
                    include: {
                        work: true,
                        evidence: true,
                    },
                },
            },
        });

        if (!caseRecord) {
            throw new NotFoundException('Case not found');
        }

        // Get template
        const template = this.templates.getTemplate(templateId);
        if (!template) {
            throw new BadRequestException('Template not found');
        }

        // Get tenant info for claimant data
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        // Build template data
        const templateData: TemplateData = {
            workTitle: caseRecord.detection.work.title,
            workAuthor: caseRecord.detection.work.author || undefined,
            workIsbn: caseRecord.detection.work.isbn || undefined,
            infringingUrl: caseRecord.detection.url,
            domain: caseRecord.detection.domain,
            claimantName: tenant?.name || 'Rights Holder',
            claimantEmail: tenant?.email || '',
            detectionDate: new Date().toISOString().split('T')[0]!,
            ...additionalData,
        };

        // Validate required fields
        const missingFields = this.templates.validateTemplateData(templateId, templateData);
        if (missingFields.length > 0) {
            throw new BadRequestException(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Render template
        const rendered = this.templates.renderTemplate(templateId, templateData);

        // Create takedown request
        const takedown = await this.prisma.takedownRequest.create({
            data: {
                caseId,
                platform,
                templateUsed: templateId,
                requestPayload: {
                    subject: rendered.subject,
                    body: rendered.body,
                    templateData,
                },
                evidenceUrls: caseRecord.detection.evidence?.storagePath
                    ? [caseRecord.detection.evidence.storagePath]
                    : [],
                status: 'PENDING',
            },
        });

        // Update case status
        await this.prisma.case.update({
            where: { id: caseId },
            data: { status: 'REMOVAL_REQUESTED' },
        });

        // Queue the takedown job
        const message: TakedownJobMessage = {
            caseId,
            takedownRequestId: takedown.id,
            platform,
            attempt: 1,
        };

        await this.takedownQueue.add('send-takedown', message, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 }, // 1 min, then 2 min, etc.
        });

        logger.info(`Created takedown request ${takedown.id} for case ${caseId}`);

        return takedown;
    }

    async findAll(tenantId: string, options: { page?: number; limit?: number; status?: string }) {
        const { page = 1, limit = 20, status } = options;
        const skip = (page - 1) * limit;

        const where: any = {
            case: { detection: { work: { tenantId } } },
        };
        if (status) where.status = status;

        const [takedowns, total] = await Promise.all([
            this.prisma.takedownRequest.findMany({
                where,
                skip,
                take: limit,
                include: {
                    case: {
                        include: {
                            detection: {
                                select: { url: true, domain: true, work: { select: { title: true } } },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.takedownRequest.count({ where }),
        ]);

        return {
            data: takedowns,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(id: string, tenantId: string) {
        const takedown = await this.prisma.takedownRequest.findFirst({
            where: {
                id,
                case: { detection: { work: { tenantId } } },
            },
            include: {
                case: {
                    include: {
                        detection: { include: { work: true, evidence: true } },
                    },
                },
            },
        });

        if (!takedown) {
            throw new NotFoundException('Takedown request not found');
        }

        return takedown;
    }

    async retry(id: string, tenantId: string) {
        const takedown = await this.findById(id, tenantId);

        if (!['FAILED', 'REJECTED'].includes(takedown.status)) {
            throw new BadRequestException('Can only retry failed or rejected takedowns');
        }

        // Queue retry
        const message: TakedownJobMessage = {
            caseId: takedown.caseId,
            takedownRequestId: takedown.id,
            platform: takedown.platform as TakedownPlatform,
            attempt: takedown.attempts + 1,
        };

        await this.takedownQueue.add('send-takedown', message, {
            attempts: 1,
        });

        return { message: 'Retry queued' };
    }

    async updateStatus(id: string, status: string, response?: any) {
        return this.prisma.takedownRequest.update({
            where: { id },
            data: {
                status: status as any,
                response,
                respondedAt: new Date(),
            },
        });
    }

    getAvailableTemplates(platform?: TakedownPlatform) {
        if (platform) {
            return this.templates.getTemplatesForPlatform(platform);
        }
        return this.templates.getAllTemplates();
    }
}
