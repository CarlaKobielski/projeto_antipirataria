import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TakedownsController } from './takedowns/takedowns.controller';
import { TakedownsService } from './takedowns/takedowns.service';
import { TemplatesService } from './templates/templates.service';
import { EmailService } from './email/email.service';
import { TakedownProcessor } from './takedowns/takedown.processor';
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
        BullModule.registerQueue({ name: 'takedown' }),
    ],
    controllers: [TakedownsController],
    providers: [
        TakedownsService,
        TemplatesService,
        EmailService,
        TakedownProcessor,
        PrismaService,
    ],
})
export class AppModule { }
