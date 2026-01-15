import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('takedown-service');

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');

    const port = process.env.TAKEDOWN_SERVICE_PORT || 3005;
    await app.listen(port);

    logger.info(`Takedown service running on port ${port}`);
}

bootstrap();
