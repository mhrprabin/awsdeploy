const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers:  [process.env.KAFKA_BROKER || 'kafka:9092'],
  retry: { retries: 5, initialRetryTime: 300 },
});

const producer = kafka.producer();
let connected = false;

async function connect() {
  if (connected) return;
  await producer.connect();
  connected = true;
  console.log('Kafka producer connected');
}

// Publish to Kafka topic — fails silently so it never breaks the HTTP response
async function publish(topic, eventType, data) {
  try {
    await connect();
    await producer.send({
      topic,
      messages: [{
        key:   String(data.userId ?? 'system'),
        value: JSON.stringify({ eventType, ...data, timestamp: new Date().toISOString() }),
      }],
    });
  } catch (err) {
    // Log but don't crash — Kafka outage should never fail an order request
    console.error(`[Kafka] Failed to publish ${eventType}:`, err.message);
    connected = false; // force reconnect on next publish
  }
}

module.exports = { publish };
