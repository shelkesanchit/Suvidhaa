const { pool } = require('../../config/database');

const getAllComplaints = async (req, res) => {
  try {
    const { status: filterStatus, priority, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT c.*, ca.consumer_number, u.full_name, u.email, u.phone
      FROM electricity_complaints c
      LEFT JOIN electricity_consumer_accounts ca ON c.consumer_account_id = ca.id
      LEFT JOIN electricity_users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (filterStatus) { query += ' AND c.status = $' + idx++; params.push(filterStatus); }
    if (priority) { query += ' AND c.priority = $' + idx++; params.push(priority); }

    query += ' ORDER BY c.submitted_at DESC LIMIT $' + idx++ + ' OFFSET $' + idx++;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

const updateComplaint = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { status: newStatus, resolution_notes, assigned_to } = req.body;
    const complaintId = req.params.id;

    const existing = await client.query('SELECT id FROM electricity_complaints WHERE id = $1', [complaintId]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Complaint not found' });
    }

    await client.query(
      `UPDATE electricity_complaints
       SET status = $1, resolution_notes = $2, assigned_to = $3,
           resolved_at = CASE WHEN $4 IN ('resolved', 'closed') THEN NOW() ELSE resolved_at END
       WHERE id = $5`,
      [newStatus, resolution_notes || null, assigned_to || null, newStatus, complaintId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update complaint error:', error.message);
    res.status(500).json({ error: 'Failed to update complaint', details: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getAllComplaints, updateComplaint };
