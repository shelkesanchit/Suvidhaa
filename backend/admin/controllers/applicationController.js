const { pool } = require('../../config/database');

const getAllApplications = async (req, res) => {
  try {
    const { status: filterStatus, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT a.id, a.application_number, a.user_id, a.application_type, a.status,
             a.application_data, a.documents, a.remarks, a.current_stage, a.stage_history,
             a.submitted_at, a.reviewed_at, a.completed_at,
             u.full_name as user_name, u.email as user_email, u.phone as user_phone
      FROM electricity_applications a
      LEFT JOIN electricity_users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filterStatus) {
      query += ' AND a.status = $' + paramIndex++;
      params.push(filterStatus);
    }

    query += ' ORDER BY a.submitted_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Process each row to extract full_name and email from application_data if not available from user
    const processedRows = result.rows.map(row => {
      let appData = {};
      try {
        appData = typeof row.application_data === 'string'
          ? JSON.parse(row.application_data)
          : (row.application_data || {});
      } catch (e) {
        appData = {};
      }

      return {
        ...row,
        full_name: row.user_name || appData.full_name || appData.name || 'Unknown',
        email: row.user_email || appData.email || '',
        phone: row.user_phone || appData.mobile || appData.phone || ''
      };
    });

    res.json({
      success: true,
      data: processedRows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: processedRows.length }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch applications', message: error.message });
  }
};

const updateApplication = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { status: newStatus, remarks, current_stage } = req.body;
    const applicationId = req.params.id;

    const appResult = await client.query(
      'SELECT id FROM electricity_applications WHERE id = $1',
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const stageLabel = current_stage || newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const stageEntry = JSON.stringify([{
      stage: stageLabel,
      status: newStatus,
      remarks: remarks || null,
      updated_by: req.user?.id || null,
      timestamp: new Date().toISOString()
    }]);

    await client.query(
      `UPDATE electricity_applications
       SET status = $1, remarks = $2, current_stage = $3,
           stage_history = stage_history || $4::jsonb,
           reviewed_at = NOW()
       WHERE id = $5`,
      [newStatus, remarks || null, stageLabel, stageEntry, applicationId]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Application updated successfully', data: { id: applicationId, status: newStatus } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update application error:', error);
    res.status(500).json({ success: false, error: 'Failed to update application', message: error.message });
  } finally {
    client.release();
  }
};

const uploadDocuments = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const supabase = require('../../config/supabase');
    const path = require('path');
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'electricity-documents';

    const appResult = await pool.query(
      'SELECT documents FROM electricity_applications WHERE id = $1',
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const existingDocuments = appResult.rows[0].documents || [];

    const newDocuments = await Promise.all(req.files.map(async (file) => {
      const filename = 'applications/' + applicationId + '/' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
      const { error } = await supabase.storage.from(bucket).upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) throw new Error('Storage upload failed: ' + error.message);
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
      return {
        name: file.originalname, type: file.mimetype, size: file.size,
        url: urlData.publicUrl, uploadedAt: new Date().toISOString(), uploadedBy: req.user?.id || 'admin'
      };
    }));

    const allDocuments = [...existingDocuments, ...newDocuments];

    await pool.query(
      'UPDATE electricity_applications SET documents = $1 WHERE id = $2',
      [JSON.stringify(allDocuments), applicationId]
    );

    res.json({ success: true, message: 'Documents uploaded successfully', data: { documents: allDocuments } });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAllApplications, updateApplication, uploadDocuments };
