import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '@protecliter/logger';
import { AppModule } from './app.module';

const logger = createLogger('billing-service');

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log'],
        rawBody: true, // Required for Stripe webhook signature verification
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    app.enableCors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    });

    app.setGlobalPrefix('api/v1');

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3006);

    await app.listen(port);
    logger.info(`Billing Service running on port ${port}`);
}

bootstrap();
