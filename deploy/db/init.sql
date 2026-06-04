-- ─────────────────────────────────────────────────────────────────────────────
-- RDS initialisation — run once per deployment (fully idempotent)
-- Creates all databases and tables; safe to re-run on every deploy.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── users_db ─────────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS users_db;
USE users_db;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,
  role       ENUM('admin','user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── orders_db ────────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS orders_db;
USE orders_db;

CREATE TABLE IF NOT EXISTS orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status      ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── products_db ──────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS products_db;
USE products_db;

CREATE TABLE IF NOT EXISTS products (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,
  stock       INT DEFAULT 0,
  category    VARCHAR(100),
  image_url   VARCHAR(500),
  created_at  TIMESTAMP NULL,
  updated_at  TIMESTAMP NULL,
  INDEX idx_category (category)
);

-- Laravel migration tracking (so artisan migrate is a no-op on first boot)
CREATE TABLE IF NOT EXISTS migrations (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  migration VARCHAR(255) NOT NULL,
  batch     INT NOT NULL
);
INSERT IGNORE INTO migrations (id, migration, batch)
VALUES (1, '2024_01_01_000000_create_products_table', 1);

-- ── payments_db ──────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS payments_db;
USE payments_db;

CREATE TABLE IF NOT EXISTS payments (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'USD',
  method          ENUM('card','bank_transfer','wallet','cash') DEFAULT 'card',
  status          ENUM('pending','processing','completed','failed','refunded') DEFAULT 'pending',
  transaction_ref VARCHAR(100) UNIQUE NOT NULL,
  notes           TEXT,
  paid_at         TIMESTAMP NULL,
  created_at      TIMESTAMP NULL,
  updated_at      TIMESTAMP NULL,
  INDEX idx_order_id (order_id),
  INDEX idx_user_id  (user_id),
  INDEX idx_status   (status)
);

-- Laravel migration tracking
CREATE TABLE IF NOT EXISTS migrations (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  migration VARCHAR(255) NOT NULL,
  batch     INT NOT NULL
);
INSERT IGNORE INTO migrations (id, migration, batch)
VALUES (1, '2024_01_01_000000_create_payments_table', 1);

-- ── notifications_db ─────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS notifications_db;
USE notifications_db;

CREATE TABLE IF NOT EXISTS notifications (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  type           ENUM(
                   'order_placed','order_confirmed','order_shipped','order_delivered',
                   'payment_partial','payment_success','payment_failed','payment_refunded',
                   'system'
                 ) NOT NULL DEFAULT 'system',
  title          VARCHAR(200) NOT NULL,
  message        TEXT NOT NULL,
  is_read        TINYINT(1) DEFAULT 0,
  reference_id   INT,
  reference_type VARCHAR(50),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);
