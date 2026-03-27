const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const { verifyToken, isAdmin } = require('../../middleware/auth');

// Get all settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value, description FROM electricity_system_settings ORDER BY setting_key'
    );

    const settingsMap = {};
    result.rows.forEach(s => {
      settingsMap[s.setting_key] = { value: s.setting_value, description: s.description };
    });

    res.json(settingsMap);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get specific setting
router.get('/:key', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_value FROM electricity_system_settings WHERE setting_key = $1',
      [req.params.key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ value: result.rows[0].setting_value });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update setting (admin only)
router.put('/:key', verifyToken, isAdmin, async (req, res) => {
  try {
    const { value } = req.body;

    const result = await pool.query(
      'UPDATE electricity_system_settings SET setting_value = $1, updated_by = $2, updated_at = NOW() WHERE setting_key = $3',
      [value, req.user.id, req.params.key]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Get tariff rates
router.get('/tariffs/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value
       FROM electricity_system_settings
       WHERE setting_key LIKE 'tariff_%'
       ORDER BY setting_key`
    );

    const tariffs = {};
    result.rows.forEach(s => {
      tariffs[s.setting_key] = parseFloat(s.setting_value);
    });

    res.json(tariffs);
  } catch (error) {
    console.error('Get tariffs error:', error);
    res.status(500).json({ error: 'Failed to fetch tariffs' });
  }
});

module.exports = router;
