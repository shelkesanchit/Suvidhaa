const { pool } = require('../../config/database');

const getConsumerAccounts = async (req, res) => {
  try {
    const { status, category, consumer_number, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT ca.id, ca.consumer_number, ca.category, ca.tariff_type, ca.sanctioned_load,
             ca.meter_number, ca.connection_status, ca.address_line1, ca.address_line2,
             ca.city, ca.state, ca.pincode, ca.created_at,
             u.full_name, u.email, u.phone,
             (SELECT COALESCE(SUM(b.total_amount), 0) FROM electricity_bills b
              WHERE b.consumer_account_id = ca.id AND b.status != 'paid') AS total_dues
      FROM electricity_consumer_accounts ca
      LEFT JOIN electricity_users u ON ca.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { query += ' AND ca.connection_status = $' + idx++; params.push(status); }
    if (category) { query += ' AND ca.category = $' + idx++; params.push(category); }
    if (consumer_number) { query += ' AND ca.consumer_number = $' + idx++; params.push(consumer_number); }

    query += ' ORDER BY ca.created_at DESC LIMIT $' + idx++ + ' OFFSET $' + idx++;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get consumers error:', error);
    res.status(500).json({ error: 'Failed to fetch consumers' });
  }
};

module.exports = { getConsumerAccounts };
