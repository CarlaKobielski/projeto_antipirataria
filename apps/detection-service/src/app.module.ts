import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DetectionsController } from './detections/detections.controller';
import { DetectionsService } from './detections/detections.service';
import { ClassifierService } from './classifier/classifier.service';
import { FingerprintService } from './fingerprint/fingerprint.service';
import { ExtractionProcessor } from './extraction/extraction.processor';
import { PrismaService } from './prisma/prisma.service';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
        }),
        BullModule.registerQueue({ name: 'extract' }),
    ],
    controllers: [DetectionsController],
    providers: [
        DetectionsService,
        ClassifierService,
        FingerprintService,
        ExtractionProcessor,
        PrismaService,
    ],
})
export class AppModule { }
