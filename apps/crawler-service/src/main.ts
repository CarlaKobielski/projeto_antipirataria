import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('crawler-service');

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.setGlobalPrefix('api/v1');

    const port = process.env.CRAWLER_SERVICE_PORT || 3002;
    await app.listen(port);

    logger.info(`Crawler service running on port ${port}`);
}

bootstrap();
