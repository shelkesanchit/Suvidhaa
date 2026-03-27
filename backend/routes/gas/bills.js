const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// =====================================================
// GAS BILLS ROUTES
// NOTE: No gas_bills table. Gas billing is LPG cylinder-based.
// Works with gas_cylinder_bookings + gas_tariff_rates.
// =====================================================

// Fetch pending charges / outstanding bookings for a customer
router.get('/fetch/:consumerId', async (req, res) => {
  try {
    const { consumerId } = req.params;

    const customerResult = await pool.query(
      'SELECT * FROM gas_consumers WHERE consumer_number = $1',
      [consumerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    const bookingResult = await pool.query(
      `SELECT * FROM gas_cylinder_bookings
       WHERE customer_id = $1 AND payment_status != 'paid'
       ORDER BY booking_date DESC LIMIT 1`,
      [customer.id]
    );

    const tariffResult = await pool.query(
      `SELECT * FROM gas_tariff_rates
       WHERE state = $1 AND city = $2 AND cylinder_type = $3
       ORDER BY effective_from DESC LIMIT 1`,
      [customer.state, customer.city, customer.cylinder_type || '14kg']
    );

    let billData;
    if (bookingResult.rows.length > 0) {
      const booking = bookingResult.rows[0];
      billData = {
        booking_number: booking.booking_number,
        consumer_id: customer.consumer_number,
        customer_name: customer.full_name,
        address: customer.address,
        cylinder_type: booking.cylinder_type,
        quantity: booking.quantity,
        booking_date: booking.booking_date,
        delivery_date: booking.delivery_date,
        total_amount: booking.total_amount,
        payment_status: booking.payment_status,
        status: 'Unpaid'
      };
    } else {
      const tariff = tariffResult.rows.length > 0 ? tariffResult.rows[0] : null;
      billData = {
        consumer_id: customer.consumer_number,
        customer_name: customer.full_name,
        address: customer.address,
        cylinder_type: customer.cylinder_type || '14kg',
        price_per_cylinder: tariff ? tariff.price_per_cylinder : 0,
        subsidy_amount: tariff ? tariff.subsidy_amount : 0,
        message: 'No pending bookings found',
        status: 'No dues'
      };
    }

    res.json({
      success: true,
      data: {
        customer: {
          consumer_id: customer.consumer_number,
          full_name: customer.full_name,
          address: customer.address,
          lpg_consumer_id: customer.lpg_consumer_id,
          cylinder_type: customer.cylinder_type,
          connection_type: customer.connection_type,
          connection_status: customer.connection_status
        },
        bill: billData
      }
    });

  } catch (error) {
    console.error('Fetch gas bill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get billing/payment history
router.get('/history/:consumerId', async (req, res) => {
  try {
    const { consumerId } = req.params;

    const customerResult = await pool.query(
      'SELECT id FROM gas_consumers WHERE consumer_number = $1',
      [consumerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const result = await pool.query(
      `SELECT gp.transaction_id, gp.amount, gp.subsidy_amount, gp.payment_method,
              gp.payment_status, gp.receipt_number, gp.payment_date,
              cb.booking_number, cb.cylinder_type, cb.quantity
       FROM gas_payments gp
       LEFT JOIN gas_cylinder_bookings cb ON gp.booking_id = cb.id
       WHERE gp.customer_id = $1
       ORDER BY gp.payment_date DESC LIMIT 12`,
      [customerResult.rows[0].id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get bill history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate cylinder price
router.post('/calculate', async (req, res) => {
  try {
    const { consumer_id, cylinder_type, quantity } = req.body;

    const customerResult = await pool.query(
      'SELECT * FROM gas_consumers WHERE consumer_number = $1',
      [consumer_id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customer = customerResult.rows[0];
    const cylType = cylinder_type || customer.cylinder_type || '14kg';
    const qty = quantity || 1;

    let tariffResult = await pool.query(
      `SELECT * FROM gas_tariff_rates
       WHERE state = $1 AND city = $2 AND cylinder_type = $3
       ORDER BY effective_from DESC LIMIT 1`,
      [customer.state, customer.city, cylType]
    );

    if (tariffResult.rows.length === 0) {
      tariffResult = await pool.query(
        `SELECT * FROM gas_tariff_rates
         WHERE cylinder_type = $1
         ORDER BY effective_from DESC LIMIT 1`,
        [cylType]
      );

      if (tariffResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Tariff rate not found for this cylinder type' });
      }
    }

    const tariff = tariffResult.rows[0];
    const pricePerCylinder = parseFloat(tariff.price_per_cylinder);
    const subsidyAmount = parseFloat(tariff.subsidy_amount || 0);
    const basePrice = parseFloat(tariff.base_price || pricePerCylinder);

    const isSubsidyEligible = customer.connection_type === 'pmuy' || customer.connection_type === 'domestic';
    const effectiveSubsidy = isSubsidyEligible ? subsidyAmount : 0;

    const totalAmount = (pricePerCylinder - effectiveSubsidy) * qty;

    res.json({
      success: true,
      data: {
        consumer_id: consumer_id,
        cylinder_type: cylType,
        quantity: qty,
        base_price: basePrice,
        price_per_cylinder: pricePerCylinder,
        subsidy_amount: effectiveSubsidy,
        effective_price: pricePerCylinder - effectiveSubsidy,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        supplier: tariff.supplier
      }
    });

  } catch (error) {
    console.error('Calculate bill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
