require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initDB }      = require('./config/database');
const { seedAdmin }   = require('./seeders/adminSeeder');
const userRoutes      = require('./routes/userRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'user-service', status: 'ok' }));
app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initDB()
  .then(seedAdmin)
  .then(() => app.listen(PORT, () => console.log(`User Service running on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
