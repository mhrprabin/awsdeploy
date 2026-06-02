import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsController, NotificationsEventsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports:     [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController, NotificationsEventsController],
  providers:   [NotificationsService],
})
export class NotificationsModule {}
