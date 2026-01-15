import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TemplatesService } from '../templates/templates.service';
import { TakedownJobMessage, TakedownPlatform } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('takedown-service');

@Processor('takedown')
export class TakedownProcessor extends WorkerHost {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private templates: TemplatesService,
    ) {
        super();
    }

    async process(job: Job<TakedownJobMessage>): Promise<void> {
        const { takedownRequestId, platform, attempt } = job.data;

        logger.info(`Processing takedown ${takedownRequestId}, attempt ${attempt}`);

        try {
            const takedown = await this.prisma.takedownRequest.findUnique({
                where: { id: takedownRequestId },
                include: {
                    case: {
                        include: {
                            detection: { include: { work: true } },
                        },
                    },
                },
            });

            if (!takedown) {
                logger.warn(`Takedown request not found: ${takedownRequestId}`);
                return;
            }

            // Update attempt count
            await this.prisma.takedownRequest.update({
                where: { id: takedownRequestId },
                data: {
                    attempts: attempt,
                    lastAttemptAt: new Date(),
                },
            });

            // Process based on platform/type
            const template = takedown.templateUsed
                ? this.templates.getTemplate(takedown.templateUsed)
                : null;

            if (template?.type === 'EMAIL') {
                await this.processEmailTakedown(takedown, template);
            } else if (template?.type === 'FORM') {
                await this.processFormTakedown(takedown, template, platform);
            } else {
                // Default: log for manual processing
                await this.processManualTakedown(takedown);
            }

        } catch (error: any) {
            logger.error(`Takedown failed: ${takedownRequestId} - ${error.message}`);

            await this.prisma.takedownRequest.update({
                where: { id: takedownRequestId },
                data: {
                    status: 'FAILED',
                    response: { error: error.message },
                },
            });

            throw error;
        }
    }

    private async processEmailTakedown(takedown: any, template: any) {
        const payload = takedown.requestPayload as any;
        const recipientEmail = template.recipientEmail || this.getDefaultRecipient(takedown.platform);

        if (!recipientEmail) {
            throw new Error('No recipient email configured for this platform');
        }

        await this.emailService.sendEmail({
            to: recipientEmail,
            subject: payload.subject,
            body: payload.body,
        });

        await this.prisma.takedownRequest.update({
            where: { id: takedown.id },
            data: {
                status: 'SENT',
                sentAt: new Date(),
                response: { type: 'email', recipient: recipientEmail },
            },
        });

        logger.info(`Email takedown sent: ${takedown.id} to ${recipientEmail}`);
    }

    private async processFormTakedown(takedown: any, template: any, platform: TakedownPlatform) {
        // For form-based takedowns (Google, etc.), we mark as SENT
        // In production, this would integrate with platform APIs

        await this.prisma.takedownRequest.update({
            where: { id: takedown.id },
            data: {
                status: 'SENT',
                sentAt: new Date(),
                response: {
                    type: 'form',
                    platform,
                    note: 'Form takedown prepared - manual submission may be required',
                },
            },
        });

        logger.info(`Form takedown prepared: ${takedown.id} for ${platform}`);
    }

    private async processManualTakedown(takedown: any) {
        await this.prisma.takedownRequest.update({
            where: { id: takedown.id },
            data: {
                status: 'PENDING',
                response: { note: 'Requires manual processing' },
            },
        });

        logger.info(`Manual takedown flagged: ${takedown.id}`);
    }

    private getDefaultRecipient(platform: string): string | undefined {
        const recipients: Record<string, string> = {
            SCRIBD: 'copyright@scribd.com',
            // Add more platform emails as needed
        };
        return recipients[platform];
    }
}
