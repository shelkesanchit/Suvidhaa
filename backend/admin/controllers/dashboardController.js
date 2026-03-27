const { pool } = require('../../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM electricity_applications WHERE status = 'submitted') as pending_applications,
        (SELECT COUNT(*) FROM electricity_applications WHERE status IN ('submitted','document_verification','site_inspection','approval_pending','work_in_progress')) as all_pending,
        (SELECT COUNT(*) FROM electricity_applications WHERE status = 'approved') as approved_applications,
        (SELECT COUNT(*) FROM electricity_complaints WHERE status IN ('open', 'assigned')) as open_complaints,
        (SELECT COUNT(*) FROM electricity_complaints WHERE status IN ('resolved','closed')) as resolved_complaints,
        (SELECT COUNT(*) FROM electricity_consumer_accounts WHERE connection_status = 'active') as active_connections,
        (SELECT COUNT(*) FROM electricity_users WHERE is_active = true) as total_customers,
        COALESCE((SELECT SUM(amount) FROM electricity_payments WHERE payment_status = 'success' AND DATE(payment_date) = CURRENT_DATE), 0) as today_revenue,
        COALESCE((SELECT SUM(amount) FROM electricity_payments WHERE payment_status = 'success' AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)), 0) as month_revenue
    `);

    res.json({
      success: true,
      data: result.rows[0] || {
        pending_applications: 0, all_pending: 0, approved_applications: 0,
        open_complaints: 0, resolved_complaints: 0, active_connections: 0,
        total_customers: 0, today_revenue: 0, month_revenue: 0
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics', message: error.message });
  }
};

module.exports = { getDashboardStats };
