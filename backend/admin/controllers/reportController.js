const { pool } = require('../../config/database');

const getPaymentReports = async (req, res) => {
  try {
    const { start_date, end_date, method } = req.query;
    let query = `SELECT DATE(payment_date) as date, payment_method, COUNT(*) as transaction_count, SUM(amount) as total_amount FROM electricity_payments WHERE payment_status = 'success'`;
    const params = [];
    let idx = 1;
    if (start_date) { query += ' AND DATE(payment_date) >= $' + idx++; params.push(start_date); }
    if (end_date) { query += ' AND DATE(payment_date) <= $' + idx++; params.push(end_date); }
    if (method) { query += ' AND payment_method = $' + idx++; params.push(method); }
    query += ' GROUP BY DATE(payment_date), payment_method ORDER BY date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get payment report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

const getApplicationReports = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT DATE(submitted_at) as date, status as application_status, COUNT(*) as count FROM electricity_applications WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (start_date) { query += ' AND DATE(submitted_at) >= $' + idx++; params.push(start_date); }
    if (end_date) { query += ' AND DATE(submitted_at) <= $' + idx++; params.push(end_date); }
    query += ' GROUP BY DATE(submitted_at), status ORDER BY date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get application report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

const getComplaintReports = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT DATE(submitted_at) as date, complaint_type, status, COUNT(*) as count FROM electricity_complaints WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (start_date) { query += ' AND DATE(submitted_at) >= $' + idx++; params.push(start_date); }
    if (end_date) { query += ' AND DATE(submitted_at) <= $' + idx++; params.push(end_date); }
    query += ' GROUP BY DATE(submitted_at), complaint_type, status ORDER BY date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get complaint report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

const getRevenueReports = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT DATE(payment_date) as date, COUNT(*) as transaction_count, SUM(amount) as total_amount FROM electricity_payments WHERE payment_status = 'success'`;
    const params = [];
    let idx = 1;
    if (start_date) { query += ' AND DATE(payment_date) >= $' + idx++; params.push(start_date); }
    if (end_date) { query += ' AND DATE(payment_date) <= $' + idx++; params.push(end_date); }
    query += ' GROUP BY DATE(payment_date) ORDER BY date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

module.exports = { getPaymentReports, getApplicationReports, getComplaintReports, getRevenueReports };
