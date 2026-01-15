import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('case-service');

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');

    const port = process.env.CASE_SERVICE_PORT || 3004;
    await app.listen(port);

    logger.info(`Case service running on port ${port}`);
}

bootstrap();
