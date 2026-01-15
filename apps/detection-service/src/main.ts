import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('detection-service');

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');

    const port = process.env.DETECTION_SERVICE_PORT || 3003;
    await app.listen(port);

    logger.info(`Detection service running on port ${port}`);
}

bootstrap();
