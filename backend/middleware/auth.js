const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, email, role, full_name, is_active FROM electricity_users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    if (!result.rows[0].is_active) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

const isAdminOrStaff = checkRole('admin', 'staff');
const isAdmin = checkRole('admin');
const isCustomer = checkRole('customer');

module.exports = { verifyToken, checkRole, isAdmin, isAdminOrStaff, isCustomer };
