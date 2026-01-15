import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ClassifierService } from '../classifier/classifier.service';
import { FingerprintService } from '../fingerprint/fingerprint.service';
import { ExtractionJobMessage } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('detection-service');

@Processor('extract')
export class ExtractionProcessor extends WorkerHost {
    constructor(
        private prisma: PrismaService,
        private classifier: ClassifierService,
        private fingerprint: FingerprintService,
    ) {
        super();
    }

    async process(job: Job<ExtractionJobMessage>): Promise<void> {
        const { crawlResultId, url } = job.data;

        logger.info(`Processing extraction job: ${job.id} for URL: ${url}`);

        try {
            // Get crawl result with job info
            const crawlResult = await this.prisma.crawlResult.findUnique({
                where: { id: crawlResultId },
                include: {
                    job: {
                        include: { work: true },
                    },
                },
            });

            if (!crawlResult || !crawlResult.job) {
                logger.warn(`Crawl result not found: ${crawlResultId}`);
                return;
            }

            // For MVP, we'll work with the text extracted during crawling
            // In production, we'd fetch from S3 and do full extraction/OCR

            // Get page content (simplified for MVP)
            const pageText = ''; // Would fetch from S3 in production
            const pageTitle = ''; // Would extract from HTML

            // Run classification
            const classification = await this.classifier.classify(
                crawlResult.job.workId,
                url,
                pageText,
                pageTitle,
            );

            // Only create detection if score is above threshold
            if (classification.score >= 0.3) {
                // Generate fingerprint
                const fp = this.fingerprint.generateFingerprint(pageText);

                // Create evidence record
                const evidence = await this.prisma.evidence.create({
                    data: {
                        storagePath: crawlResult.rawContentPath || '',
                        contentType: crawlResult.contentType || 'text/html',
                        fileSize: 0,
                        sha256: fp.sha256,
                        simhash: fp.simhash,
                        metadata: {
                            url,
                            domain: crawlResult.domain,
                            crawledAt: crawlResult.createdAt,
                        },
                    },
                });

                // Create detection record
                await this.prisma.detection.create({
                    data: {
                        crawlResultId,
                        workId: crawlResult.job.workId,
                        url,
                        domain: crawlResult.domain,
                        score: classification.score,
                        confidence: classification.confidence,
                        reasons: classification.reasons,
                        fingerprintMatch: classification.fingerprintMatch,
                        evidenceId: evidence.id,
                        status: 'NEW',
                    },
                });

                logger.info(`Created detection for ${url} with score ${classification.score.toFixed(2)}`);
            } else {
                logger.debug(`Skipped detection for ${url} (score ${classification.score.toFixed(2)} below threshold)`);
            }

            // Mark crawl result as processed
            await this.prisma.crawlResult.update({
                where: { id: crawlResultId },
                data: { processedAt: new Date() },
            });

        } catch (error: any) {
            logger.error(`Extraction job failed: ${job.id} - ${error.message}`);
            throw error;
        }
    }
}
