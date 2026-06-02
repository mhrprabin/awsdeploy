import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // Load .env automatically
    ConfigModule.forRoot({ isGlobal: true }),

    // TypeORM with MySQL — config reads from env vars
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),

    NotificationsModule,
  ],
})
export class AppModule {}
