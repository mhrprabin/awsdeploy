import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Notification } from '../notifications/entities/notification.entity';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type:         'mysql',
  host:         process.env.DB_HOST     || 'localhost',
  port:         parseInt(process.env.DB_PORT) || 3306,
  database:     process.env.DB_NAME     || 'notifications_db',
  username:     process.env.DB_USER     || 'root',
  password:     process.env.DB_PASSWORD || '',
  entities:     [Notification],
  synchronize:  true,   // auto-creates tables from entities (dev-friendly; use migrations in prod)
  logging:      false,
});
