import { NestFactory }         from '@nestjs/core';
import { ValidationPipe }      from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule }           from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Kafka consumer (hybrid app: HTTP + Kafka in one process) ─────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service',
        brokers:  [process.env.KAFKA_BROKER || 'kafka:9092'],
        retry: {
          retries:         15,
          initialRetryTime: 500,
          maxRetryTime:    30000,
        },
      },
      consumer: {
        groupId: 'notification-consumer-group',
        // Start from earliest so we catch up on any events missed while down
        fromBeginning: true,
      },
    },
  });

  await app.startAllMicroservices();

  // Health endpoint for docker-compose / gateway
  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.get('/health', (_req, res) =>
    res.json({ service: 'notification-service', status: 'ok' })
  );

  const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log(`Notification Service HTTP on port ${port}`);
  console.log(`Notification Service Kafka consumer active`);
}

bootstrap();
