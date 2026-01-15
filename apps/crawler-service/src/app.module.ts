import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { JobsController } from './jobs/jobs.controller';
import { JobsService } from './jobs/jobs.service';
import { SchedulerService } from './scheduler/scheduler.service';
import { CrawlerProcessor } from './crawler/crawler.processor';
import { FetcherService } from './crawler/fetcher.service';
import { PrismaService } from './prisma/prisma.service';
import { StorageService } from './storage/storage.service';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
        }),
        BullModule.registerQueue(
            { name: 'crawl' },
            { name: 'extract' },
        ),
    ],
    controllers: [JobsController],
    providers: [
        JobsService,
        SchedulerService,
        CrawlerProcessor,
        FetcherService,
        PrismaService,
        StorageService,
    ],
})
export class AppModule { }
