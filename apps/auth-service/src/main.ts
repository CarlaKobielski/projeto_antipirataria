import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('auth-service');

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // CORS for development
    app.enableCors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    });

    // Global prefix
    app.setGlobalPrefix('api/v1');

    const port = process.env.AUTH_SERVICE_PORT || 3001;
    await app.listen(port);

    logger.info(`Auth service running on port ${port}`);
}

bootstrap();
