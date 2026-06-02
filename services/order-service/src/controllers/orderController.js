const { pool }   = require('../config/database');
const { HTTP, ORDER_STATUSES } = require('../constants');
const kafka      = require('../events/kafkaProducer');

const TOPIC = 'order-events';

async function createOrder(req, res) {
  const { product_id, quantity, total_price, notes } = req.body;
  if (!product_id || !quantity || !total_price) {
    return res.status(HTTP.BAD_REQUEST).json({ error: 'product_id, quantity, total_price are required' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO orders (user_id, product_id, quantity, total_price, notes) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, product_id, quantity, total_price, notes || null]
    );
    const order = { id: result.insertId, user_id: req.user.id, product_id, quantity, total_price, status: 'pending' };
    res.status(HTTP.CREATED).json(order);

    // Publish event AFTER responding — never delay the HTTP response for Kafka
    kafka.publish(TOPIC, 'order.placed', {
      userId:     req.user.id,
      orderId:    result.insertId,
      productId:  product_id,
      quantity,
      totalPrice: total_price,
    });
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
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
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

async function getOrderById(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
    if (!rows.length) return res.status(HTTP.NOT_FOUND).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(HTTP.BAD_REQUEST).json({ error: `status must be one of: ${ORDER_STATUSES.join(', ')}` });
  }
  try {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
    if (!rows.length) return res.status(HTTP.NOT_FOUND).json({ error: 'Order not found' });

    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Order status updated', id: Number(id), status });

    kafka.publish(TOPIC, 'order.status_changed', {
      userId:  rows[0].user_id,
      orderId: Number(id),
      status,
    });
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

async function getAllOrders(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({ orders: rows, total: rows.length });
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

async function deleteOrder(req, res) {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ message: 'Order deleted', id: Number(id) });
  } catch (err) {
    res.status(HTTP.SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

module.exports = { createOrder, getMyOrders, getOrderById, updateStatus, getAllOrders, deleteOrder };
