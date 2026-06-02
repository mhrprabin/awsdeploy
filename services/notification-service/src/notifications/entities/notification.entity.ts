import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  ORDER_PLACED     = 'order_placed',
  ORDER_CONFIRMED  = 'order_confirmed',
  ORDER_SHIPPED    = 'order_shipped',
  ORDER_DELIVERED  = 'order_delivered',
  PAYMENT_PARTIAL  = 'payment_partial',   // partial payment received, balance remaining
  PAYMENT_SUCCESS  = 'payment_success',   // fully paid
  PAYMENT_FAILED   = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  SYSTEM           = 'system',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  userId: number;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.SYSTEM })
  type: NotificationType;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  referenceId: number;        // e.g. orderId or paymentId

  @Column({ length: 50, nullable: true })
  referenceType: string;      // 'order' | 'payment'

  @CreateDateColumn()
  createdAt: Date;
}
