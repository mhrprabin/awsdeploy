require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initDB }        = require('./config/database');
const { startConsumer } = require('./events/kafkaConsumer');
const orderRoutes       = require('./routes/orderRoutes');

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'order-service', status: 'ok' }));

// Internal service-to-service endpoint — not exposed through the gateway.
// Used by payment-service to verify an order exists before charging.
app.get('/internal/orders/:id', async (req, res) => {
  const { pool } = require('./config/database');
  try {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = rows[0];
    // Expose computed remaining balance so payment-service can validate amounts
    order.remaining_balance = parseFloat(
      (parseFloat(order.total_price) - parseFloat(order.paid_amount || 0)).toFixed(2)
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/orders', orderRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initDB()
  .then(() => {
    // Start Kafka consumer in background — errors don't crash the HTTP server
    startConsumer().catch(err =>
      console.error('[Kafka] Consumer failed to start:', err.message)
    );
    return app.listen(PORT, () => console.log(`Order Service running on port ${PORT}`));
  })
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
