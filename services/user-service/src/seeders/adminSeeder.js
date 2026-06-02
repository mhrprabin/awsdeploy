const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function seedAdmin() {
  const email    = process.env.ADMIN_EMAIL    || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const name     = process.env.ADMIN_NAME     || 'Super Admin';

  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE email = ?', [email]
  );

  if (existing.length > 0) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.execute(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, 'admin']
  );

  console.log(`Admin created — email: ${email}`);
}

module.exports = { seedAdmin };
