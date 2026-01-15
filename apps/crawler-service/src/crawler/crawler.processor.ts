import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { FetcherService } from './fetcher.service';
import { StorageService } from '../storage/storage.service';
import { CrawlJobMessage, ExtractionJobMessage } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('crawler-service');

@Processor('crawl')
export class CrawlerProcessor extends WorkerHost {
    constructor(
        private prisma: PrismaService,
        private fetcher: FetcherService,
        private storage: StorageService,
        @InjectQueue('extract') private extractQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<CrawlJobMessage>): Promise<void> {
        const { jobId, workId, tenantId, query } = job.data;

        logger.info(`Processing crawl job: ${job.id} for query: ${query}`);

        try {
            // Determine URLs to crawl based on query type
            const urls = await this.resolveQueryToUrls(query);

            for (const url of urls) {
                await this.processUrl(url, jobId, workId, tenantId);
            }

            logger.info(`Completed crawl job: ${job.id}, processed ${urls.length} URLs`);
        } catch (error: any) {
            logger.error(`Crawl job failed: ${job.id} - ${error.message}`);
            throw error;
        }
    }

    private async resolveQueryToUrls(query: string): Promise<string[]> {
        // For MVP: If query is a URL, use it directly
        // If it's a search query, we'd integrate with Google Search API

        if (query.startsWith('http://') || query.startsWith('https://')) {
            return [query];
        }

        // Simulate search results for MVP
        // In production, integrate with Google Custom Search API
        logger.debug(`Query "${query}" would trigger search API`);

        return [];
    }

    private async processUrl(
        url: string,
        jobId: string,
        workId: string,
        tenantId: string,
    ): Promise<void> {
        try {
            // Check robots.txt
            const domain = new URL(url).origin;
            const canCrawl = await this.fetcher.checkRobotsTxt(domain);

            if (!canCrawl) {
                logger.warn(`Robots.txt disallows crawling: ${url}`);
                return;
            }

            // Fetch page
            const result = await this.fetcher.fetch(url);

            // Store raw content
            const storage = await this.storage.uploadEvidence(
                tenantId,
                jobId,
                url,
                result.html,
                'text/html',
            );

            // Create crawl result record
            const crawlResult = await this.prisma.crawlResult.create({
                data: {
                    jobId,
                    url: result.url,
                    domain: new URL(result.url).hostname,
                    statusCode: result.statusCode,
                    contentType: result.contentType,
                    headers: result.headers,
                    rawContentPath: storage.path,
                },
            });

            // Queue for extraction/detection
            const extractMessage: ExtractionJobMessage = {
                crawlResultId: crawlResult.id,
                url: result.url,
                contentPath: storage.path,
            };

            await this.extractQueue.add('extract', extractMessage, {
                attempts: 2,
                backoff: { type: 'exponential', delay: 3000 },
            });

            logger.debug(`Processed URL: ${url}`);
        } catch (error: any) {
            logger.error(`Failed to process URL ${url}: ${error.message}`);
            // Don't throw - continue with other URLs
        }
    }
}
