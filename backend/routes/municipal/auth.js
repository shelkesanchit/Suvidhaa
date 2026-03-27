const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../../config/database');

// ─── JWT middleware (re-used in admin.js) ────────────────────────────────────
const verifyMunicipalToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, email, role, full_name, phone, department, is_active FROM municipal_users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const user = result.rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });
    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// exported below alongside the router

// ─── Register ────────────────────────────────────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phone').matches(/^[0-9]{10}$/),
  body('full_name').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, password, phone, full_name, department } = req.body;

    const existing = await pool.query(
      'SELECT id FROM municipal_users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO municipal_users (email, password, role, full_name, phone, department)
       VALUES ($1, $2, 'staff', $3, $4, $5) RETURNING id`,
      [email, hashedPassword, full_name, phone, department || null]
    );

    const userId = result.rows[0].id;
    const token = jwt.sign(
      { id: userId, email, role: 'staff' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, email, full_name, phone, role: 'staff', department }
    });
  } catch (error) {
    console.error('Municipal register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM municipal_users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id, email: user.email, full_name: user.full_name,
        role: user.role, phone: user.phone, department: user.department
      }
    });
  } catch (error) {
    console.error('Municipal login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Current user ────────────────────────────────────────────────────────────
router.get('/me', verifyMunicipalToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, full_name, phone, department, created_at FROM municipal_users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Municipal get me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

module.exports = router;
module.exports.verifyMunicipalToken = verifyMunicipalToken;
