const express = require('express');
const router  = express.Router();
const { pool } = require('../../config/database');
const { verifyMunicipalToken } = require('./auth');

// ─── GET /settings (public — read only) ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value, description FROM municipal_system_settings ORDER BY setting_key'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /settings/:key ───────────────────────────────────────────────────────
router.get('/:key', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value, description FROM municipal_system_settings WHERE setting_key = $1',
      [req.params.key]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get setting error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /settings/:key (admin only) ─────────────────────────────────────────
router.put('/:key', verifyMunicipalToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { setting_value } = req.body;
    if (setting_value === undefined) {
      return res.status(400).json({ success: false, message: 'setting_value is required' });
    }
    await pool.query(
      `UPDATE municipal_system_settings
       SET setting_value = $1, updated_by = $2, updated_at = NOW()
       WHERE setting_key = $3`,
      [setting_value, req.user.id, req.params.key]
    );
    res.json({ success: true, message: 'Setting updated' });
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
