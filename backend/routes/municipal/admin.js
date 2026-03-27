const express = require('express');
const router  = express.Router();
const { pool } = require('../../config/database');
const { verifyMunicipalToken } = require('./auth');

// All admin routes require a valid municipal user token
router.use(verifyMunicipalToken);

// ─── Helper: write audit log ──────────────────────────────────────────────────
async function auditLog(client, userId, action, entityType, entityId, details, ip) {
  try {
    await client.query(
      `INSERT INTO municipal_audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, action, entityType || null, entityId || null,
       details ? JSON.stringify(details) : null, ip || null]
    );
  } catch (_) { /* audit failure must not block the main operation */ }
}

function requireAdminOrStaff(req, res, next) {
  if (!['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}

// ─── GET /admin/dashboard/stats ──────────────────────────────────────────────
router.get('/dashboard/stats', requireAdminOrStaff, async (req, res) => {
  try {
    const [
      appByStatus, appByDept, complaintByStatus,
      licenseByStatus, billByStatus,
      totalConsumers, totalPayments, recentApps, recentComplaints
    ] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) AS count FROM municipal_applications GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT department, COUNT(*) AS count FROM municipal_applications GROUP BY department ORDER BY count DESC`),
      pool.query(`SELECT status, COUNT(*) AS count FROM municipal_complaints GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT status, COUNT(*) AS count FROM municipal_licenses GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT status, COUNT(*) AS count FROM municipal_bills GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT COUNT(*) FROM municipal_consumers WHERE is_active = true`),
      pool.query(`SELECT COUNT(*) FROM municipal_payments WHERE payment_status = 'success'`),
      pool.query(
        `SELECT id, application_number, application_type, department, full_name, status, submitted_at
         FROM municipal_applications ORDER BY submitted_at DESC LIMIT 10`
      ),
      pool.query(
        `SELECT id, complaint_number, department, complaint_category, urgency, status, submitted_at
         FROM municipal_complaints ORDER BY submitted_at DESC LIMIT 5`
      )
    ]);

    res.json({
      success: true,
      data: {
        applications:       { by_status: appByStatus.rows, by_department: appByDept.rows },
        complaints:         { by_status: complaintByStatus.rows },
        licenses:           { by_status: licenseByStatus.rows },
        bills:              { by_status: billByStatus.rows },
        total_consumers:    parseInt(totalConsumers.rows[0].count),
        total_payments:     parseInt(totalPayments.rows[0].count),
        recent_applications: recentApps.rows,
        recent_complaints:  recentComplaints.rows
      }
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Alias: GET /admin/stats (backward compat) ───────────────────────────────
router.get('/stats', requireAdminOrStaff, async (req, res, next) => {
  req.url = '/dashboard/stats';
  next('route');
});

// ─── GET /admin/applications ──────────────────────────────────────────────────
router.get('/applications', requireAdminOrStaff, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const conds  = [];
    const vals   = [];
    let   idx    = 1;

    if (req.query.status)           { conds.push(`status = $${idx++}`);           vals.push(req.query.status); }
    if (req.query.department)       { conds.push(`department = $${idx++}`);        vals.push(req.query.department); }
    if (req.query.application_type) { conds.push(`application_type = $${idx++}`); vals.push(req.query.application_type); }
    if (req.query.search) {
      conds.push(`(application_number ILIKE $${idx} OR full_name ILIKE $${idx} OR mobile ILIKE $${idx})`);
      vals.push(`%${req.query.search}%`); idx++;
    }

    const where    = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM municipal_applications ${where}`, vals);

    const dataRes = await pool.query(
      `SELECT id, application_number, application_type, department,
              full_name, mobile, email, ward, status, current_stage, submitted_at, completed_at
       FROM municipal_applications ${where}
       ORDER BY submitted_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    );

    res.json({
      success: true, data: dataRes.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0].count), pages: Math.ceil(parseInt(countRes.rows[0].count) / limit) }
    });
  } catch (err) {
    console.error('Admin get applications error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /admin/applications/:id ─────────────────────────────────────────────
router.get('/applications/:id', requireAdminOrStaff, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name AS assigned_to_name, r.full_name AS reviewed_by_name
       FROM municipal_applications a
       LEFT JOIN municipal_users u ON u.id = a.assigned_to
       LEFT JOIN municipal_users r ON r.id = a.reviewed_by
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Admin get application detail error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /admin/applications/:id/status ────────────────────────────────────
router.patch('/applications/:id/status', requireAdminOrStaff, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { status, remarks, current_stage } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });

    const existing = await client.query(
      'SELECT stage_history, mobile, email, application_number FROM municipal_applications WHERE id = $1',
      [req.params.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });

    const row          = existing.rows[0];
    const stageHistory = row.stage_history || [];
    stageHistory.push({
      stage: current_stage || status, status,
      timestamp: new Date().toISOString(), updated_by: req.user.full_name, remarks: remarks || ''
    });

    const completedAt = ['approved', 'rejected', 'completed', 'closed'].includes(status)
      ? new Date().toISOString() : null;

    await client.query(
      `UPDATE municipal_applications
       SET status = $1, current_stage = $2, remarks = COALESCE($3, remarks),
           stage_history = $4, reviewed_by = $5, reviewed_at = NOW(),
           completed_at = COALESCE($6, completed_at)
       WHERE id = $7`,
      [status, current_stage || status, remarks || null, JSON.stringify(stageHistory),
       req.user.id, completedAt, req.params.id]
    );

    // Notify applicant
    if (row.mobile || row.email) {
      await client.query(
        `INSERT INTO municipal_notifications (mobile, email, title, message, type, reference_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.mobile || null, row.email || null,
         'Application Status Updated',
         `Your application ${row.application_number} is now: ${status}.${remarks ? ' Note: ' + remarks : ''}`,
         ['approved', 'completed'].includes(status) ? 'success' : 'info',
         row.application_number]
      );
    }

    await auditLog(client, req.user.id, 'application_status_updated', 'application',
      parseInt(req.params.id), { status, remarks }, req.ip);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Application status updated' });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Admin update status error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (client) client.release();
  }
});

// ─── PATCH /admin/applications/:id/assign ────────────────────────────────────
router.patch('/applications/:id/assign', requireAdminOrStaff, async (req, res) => {
  try {
    const { assigned_to } = req.body;
    await pool.query('UPDATE municipal_applications SET assigned_to = $1 WHERE id = $2', [assigned_to, req.params.id]);
    res.json({ success: true, message: 'Application assigned' });
  } catch (err) {
    console.error('Admin assign error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /admin/complaints ────────────────────────────────────────────────────
router.get('/complaints', requireAdminOrStaff, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const conds  = [];
    const vals   = [];
    let   idx    = 1;

    if (req.query.status)     { conds.push(`status = $${idx++}`);     vals.push(req.query.status); }
    if (req.query.department) { conds.push(`department = $${idx++}`); vals.push(req.query.department); }
    if (req.query.urgency)    { conds.push(`urgency = $${idx++}`);    vals.push(req.query.urgency); }
    if (req.query.search) {
      conds.push(`(complaint_number ILIKE $${idx} OR contact_name ILIKE $${idx} OR mobile ILIKE $${idx})`);
      vals.push(`%${req.query.search}%`); idx++;
    }

    const where    = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM municipal_complaints ${where}`, vals);

    const dataRes = await pool.query(
      `SELECT id, complaint_number, department, complaint_category, urgency,
              contact_name, mobile, status, submitted_at, resolved_at
       FROM municipal_complaints ${where}
       ORDER BY
         CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         submitted_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    );

    res.json({
      success: true, data: dataRes.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0].count), pages: Math.ceil(parseInt(countRes.rows[0].count) / limit) }
    });
  } catch (err) {
    console.error('Admin list complaints error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /admin/complaints/:id/status ──────────────────────────────────────
router.patch('/complaints/:id/status', requireAdminOrStaff, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { status, resolution_notes, assigned_to } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });

    const existing = await client.query(
      'SELECT stage_history, mobile, email, complaint_number FROM municipal_complaints WHERE id = $1',
      [req.params.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const row          = existing.rows[0];
    const stageHistory = row.stage_history || [];
    stageHistory.push({
      stage: status, status,
      timestamp: new Date().toISOString(), updated_by: req.user.full_name,
      notes: resolution_notes || ''
    });

    const resolvedAt = ['resolved', 'closed'].includes(status) ? new Date().toISOString() : null;

    await client.query(
      `UPDATE municipal_complaints
       SET status = $1, resolution_notes = COALESCE($2, resolution_notes),
           stage_history = $3, assigned_to = COALESCE($4, assigned_to),
           resolved_at = COALESCE($5, resolved_at)
       WHERE id = $6`,
      [status, resolution_notes || null, JSON.stringify(stageHistory),
       assigned_to || null, resolvedAt, req.params.id]
    );

    if (row.mobile || row.email) {
      await client.query(
        `INSERT INTO municipal_notifications (mobile, email, title, message, type, reference_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.mobile || null, row.email || null,
         'Complaint Status Updated',
         `Your complaint ${row.complaint_number} is now: ${status}.`,
         ['resolved', 'closed'].includes(status) ? 'success' : 'info',
         row.complaint_number]
      );
    }

    await auditLog(client, req.user.id, 'complaint_status_updated', 'complaint',
      parseInt(req.params.id), { status }, req.ip);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Complaint status updated' });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Admin update complaint status error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (client) client.release();
  }
});

// ─── GET /admin/licenses ──────────────────────────────────────────────────────
router.get('/licenses', requireAdminOrStaff, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const conds  = [];
    const vals   = [];
    let   idx    = 1;

    if (req.query.status)       { conds.push(`status = $${idx++}`);       vals.push(req.query.status); }
    if (req.query.license_type) { conds.push(`license_type = $${idx++}`); vals.push(req.query.license_type); }

    const where    = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM municipal_licenses ${where}`, vals);

    const dataRes = await pool.query(
      `SELECT id, license_number, license_type, business_name, owner_name, mobile,
              ward, valid_from, valid_until, status, issued_at
       FROM municipal_licenses ${where}
       ORDER BY issued_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    );

    res.json({
      success: true, data: dataRes.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0].count), pages: Math.ceil(parseInt(countRes.rows[0].count) / limit) }
    });
  } catch (err) {
    console.error('Admin list licenses error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /admin/licenses (issue a new license) ───────────────────────────────
router.post('/licenses', requireAdminOrStaff, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const {
      application_id, consumer_id, license_type,
      business_name, owner_name, mobile, address, ward,
      valid_from, valid_until, license_data
    } = req.body;

    if (!license_type || !owner_name) {
      return res.status(400).json({ success: false, message: 'license_type and owner_name are required' });
    }

    const ins = await client.query(
      `INSERT INTO municipal_licenses
         (license_number, application_id, consumer_id, license_type,
          business_name, owner_name, mobile, address, ward,
          valid_from, valid_until, issued_by, license_data)
       VALUES ('PENDING', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [application_id || null, consumer_id || null, license_type,
       business_name || null, owner_name, mobile || '', address || null, ward || null,
       valid_from || null, valid_until || null, req.user.id,
       JSON.stringify(license_data || {})]
    );

    const licenseId = ins.rows[0].id;
    const prefixMap = {
      trade_license: 'MTL', health_hygiene: 'MHL', food_establishment: 'MFL',
      advertisement_permit: 'MAD', building_permit: 'MBP', road_cutting: 'MRC'
    };
    const prefix        = prefixMap[license_type] || 'MLIC';
    const licenseNumber = `${prefix}${new Date().getFullYear()}${String(licenseId).padStart(6, '0')}`;

    await client.query('UPDATE municipal_licenses SET license_number = $1 WHERE id = $2', [licenseNumber, licenseId]);

    // If tied to an application, mark it complete
    if (application_id) {
      await client.query(
        `UPDATE municipal_applications SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [application_id]
      );
    }

    await auditLog(client, req.user.id, 'license_issued', 'license', licenseId,
      { license_type, owner_name }, req.ip);

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'License issued successfully',
      data: { license_id: licenseId, license_number: licenseNumber }
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Admin issue license error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (client) client.release();
  }
});

// ─── PATCH /admin/licenses/:id/status ────────────────────────────────────────
router.patch('/licenses/:id/status', requireAdminOrStaff, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE municipal_licenses SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true, message: 'License status updated' });
  } catch (err) {
    console.error('Admin update license status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /admin/certificates ──────────────────────────────────────────────────
router.get('/certificates', requireAdminOrStaff, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const conds  = [];
    const vals   = [];
    let   idx    = 1;

    if (req.query.certificate_type) { conds.push(`certificate_type = $${idx++}`); vals.push(req.query.certificate_type); }
    if (req.query.status)           { conds.push(`status = $${idx++}`);           vals.push(req.query.status); }

    const where    = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM municipal_certificates ${where}`, vals);

    const dataRes = await pool.query(
      `SELECT id, certificate_number, certificate_type, full_name, mobile, ward, event_date, status, issued_at
       FROM municipal_certificates ${where}
       ORDER BY issued_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    );

    res.json({
      success: true, data: dataRes.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0].count), pages: Math.ceil(parseInt(countRes.rows[0].count) / limit) }
    });
  } catch (err) {
    console.error('Admin list certificates error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /admin/certificates (issue a certificate) ──────────────────────────
router.post('/certificates', requireAdminOrStaff, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const {
      application_id, certificate_type, full_name, mobile, email, ward,
      event_date, certificate_data
    } = req.body;

    if (!certificate_type || !full_name) {
      return res.status(400).json({ success: false, message: 'certificate_type and full_name are required' });
    }

    const ins = await client.query(
      `INSERT INTO municipal_certificates
         (certificate_number, application_id, certificate_type, full_name, mobile, email, ward,
          event_date, certificate_data, issued_by)
       VALUES ('PENDING', $1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [application_id || null, certificate_type, full_name, mobile || null, email || null,
       ward || null, event_date || null, JSON.stringify(certificate_data || {}), req.user.id]
    );

    const certId     = ins.rows[0].id;
    const certNumber = `MCER${new Date().getFullYear()}${String(certId).padStart(6, '0')}`;

    await client.query('UPDATE municipal_certificates SET certificate_number = $1 WHERE id = $2', [certNumber, certId]);

    if (application_id) {
      await client.query(
        `UPDATE municipal_applications SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [application_id]
      );
    }

    await auditLog(client, req.user.id, 'certificate_issued', 'certificate', certId,
      { certificate_type, full_name }, req.ip);

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      data: { certificate_id: certId, certificate_number: certNumber }
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Admin issue certificate error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (client) client.release();
  }
});

// ─── GET /admin/consumers ─────────────────────────────────────────────────────
router.get('/consumers', requireAdminOrStaff, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const conds  = [];
    const vals   = [];
    let   idx    = 1;

    if (req.query.search) {
      conds.push(`(consumer_number ILIKE $${idx} OR full_name ILIKE $${idx} OR mobile ILIKE $${idx})`);
      vals.push(`%${req.query.search}%`); idx++;
    }
    if (req.query.consumer_number) { conds.push(`consumer_number = $${idx++}`); vals.push(req.query.consumer_number); }
    if (req.query.consumer_type) { conds.push(`consumer_type = $${idx++}`); vals.push(req.query.consumer_type); }

    const where    = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM municipal_consumers ${where}`, vals);

    const dataRes = await pool.query(
      `SELECT id, consumer_number, full_name, mobile, email, ward, consumer_type, is_active, created_at
       FROM municipal_consumers ${where}
       ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    );

    res.json({
      success: true, data: dataRes.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0].count), pages: Math.ceil(parseInt(countRes.rows[0].count) / limit) }
    });
  } catch (err) {
    console.error('Admin list consumers error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /admin/users ─────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const result = await pool.query(
      'SELECT id, email, role, full_name, phone, department, is_active, created_at FROM municipal_users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /admin/users/:id/toggle ───────────────────────────────────────────
router.patch('/users/:id/toggle', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    await pool.query('UPDATE municipal_users SET is_active = NOT is_active WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'User status toggled' });
  } catch (err) {
    console.error('Admin toggle user error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /admin/payments ──────────────────────────────────────────────────────
router.get('/payments', requireAdminOrStaff, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*) FROM municipal_payments');
    const dataRes  = await pool.query(
      `SELECT id, transaction_id, application_number, payer_name, mobile,
              amount, payment_type, payment_method, payment_status, payment_date
       FROM municipal_payments ORDER BY payment_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true, data: dataRes.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0].count), pages: Math.ceil(parseInt(countRes.rows[0].count) / limit) }
    });
  } catch (err) {
    console.error('Admin list payments error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /admin/audit-logs ────────────────────────────────────────────────────
router.get('/audit-logs', requireAdminOrStaff, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*) FROM municipal_audit_logs');
    const dataRes  = await pool.query(
      `SELECT l.*, u.full_name AS performed_by
       FROM municipal_audit_logs l
       LEFT JOIN municipal_users u ON u.id = l.user_id
       ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true, data: dataRes.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0].count), pages: Math.ceil(parseInt(countRes.rows[0].count) / limit) }
    });
  } catch (err) {
    console.error('Admin audit logs error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /admin/settings ─────────────────────────────────────────────────────
router.get('/settings', requireAdminOrStaff, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value, description FROM municipal_system_settings ORDER BY setting_key'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /admin/settings/:key ──────────────────────────────────────────────
router.patch('/settings/:key', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const { setting_value } = req.body;
    await pool.query(
      `UPDATE municipal_system_settings SET setting_value = $1, updated_by = $2, updated_at = NOW()
       WHERE setting_key = $3`,
      [setting_value, req.user.id, req.params.key]
    );
    res.json({ success: true, message: 'Setting updated' });
  } catch (err) {
    console.error('Admin update setting error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
