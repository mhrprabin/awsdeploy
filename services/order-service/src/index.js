require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initDB }    = require('./config/database');
const orderRoutes   = require('./routes/orderRoutes');

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'order-service', status: 'ok' }));
app.use('/api/orders', orderRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initDB()
  .then(() => app.listen(PORT, () => console.log(`Order Service running on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
