const { Kafka }  = require('kafkajs');
const { pool }   = require('../config/database');

const kafka = new Kafka({
  clientId: 'order-service-consumer',
  brokers:  [process.env.KAFKA_BROKER || 'kafka:9092'],
  retry:    { retries: 10, initialRetryTime: 500 },
});

const consumer = kafka.consumer({ groupId: 'order-service-payment-group' });

async function handlePaymentCompleted({ orderId, amount }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT total_price, paid_amount, status FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );
    if (!rows.length) { await conn.rollback(); return; }

    const order        = rows[0];
    const totalPrice   = parseFloat(order.total_price);
    const newPaidAmt   = parseFloat((parseFloat(order.paid_amount) + parseFloat(amount)).toFixed(2));
    const isFullyPaid  = newPaidAmt >= totalPrice;
    const newStatus    = isFullyPaid ? 'confirmed' : order.status; // keep current if partial

    await conn.execute(
      'UPDATE orders SET paid_amount = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [newPaidAmt, newStatus, orderId]
    );
    await conn.commit();

    if (isFullyPaid) {
      console.log(`[Kafka] Order #${orderId} fully paid ($${newPaidAmt}) → confirmed`);
    } else {
      const remaining = (totalPrice - newPaidAmt).toFixed(2);
      console.log(`[Kafka] Order #${orderId} partial payment $${amount} — paid $${newPaidAmt}/$${totalPrice} — $${remaining} remaining`);
    }
  } catch (err) {
    await conn.rollback();
    console.error('[Kafka] handlePaymentCompleted error:', err.message);
  } finally {
    conn.release();
  }
}

async function handlePaymentRefunded({ orderId, amount }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT total_price, paid_amount FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );
    if (!rows.length) { await conn.rollback(); return; }

    const newPaidAmt = Math.max(
      0,
      parseFloat((parseFloat(rows[0].paid_amount) - parseFloat(amount)).toFixed(2))
    );
    const newStatus = newPaidAmt <= 0 ? 'cancelled' : 'pending';

    await conn.execute(
      'UPDATE orders SET paid_amount = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [newPaidAmt, newStatus, orderId]
    );
    await conn.commit();
    console.log(`[Kafka] Order #${orderId} refund $${amount} → paid_amount=$${newPaidAmt} status=${newStatus}`);
  } catch (err) {
    await conn.rollback();
    console.error('[Kafka] handlePaymentRefunded error:', err.message);
  } finally {
    conn.release();
  }
}

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'payment-events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        if (data.eventType === 'payment.completed') {
          await handlePaymentCompleted(data);
        } else if (data.eventType === 'payment.refunded') {
          await handlePaymentRefunded(data);
        }
      } catch (err) {
        console.error('[Kafka Consumer] Parse error:', err.message);
      }
    },
  });

  console.log('Order service Kafka consumer listening to payment-events');
}

module.exports = { startConsumer };
