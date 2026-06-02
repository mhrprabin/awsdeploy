const { pool } = require('../config/database');
const { HTTP, ORDER_STATUSES } = require('../constants');

async function createOrder(req, res) {
  const { product_id, quantity, total_price, notes } = req.body;
  if (!product_id || !quantity || !total_price) {
    return res.status(400).json({ error: 'product_id, quantity, total_price are required' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO orders (user_id, product_id, quantity, total_price, notes) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, product_id, quantity, total_price, notes || null]
    );
    res.status(201).json({
      id: result.insertId,
      user_id: req.user.id,
      product_id,
      quantity,
      total_price,
      status: 'pending',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getMyOrders(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ orders: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getOrderById(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ORDER_STATUSES;
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }
  try {
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Order status updated', id: Number(id), status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAllOrders(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({ orders: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteOrder(req, res) {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ message: 'Order deleted', id: Number(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createOrder, getMyOrders, getOrderById, updateStatus, getAllOrders, deleteOrder };
