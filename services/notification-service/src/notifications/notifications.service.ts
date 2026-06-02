import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.repo.create(dto);
    return this.repo.save(notification);
  }

  // Called internally by Kafka event handlers — not exposed over HTTP
  async createFromEvent(data: Partial<Notification>): Promise<void> {
    const notification = this.repo.create(data);
    await this.repo.save(notification);
    console.log(`[Notification] Created: [${data.type}] "${data.title}" for user ${data.userId}`);
  }

  async findAll(): Promise<{ notifications: Notification[]; total: number }> {
    const notifications = await this.repo.find({ order: { createdAt: 'DESC' } });
    return { notifications, total: notifications.length };
  }

  async findByUser(userId: number): Promise<{ notifications: Notification[]; total: number; unread: number }> {
    const notifications = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const unread = notifications.filter(n => !n.isRead).length;
    return { notifications, total: notifications.length, unread };
  }

  async findOne(id: number): Promise<Notification> {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException(`Notification #${id} not found`);
    return notification;
  }

  async markRead(id: number): Promise<Notification> {
    const notification = await this.findOne(id);
    notification.isRead = true;
    return this.repo.save(notification);
  }

  async markAllRead(userId: number): Promise<{ updated: number }> {
    const result = await this.repo.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }

  async remove(id: number): Promise<{ message: string; id: number }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'Notification deleted', id };
  }

  async unreadCount(userId: number): Promise<{ userId: number; unread: number }> {
    const unread = await this.repo.count({ where: { userId, isRead: false } });
    return { userId, unread };
  }
}
