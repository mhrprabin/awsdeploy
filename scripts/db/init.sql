-- Create all 4 databases on startup
CREATE DATABASE IF NOT EXISTS users_db;
CREATE DATABASE IF NOT EXISTS orders_db;
CREATE DATABASE IF NOT EXISTS products_db;
CREATE DATABASE IF NOT EXISTS payments_db;

-- Grant access to root (containers use root for simplicity; use appuser in prod)
GRANT ALL PRIVILEGES ON users_db.*    TO 'root'@'%';
GRANT ALL PRIVILEGES ON orders_db.*   TO 'root'@'%';
GRANT ALL PRIVILEGES ON products_db.* TO 'root'@'%';
GRANT ALL PRIVILEGES ON payments_db.* TO 'root'@'%';
FLUSH PRIVILEGES;
