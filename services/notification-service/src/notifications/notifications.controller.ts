import {
  Controller, Get, Param, Patch, Delete, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';
import { NotificationType }     from './entities/notification.entity';

// ── HTTP routes — read-only (notifications are created by Kafka events) ───────
@Controller('api/notifications')
export class NotificationsController {

  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.findByUser(userId);
  }

  @Get('user/:userId/unread-count')
  unreadCount(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.unreadCount(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number) {
    return this.service.markRead(id);
  }

  @Patch('user/:userId/read-all')
  markAllRead(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.markAllRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

// ── Kafka event consumers — auto-triggered, no HTTP call needed ───────────────
@Controller()
export class NotificationsEventsController {

  constructor(private readonly service: NotificationsService) {}

  private parse(message: any): Record<string, any> {
    const raw = message?.value ?? message;
    return typeof raw === 'string' ? JSON.parse(raw) : raw ?? {};
  }

  @EventPattern('order-events')
  async handleOrderEvent(@Payload() message: any) {
    const data = this.parse(message);
    console.log(`[Kafka] order-events → ${data.eventType}`, data);

    const map: Record<string, { type: NotificationType; title: string; msg: (d: any) => string }> = {
      'order.placed': {
        type:  NotificationType.ORDER_PLACED,
        title: 'Order Placed',
        msg:   d => `Your order #${d.orderId} has been placed successfully. We'll confirm it shortly.`,
      },
      'order.status_changed': {
        type:  NotificationType.ORDER_CONFIRMED,
        title: `Order ${data.status ?? 'Updated'}`,
        msg:   d => `Your order #${d.orderId} status has been updated to: ${d.status}.`,
      },
    };

    const entry = map[data.eventType];
    if (!entry || !data.userId) return;

    await this.service.createFromEvent({
      userId:        data.userId,
      type:          entry.type,
      title:         entry.title,
      message:       entry.msg(data),
      referenceId:   data.orderId,
      referenceType: 'order',
    });
  }

  @EventPattern('payment-events')
  async handlePaymentEvent(@Payload() message: any) {
    const data = this.parse(message);
    console.log(`[Kafka] payment-events → ${data.eventType}`, data);

    const fmt = (n: number) => Number(n).toFixed(2);
    const map: Record<string, { type: NotificationType; title: string; msg: (d: any) => string }> = {
      'payment.created': {
        type:  NotificationType.PAYMENT_PARTIAL,
        title: 'Payment Initiated',
        msg:   d => `Payment of ${d.currency} $${fmt(d.amount)} for order #${d.orderId} is being processed.`,
      },
      // payment.partial = completed but balance still remaining
      'payment.partial': {
        type:  NotificationType.PAYMENT_PARTIAL,
        title: 'Partial Payment Received',
        msg:   d => `$${fmt(d.amount)} received for order #${d.orderId}. ` +
                    `$${fmt(d.totalPaid)} paid of $${fmt(d.orderTotal)}. ` +
                    `$${fmt(d.remainingBalance)} still outstanding.`,
      },
      // payment.completed = fully paid
      'payment.completed': {
        type:  NotificationType.PAYMENT_SUCCESS,
        title: 'Order Fully Paid',
        msg:   d => `Your order #${d.orderId} is fully paid ($${fmt(d.totalPaid)}). It is now confirmed!`,
      },
      'payment.failed': {
        type:  NotificationType.PAYMENT_FAILED,
        title: 'Payment Failed',
        msg:   d => `Payment of ${d.currency} $${fmt(d.amount)} for order #${d.orderId} failed. Please try again.`,
      },
      'payment.refunded': {
        type:  NotificationType.PAYMENT_REFUNDED,
        title: 'Payment Refunded',
        msg:   d => `$${fmt(d.amount)} refunded for order #${d.orderId}. ` +
                    (d.remainingBalance > 0 ? `Order is now pending $${fmt(d.remainingBalance)}.` : 'Order cancelled.'),
      },
    };

    const entry = map[data.eventType];
    if (!entry || !data.userId) return;

    await this.service.createFromEvent({
      userId:        data.userId,
      type:          entry.type,
      title:         entry.title,
      message:       entry.msg(data),
      referenceId:   data.paymentId,
      referenceType: 'payment',
    });
  }
}
