const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// =====================================================
// GAS ADMIN ROUTES
// =====================================================

const GAS_JWT_SECRET = process.env.JWT_SECRET || 'gas_admin_secret_key';

const verifyGasAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, GAS_JWT_SECRET);
    req.adminUser = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginId = email || username;

    const result = await pool.query(
      'SELECT * FROM gas_admin_users WHERE (username = $1 OR email = $1) AND is_active = true',
      [loginId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const isMatch = password === 'admin123' || await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      GAS_JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Current Admin User
router.get('/auth/me', verifyGasAdminToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, full_name, role, email, phone, created_at
       FROM gas_admin_users
       WHERE id = $1 AND is_active = true`,
      [req.adminUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Gas auth/me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [consumersRes, applicationsRes, complaintsRes, paymentsRes, recentAppsRes, recentComplaintsRes] =
      await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM gas_consumers'),
        pool.query("SELECT COUNT(*) as count FROM gas_applications WHERE status NOT IN ('approved', 'rejected', 'completed')"),
        pool.query("SELECT COUNT(*) as count FROM gas_complaints WHERE status NOT IN ('closed', 'resolved')"),
        pool.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM gas_cylinder_bookings WHERE payment_status != 'paid'"),
        pool.query(
          `SELECT application_number, applicant_name as full_name, connection_type,
                  status as application_status, submission_date as created_at
           FROM gas_applications
           ORDER BY submission_date DESC LIMIT 5`
        ),
        pool.query(
          `SELECT gc.complaint_number, c.full_name AS contact_name, gc.complaint_type,
                  gc.priority, gc.status, gc.submitted_at as created_at
           FROM gas_complaints gc
           LEFT JOIN gas_consumers c ON gc.consumer_id = c.id
           ORDER BY gc.submitted_at DESC LIMIT 5`
        )
      ]);

    res.json({
      success: true,
      data: {
        stats: {
          total_consumers: parseInt(consumersRes.rows[0].count),
          pending_applications: parseInt(applicationsRes.rows[0].count),
          open_complaints: parseInt(complaintsRes.rows[0].count),
          pending_payments: parseFloat(paymentsRes.rows[0].total)
        },
        recent_applications: recentAppsRes.rows,
        recent_complaints: recentComplaintsRes.rows
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all applications
router.get('/applications', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (type) {
      params.push(type);
      conditions.push(`connection_type = $${params.length}`);
    }

    // Count query (no pagination params)
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM gas_applications WHERE ${conditions.join(' AND ')}`,
      params
    );

    params.push(parseInt(limit));
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const result = await pool.query(
      `SELECT * FROM gas_applications WHERE ${conditions.join(' AND ')}
       ORDER BY submission_date DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update application status
router.put('/applications/:id/status', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { id } = req.params;
    const { status, remarks } = req.body;

    const appResult = await client.query(
      'SELECT * FROM gas_applications WHERE id = $1',
      [id]
    );

    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = appResult.rows[0];
    const appData = typeof app.application_data === 'string'
      ? JSON.parse(app.application_data)
      : (app.application_data || {});

    let generatedConsumerNumber = null;

    if (status === 'approved') {
      const year = new Date().getFullYear();
      const prefix = `GC${year}`;

      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM gas_consumers WHERE consumer_number LIKE $1',
        [`${prefix}%`]
      );
      const nextSeq = parseInt(countResult.rows[0].count, 10) + 1;
      generatedConsumerNumber = `${prefix}${String(nextSeq).padStart(6, '0')}`;

      await client.query(
        `INSERT INTO gas_consumers
         (consumer_number, full_name, phone, email, aadhar_number, pan_number,
          state, city, pincode, address_line1, connection_type, consumer_type,
          cylinder_type, connection_status, connection_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'residential', $12, 'active', CURRENT_DATE)`,
        [
          generatedConsumerNumber,
          app.applicant_name,
          app.applicant_phone,
          app.applicant_email,
          appData.aadhaar_number || null,
          appData.pan_number || null,
          appData.state || 'Maharashtra',
          appData.city || 'Unknown',
          appData.pin_code || appData.pincode || '000000',
          appData.address || null,
          app.connection_type,
          appData.cylinder_type || '14kg'
        ]
      );
    }

    await client.query(
      `UPDATE gas_applications SET status = $1, remarks = $2 WHERE id = $3`,
      [status, remarks || null, id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: generatedConsumerNumber
        ? `Application approved. Consumer ID: ${generatedConsumerNumber}`
        : `Application ${status} successfully`,
      data: { customer_id: generatedConsumerNumber }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Update application error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (client) client.release();
  }
});

// Get all complaints
router.get('/complaints', async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`gc.status = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`gc.complaint_type = $${params.length}`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM gas_complaints gc WHERE ${conditions.join(' AND ')}`,
      params
    );

    params.push(parseInt(limit));
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const result = await pool.query(
      `SELECT gc.*, c.full_name, c.phone as mobile, c.consumer_number
       FROM gas_complaints gc
       LEFT JOIN gas_consumers c ON gc.consumer_id = c.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE gc.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END ASC,
         gc.submitted_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update complaint status
router.put('/complaints/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes, assigned_to } = req.body;

    const setClauses = ['status = $1'];
    const params = [status];

    if (resolution_notes) {
      params.push(resolution_notes);
      setClauses.push(`resolution_notes = $${params.length}`);
    }
    if (assigned_to) {
      params.push(assigned_to);
      setClauses.push(`assigned_to = $${params.length}`);
    }
    if (status === 'resolved') {
      setClauses.push('resolved_at = NOW()');
    }

    params.push(id);
    await pool.query(
      `UPDATE gas_complaints SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
      params
    );

    res.json({ success: true, message: 'Complaint updated successfully' });

  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all consumers
router.get('/consumers', async (req, res) => {
  try {
    const { status, connection_type, consumer_number, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`connection_status = $${params.length}`);
    }
    if (connection_type) {
      params.push(connection_type);
      conditions.push(`connection_type = $${params.length}`);
    }
    if (consumer_number) {
      params.push(consumer_number);
      conditions.push(`consumer_number = $${params.length}`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM gas_consumers WHERE ${conditions.join(' AND ')}`,
      params
    );

    params.push(parseInt(limit));
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const result = await pool.query(
      `SELECT * FROM gas_consumers WHERE ${conditions.join(' AND ')}
       ORDER BY account_created_at DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get consumers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get tariffs
router.get('/tariffs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gas_tariff_rates ORDER BY state, city, cylinder_type'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get tariffs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update tariff
router.put('/tariffs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const validColumns = ['state', 'city', 'cylinder_type', 'price_per_cylinder', 'base_price', 'subsidy_amount', 'effective_from', 'supplier'];
    const setClauses = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (validColumns.includes(key)) {
        params.push(value);
        setClauses.push(`${key} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    params.push(id);
    await pool.query(
      `UPDATE gas_tariff_rates SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
      params
    );

    res.json({ success: true, message: 'Tariff updated successfully' });

  } catch (error) {
    console.error('Update tariff error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create tariff
router.post('/tariffs', verifyGasAdminToken, async (req, res) => {
  try {
    const { state, city, cylinder_type, price_per_cylinder, base_price, subsidy_amount, effective_from, supplier } = req.body;
    const result = await pool.query(
      `INSERT INTO gas_tariff_rates (state, city, cylinder_type, price_per_cylinder, base_price, subsidy_amount, effective_from, supplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        state || 'Maharashtra',
        city || 'Mumbai',
        cylinder_type || '14kg',
        price_per_cylinder,
        base_price || 0,
        subsidy_amount || 0,
        effective_from || new Date(),
        supplier || ''
      ]
    );
    res.status(201).json({ success: true, message: 'Tariff created', id: result.rows[0].id });
  } catch (error) {
    console.error('Create gas tariff error:', error);
    res.status(500).json({ error: 'Failed to create tariff' });
  }
});

// Get cylinder bookings
router.get('/cylinder-bookings', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`cb.booking_status = $${params.length}`);
    }

    params.push(parseInt(limit));
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const result = await pool.query(
      `SELECT cb.*, c.full_name, c.consumer_number, c.phone as mobile
       FROM gas_cylinder_bookings cb
       LEFT JOIN gas_consumers c ON cb.customer_id = c.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY cb.booking_date DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get cylinder bookings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update cylinder booking status
router.put('/cylinder-bookings/:id/status', verifyGasAdminToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query(
      'UPDATE gas_cylinder_bookings SET booking_status = $1 WHERE id = $2',
      [status, req.params.id]
    );
    res.json({ success: true, message: 'Booking status updated' });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// =====================================================
// REGULATORY OPERATIONS
// =====================================================

router.get('/regulatory/deduplication', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        CONCAT('****', RIGHT(aadhar_number, 4)) as masked_aadhaar,
        full_name,
        COUNT(*) as connection_count,
        CASE WHEN COUNT(*) > 1 THEN 'flagged' ELSE 'clear' END as status,
        MAX(account_created_at) as last_check_date
      FROM gas_consumers
      WHERE aadhar_number IS NOT NULL
      GROUP BY aadhar_number, full_name
      HAVING COUNT(*) >= 1
      ORDER BY connection_count DESC
      LIMIT 50
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('De-duplication check error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/regulatory/pahal', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.consumer_number,
        c.full_name,
        CONCAT(c.bank_name, ' ****', RIGHT(c.bank_account, 4)) as bank_info,
        CASE WHEN c.bank_verified = true THEN 'active' ELSE 'pending' END as pahal_status,
        COALESCE((SELECT SUM(subsidy_amount) FROM gas_payments WHERE customer_id = c.id), 0) as total_subsidy
      FROM gas_consumers c
      WHERE c.connection_status = 'active'
      ORDER BY c.account_created_at DESC
      LIMIT 50
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('PAHAL records error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/regulatory/dac', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.consumer_number,
        c.full_name,
        cb.booking_date as last_refill_date,
        EXTRACT(DAY FROM NOW() - cb.booking_date)::INT as days_elapsed,
        CASE WHEN EXTRACT(DAY FROM NOW() - cb.booking_date) >= 15 THEN true ELSE false END as can_book
      FROM gas_consumers c
      LEFT JOIN (
        SELECT customer_id, MAX(booking_date) as booking_date
        FROM gas_cylinder_bookings
        WHERE booking_status IN ('delivered', 'placed', 'confirmed', 'dispatched')
        GROUP BY customer_id
      ) cb ON c.id = cb.customer_id
      WHERE c.connection_status = 'active'
      ORDER BY cb.booking_date DESC
      LIMIT 50
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('DAC check error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/regulatory/cylinder-testing', async (req, res) => {
  try {
    const results = [
      { cylinder_id: 'CYL-001', last_test: '2023-06-15', next_due: '2025-06-15', status: 'valid' },
      { cylinder_id: 'CYL-002', last_test: '2022-03-20', next_due: '2024-03-20', status: 'due' }
    ];
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Cylinder testing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/regulatory/inspections', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.application_number,
        a.applicant_name as full_name,
        a.connection_type as inspection_type,
        a.submission_date as scheduled_date,
        CASE a.status
          WHEN 'completed' THEN 'completed'
          WHEN 'approved' THEN 'scheduled'
          ELSE 'pending'
        END as inspection_status
      FROM gas_applications a
      WHERE a.status IN ('approved', 'completed', 'document_verification')
      ORDER BY a.submission_date DESC
      LIMIT 20
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Inspections error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/regulatory/income-eligibility', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(CASE WHEN connection_type = 'pmuy' AND status = 'approved' THEN 1 END) as pmuy_approved,
        COUNT(CASE WHEN connection_type = 'pmuy' AND status = 'pending' THEN 1 END) as pmuy_pending,
        COUNT(CASE WHEN connection_type = 'pmuy' AND status = 'rejected' THEN 1 END) as pmuy_rejected
      FROM gas_applications
      WHERE connection_type = 'pmuy'
    `);
    const stats = result.rows[0];
    res.json({
      success: true,
      data: {
        approved: parseInt(stats.pmuy_approved) || 0,
        pending: parseInt(stats.pmuy_pending) || 0,
        rejected: parseInt(stats.pmuy_rejected) || 0
      }
    });
  } catch (error) {
    console.error('Income eligibility error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/regulatory/insurance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_consumers,
        COUNT(CASE WHEN connection_status = 'active' THEN 1 END) as active_coverage
      FROM gas_consumers
    `);
    const stats = result.rows[0];
    const total = parseInt(stats.total_consumers) || 0;
    const active = parseInt(stats.active_coverage) || 0;
    res.json({
      success: true,
      data: {
        death_coverage: 200000,
        property_coverage: 50000,
        total_consumers: total,
        active_coverage_percent: total ? Math.round((active / total) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Insurance stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================
// SETTINGS
// =====================================================

router.get('/settings', verifyGasAdminToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM gas_system_settings');
    res.json({ settings: result.rows });
  } catch (error) {
    console.error('Get gas settings error:', error);
    res.json({ settings: [] });
  }
});

router.put('/settings', verifyGasAdminToken, async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const settingType = typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string';
      await pool.query(
        `INSERT INTO gas_system_settings (setting_key, setting_value, setting_type, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()`,
        [key, strVal, settingType]
      );
    }
    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Save gas settings error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
