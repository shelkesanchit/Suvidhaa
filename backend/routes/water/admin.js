const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ─── Middleware ────────────────────────────────────────────────────────────────
const verifyWaterAdminToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, email, role, full_name, phone, is_active FROM water_users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const user = result.rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });
    if (user.role !== 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Admin or staff access required' });
    }
    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM water_users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated' });
    if (user.role !== 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Admin or staff access required' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, phone: user.phone }
    });
  } catch (error) {
    console.error('Water admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current admin user
router.get('/auth/me', verifyWaterAdminToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, full_name, phone, created_at FROM water_users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Water admin auth/me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/dashboard/stats', verifyWaterAdminToken, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM water_consumers) AS total_consumers,
        (SELECT COUNT(*) FROM water_consumers WHERE connection_status = 'active') AS active_connections,
        (SELECT COUNT(*) FROM water_applications WHERE status = 'submitted' OR status = 'document_verification' OR status = 'site_inspection' OR status = 'approval_pending') AS pending_applications,
        (SELECT COUNT(*) FROM water_complaints WHERE status IN ('open','assigned','in_progress')) AS open_complaints,
        (SELECT COALESCE(SUM(amount),0) FROM water_payments WHERE payment_status='success' AND DATE(payment_date)=CURRENT_DATE) AS today_revenue,
        (SELECT COALESCE(SUM(amount),0) FROM water_payments WHERE payment_status='success' AND DATE_TRUNC('month',payment_date)=DATE_TRUNC('month',CURRENT_DATE)) AS month_revenue,
        (SELECT COUNT(*) FROM water_applications WHERE DATE(submitted_at)=CURRENT_DATE) AS today_applications,
        (SELECT COUNT(*) FROM water_complaints WHERE DATE(submitted_at)=CURRENT_DATE) AS today_complaints
    `);

    const stats = statsResult.rows[0];

    // Applications trend (last 7 days)
    const trendResult = await pool.query(`
      SELECT TO_CHAR(d.day, 'Dy') AS name, COALESCE(a.count, 0) AS applications
      FROM (SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS day) d
      LEFT JOIN (
        SELECT DATE(submitted_at) AS day, COUNT(*) AS count
        FROM water_applications
        WHERE submitted_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(submitted_at)
      ) a ON d.day = a.day
      ORDER BY d.day
    `);

    // Revenue trend (last 6 months)
    const revResult = await pool.query(`
      SELECT TO_CHAR(m.month, 'Mon') AS name, COALESCE(p.revenue, 0) AS revenue
      FROM (SELECT generate_series(DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
                                   DATE_TRUNC('month', CURRENT_DATE), INTERVAL '1 month') AS month) m
      LEFT JOIN (
        SELECT DATE_TRUNC('month', payment_date) AS month, SUM(amount) AS revenue
        FROM water_payments WHERE payment_status='success'
        GROUP BY DATE_TRUNC('month', payment_date)
      ) p ON m.month = p.month
      ORDER BY m.month
    `);

    // Applications by type
    const typeResult = await pool.query(`
      SELECT application_type AS name, COUNT(*) AS value
      FROM water_applications GROUP BY application_type ORDER BY value DESC
    `);

    // Complaints by category
    const catResult = await pool.query(`
      SELECT complaint_category AS name, COUNT(*) AS value
      FROM water_complaints GROUP BY complaint_category ORDER BY value DESC LIMIT 6
    `);

    // Complaints by status
    const statusResult = await pool.query(`
      SELECT status AS name, COUNT(*) AS value
      FROM water_complaints GROUP BY status
    `);

    res.json({
      success: true,
      data: {
        total_consumers: parseInt(stats.total_consumers),
        active_connections: parseInt(stats.active_connections),
        pending_applications: parseInt(stats.pending_applications),
        open_complaints: parseInt(stats.open_complaints),
        today_revenue: parseFloat(stats.today_revenue),
        month_revenue: parseFloat(stats.month_revenue),
        today_applications: parseInt(stats.today_applications),
        today_complaints: parseInt(stats.today_complaints),
        applicationsTrend: trendResult.rows,
        revenueTrend: revResult.rows.map(r => ({ ...r, revenue: parseFloat(r.revenue) })),
        applicationsByType: typeResult.rows.map(r => ({ ...r, value: parseInt(r.value) })),
        complaintsByCategory: catResult.rows.map(r => ({ ...r, value: parseInt(r.value) })),
        complaintsByStatus: statusResult.rows.map(r => ({ ...r, value: parseInt(r.value) }))
      }
    });
  } catch (error) {
    console.error('Water dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats', message: error.message });
  }
});

// ─── Applications ─────────────────────────────────────────────────────────────
router.get('/applications', verifyWaterAdminToken, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (search) {
      conditions.push(`(full_name ILIKE $${idx} OR mobile ILIKE $${idx} OR application_number ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(
      `SELECT id, application_number, application_type, full_name, mobile, email, address, ward,
              status, current_stage, stage_history, documents, remarks, assigned_engineer,
              submitted_at, reviewed_at, completed_at, application_data
       FROM water_applications ${where}
       ORDER BY submitted_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM water_applications ${where}`,
      params.slice(0, -2)
    );

    res.json({ success: true, data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (error) {
    console.error('Water admin get applications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/applications/:id', verifyWaterAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, current_stage, assigned_engineer } = req.body;

    const appResult = await pool.query('SELECT * FROM water_applications WHERE id = $1', [id]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const app = appResult.rows[0];
    const stageHistory = Array.isArray(app.stage_history) ? app.stage_history : [];
    if (status && status !== app.status) {
      stageHistory.push({
        stage: current_stage || status,
        status,
        timestamp: new Date().toISOString(),
        remarks: remarks || '',
        updated_by: req.user.full_name
      });
    }

    const updates = [];
    const vals = [];
    let i = 1;
    if (status) { updates.push(`status=$${i++}`); vals.push(status); }
    if (remarks !== undefined) { updates.push(`remarks=$${i++}`); vals.push(remarks); }
    if (current_stage) { updates.push(`current_stage=$${i++}`); vals.push(current_stage); }
    if (assigned_engineer !== undefined) { updates.push(`assigned_engineer=$${i++}`); vals.push(assigned_engineer); }
    updates.push(`stage_history=$${i++}`); vals.push(JSON.stringify(stageHistory));
    updates.push(`reviewed_at=NOW()`);
    updates.push(`reviewed_by=$${i++}`); vals.push(req.user.id);
    if (status === 'completed') { updates.push(`completed_at=NOW()`); }
    vals.push(parseInt(id));

    await pool.query(
      `UPDATE water_applications SET ${updates.join(', ')} WHERE id = $${i}`,
      vals
    );

    res.json({ success: true, message: 'Application updated successfully' });
  } catch (error) {
    console.error('Water admin update application error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Complaints ───────────────────────────────────────────────────────────────
router.get('/complaints', verifyWaterAdminToken, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (search) {
      conditions.push(`(contact_name ILIKE $${idx} OR mobile ILIKE $${idx} OR complaint_number ILIKE $${idx} OR consumer_number ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(
      `SELECT id, complaint_number, consumer_number, contact_name, mobile, email,
              address, ward, complaint_category, description, urgency, priority,
              status, resolution_notes, stage_history, documents,
              submitted_at, resolved_at
       FROM water_complaints ${where}
       ORDER BY submitted_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM water_complaints ${where}`,
      params.slice(0, -2)
    );

    res.json({ success: true, data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (error) {
    console.error('Water admin get complaints error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/complaints/:id', verifyWaterAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes, priority } = req.body;

    const compResult = await pool.query('SELECT * FROM water_complaints WHERE id = $1', [id]);
    if (compResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    const comp = compResult.rows[0];
    const stageHistory = Array.isArray(comp.stage_history) ? comp.stage_history : [];
    if (status && status !== comp.status) {
      stageHistory.push({
        stage: status, status,
        timestamp: new Date().toISOString(),
        remarks: resolution_notes || '',
        updated_by: req.user.full_name
      });
    }

    const updates = [];
    const vals = [];
    let i = 1;
    if (status) { updates.push(`status=$${i++}`); vals.push(status); }
    if (resolution_notes !== undefined) { updates.push(`resolution_notes=$${i++}`); vals.push(resolution_notes); }
    if (priority) { updates.push(`priority=$${i++}`); vals.push(priority); }
    updates.push(`stage_history=$${i++}`); vals.push(JSON.stringify(stageHistory));
    if (status === 'resolved' || status === 'closed') { updates.push(`resolved_at=NOW()`); }
    vals.push(parseInt(id));

    await pool.query(
      `UPDATE water_complaints SET ${updates.join(', ')} WHERE id = $${i}`,
      vals
    );

    res.json({ success: true, message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('Water admin update complaint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Consumers ────────────────────────────────────────────────────────────────
router.get('/consumers', verifyWaterAdminToken, async (req, res) => {
  try {
    const { status, category, search, consumer_number, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`connection_status = $${idx++}`); params.push(status); }
    if (category) { conditions.push(`category = $${idx++}`); params.push(category); }
    if (consumer_number) { conditions.push(`consumer_number = $${idx++}`); params.push(consumer_number); }
    if (search) {
      conditions.push(`(full_name ILIKE $${idx} OR consumer_number ILIKE $${idx} OR mobile ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(
      `SELECT id, consumer_number, full_name AS name, full_name, email, mobile, address, ward,
              category, connection_status AS status, connection_status,
              meter_number, pipe_size, last_reading, last_reading_date,
              total_dues, connection_date, created_at
       FROM water_consumers ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM water_consumers ${where}`,
      params.slice(0, -2)
    );

    res.json({ success: true, data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (error) {
    console.error('Water admin get consumers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/consumers/:id', verifyWaterAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, address, category, status } = req.body;

    const consumerResult = await pool.query('SELECT id FROM water_consumers WHERE id = $1', [id]);
    if (consumerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consumer not found' });
    }

    const updates = [];
    const vals = [];
    let i = 1;
    if (name !== undefined) { updates.push(`full_name=$${i++}`); vals.push(name); }
    if (email !== undefined) { updates.push(`email=$${i++}`); vals.push(email); }
    if (mobile !== undefined) { updates.push(`mobile=$${i++}`); vals.push(mobile); }
    if (address !== undefined) { updates.push(`address=$${i++}`); vals.push(address); }
    if (category !== undefined) { updates.push(`category=$${i++}`); vals.push(category); }
    if (status !== undefined) { updates.push(`connection_status=$${i++}`); vals.push(status); }
    updates.push(`updated_at=NOW()`);

    if (updates.length === 1) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    vals.push(parseInt(id));
    await pool.query(
      `UPDATE water_consumers SET ${updates.join(', ')} WHERE id = $${i}`,
      vals
    );

    res.json({ success: true, message: 'Consumer updated successfully' });
  } catch (error) {
    console.error('Water admin update consumer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new consumer account
router.post('/consumers', verifyWaterAdminToken, async (req, res) => {
  try {
    const { full_name, email, mobile, address, ward, category, pipe_size, meter_number, connection_date } = req.body;
    if (!full_name || !mobile) {
      return res.status(400).json({ error: 'full_name and mobile are required' });
    }

    const year = new Date().getFullYear();
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM water_consumers WHERE EXTRACT(YEAR FROM created_at) = $1", [year]
    );
    const nextNum = parseInt(countResult.rows[0].count, 10) + 1;
    const consumerNumber = `WC${year}${String(nextNum).padStart(6, '0')}`;

    const insertResult = await pool.query(
      `INSERT INTO water_consumers
       (consumer_number, full_name, email, mobile, address, ward, category, pipe_size, meter_number, connection_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, consumer_number`,
      [consumerNumber, full_name, email || null, mobile, address || '', ward || null,
       category || 'domestic', pipe_size || '15mm', meter_number || null, connection_date || null]
    );

    res.status(201).json({
      success: true,
      message: 'Consumer account created',
      data: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Water admin create consumer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports', verifyWaterAdminToken, async (req, res) => {
  try {
    const { type = 'overview', month } = req.query;
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const [year, mon] = targetMonth.split('-');

    // Payment/Revenue report
    const paymentResult = await pool.query(
      `SELECT DATE(payment_date) AS date,
              SUM(amount) AS revenue,
              COUNT(*) AS transactions
       FROM water_payments
       WHERE payment_status='success'
         AND EXTRACT(YEAR FROM payment_date)=$1
         AND EXTRACT(MONTH FROM payment_date)=$2
       GROUP BY DATE(payment_date) ORDER BY date`,
      [parseInt(year), parseInt(mon)]
    );

    // Application stats
    const appResult = await pool.query(
      `SELECT application_type, status, COUNT(*) AS count
       FROM water_applications
       WHERE EXTRACT(YEAR FROM submitted_at)=$1
         AND EXTRACT(MONTH FROM submitted_at)=$2
       GROUP BY application_type, status`,
      [parseInt(year), parseInt(mon)]
    );

    // Complaint stats
    const compResult = await pool.query(
      `SELECT complaint_category, COUNT(*) AS total,
              SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END) AS resolved
       FROM water_complaints
       WHERE EXTRACT(YEAR FROM submitted_at)=$1
         AND EXTRACT(MONTH FROM submitted_at)=$2
       GROUP BY complaint_category`,
      [parseInt(year), parseInt(mon)]
    );

    // Consumer summary
    const consumerResult = await pool.query(
      `SELECT category,
              COUNT(*) AS total,
              SUM(CASE WHEN connection_status='active' THEN 1 ELSE 0 END) AS active,
              SUM(total_dues) AS outstanding_dues
       FROM water_consumers GROUP BY category`
    );

    const totalRevenue = paymentResult.rows.reduce((s, r) => s + parseFloat(r.revenue), 0);
    const totalTransactions = paymentResult.rows.reduce((s, r) => s + parseInt(r.transactions), 0);

    res.json({
      success: true,
      data: {
        month: targetMonth,
        revenue: {
          total: totalRevenue,
          transactions: totalTransactions,
          daily: paymentResult.rows
        },
        applications: appResult.rows,
        complaints: compResult.rows,
        consumers: consumerResult.rows
      }
    });
  } catch (error) {
    console.error('Water admin reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Admin User Management ────────────────────────────────────────────────────
router.get('/users', verifyWaterAdminToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const result = await pool.query(
      'SELECT id, email, role, full_name, phone, is_active, created_at FROM water_users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/staff', verifyWaterAdminToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { email, password, full_name, phone, role = 'staff' } = req.body;
    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ error: 'email, password, full_name, phone are required' });
    }

    const existing = await pool.query('SELECT id FROM water_users WHERE email=$1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO water_users (email, password, role, full_name, phone) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, role, full_name',
      [email.toLowerCase(), hashed, role, full_name, phone]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/users/:id/toggle-status', verifyWaterAdminToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await pool.query(
      'UPDATE water_users SET is_active = NOT is_active WHERE id=$1',
      [parseInt(req.params.id)]
    );
    res.json({ success: true, message: 'Status toggled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings
router.get('/settings', verifyWaterAdminToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value FROM water_system_settings ORDER BY setting_key'
    );
    const settings = {};
    result.rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json({ success: true, data: settings });
  } catch (_) {
    res.json({ success: true, data: {} });
  }
});

router.put('/settings', verifyWaterAdminToken, async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO water_system_settings (setting_key, setting_value)
         VALUES ($1, $2)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
    }
    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tariffs
router.get('/tariffs', verifyWaterAdminToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM water_tariffs ORDER BY category, min_units'
    );
    res.json({ success: true, data: result.rows });
  } catch (_) {
    res.json({ success: true, data: [] });
  }
});

router.post('/tariffs', verifyWaterAdminToken, async (req, res) => {
  try {
    const { category, slab_name, min_units, max_units, rate_per_kl, fixed_charge, is_active } = req.body;
    const result = await pool.query(
      `INSERT INTO water_tariffs (category, slab_name, min_units, max_units, rate_per_kl, fixed_charge, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [category, slab_name, min_units || 0, max_units || null, rate_per_kl, fixed_charge || 0, is_active !== false]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/tariffs/:id', verifyWaterAdminToken, async (req, res) => {
  try {
    const { category, slab_name, min_units, max_units, rate_per_kl, fixed_charge, is_active } = req.body;
    await pool.query(
      `UPDATE water_tariffs SET category=$1, slab_name=$2, min_units=$3, max_units=$4,
       rate_per_kl=$5, fixed_charge=$6, is_active=$7, updated_at=NOW() WHERE id=$8`,
      [category, slab_name, min_units, max_units || null, rate_per_kl, fixed_charge || 0, is_active !== false, req.params.id]
    );
    res.json({ success: true, message: 'Tariff updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/tariffs/:id', verifyWaterAdminToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM water_tariffs WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Tariff deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
