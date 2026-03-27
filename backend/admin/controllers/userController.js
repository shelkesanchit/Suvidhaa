const bcrypt = require('bcryptjs');
const { pool } = require('../../config/database');

const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT id, email, role, full_name, phone, is_active, created_at FROM electricity_users WHERE 1=1';
    const params = [];
    let idx = 1;

    if (role) { query += ' AND role = $' + idx++; params.push(role); }
    query += ' ORDER BY created_at DESC LIMIT $' + idx++ + ' OFFSET $' + idx++;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const createStaffUser = async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    const existing = await pool.query('SELECT id FROM electricity_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO electricity_users (email, password, role, full_name, phone) VALUES ($1, $2, $3, $4, $5)',
      [email, hashedPassword, 'staff', full_name, phone]
    );

    res.status(201).json({ message: 'Staff user created successfully' });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff user' });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    await pool.query(
      'UPDATE electricity_users SET is_active = NOT is_active WHERE id = $1',
      [userId]
    );
    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

module.exports = { getAllUsers, createStaffUser, toggleUserStatus };
