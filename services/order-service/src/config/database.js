const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 3306,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDB() {
  const conn = await pool.getConnection();

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      product_id   INT NOT NULL,
      quantity     INT NOT NULL DEFAULT 1,
      total_price  DECIMAL(10,2) NOT NULL,
      paid_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status       ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
      notes        TEXT,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Safe migration for existing tables that predate paid_amount
  await conn.execute(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00
  `).catch(() => {}); // older MySQL versions that don't support IF NOT EXISTS

  conn.release();
  console.log('orders_db initialized');
}

module.exports = { pool, initDB };
