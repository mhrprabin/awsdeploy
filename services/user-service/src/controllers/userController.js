const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/database');
const { HTTP, DB_ERRORS } = require('../constants');

async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, password are required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hash]
    );
    res.status(HTTP.CREATED).json({ id: result.insertId, name, email });
  } catch (err) {
    if (err.code === DB_ERRORS.DUPLICATE_ENTRY) {
      return res.status(HTTP.CONFLICT).json({ error: 'Email already registered' });
    }
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

async function getProfile(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

async function getAllUsers(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: rows, total: rows.length });
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email } = req.body;
  try {
    await pool.execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, id]);
    res.json({ message: 'User updated', id: Number(id), name, email });
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted', id: Number(id) });
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

module.exports = { register, login, getProfile, getAllUsers, updateUser, deleteUser };
