const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const supabase = require('../../config/supabase');

const BUCKET = process.env.GAS_STORAGE_BUCKET || 'gas-documents';

async function ensureBucket() {
  try {
    const { data: list } = await supabase.storage.listBuckets();
    if (list && !list.some(b => b.name === BUCKET)) {
      const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
      if (error && !error.message.includes('already exists')) {
        console.warn('Gas bucket auto-create warning:', error.message);
      }
    }
  } catch (e) {
    console.warn('ensureBucket warning:', e.message);
  }
}

async function uploadDocuments(applicationId, documents) {
  if (!documents || documents.length === 0) return [];
  await ensureBucket();
  const processed = [];
  for (const doc of documents) {
    try {
      if (doc.data) {
        const buffer = Buffer.from(doc.data, 'base64');
        const ext = (doc.name || 'file').split('.').pop().toLowerCase() || 'bin';
        const filename = `applications/${applicationId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(filename, buffer, { contentType: doc.type || 'application/octet-stream', upsert: false });
        if (error) throw new Error(error.message);
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        processed.push({ name: doc.name, type: doc.type, size: doc.size, documentType: doc.documentType || '', url: urlData.publicUrl, uploadedAt: new Date().toISOString() });
      } else if (doc.url) {
        processed.push({ name: doc.name, type: doc.type, size: doc.size, documentType: doc.documentType || '', url: doc.url, uploadedAt: doc.uploadedAt || new Date().toISOString() });
      }
    } catch (err) {
      console.error('Gas document upload failed for', doc.name, ':', err.message);
    }
  }
  return processed;
}

// =====================================================
// GAS APPLICATIONS ROUTES
// =====================================================

// Submit new gas application
router.post('/submit', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { application_type, application_data, documents = [], additional_info = {} } = req.body;

    if (!application_type || !application_data) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'application_type and application_data are required' });
    }

    if (!application_data.mobile || !application_data.applicant_name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'applicant_name and mobile are required' });
    }

    if (!/^\d{10}$/.test(String(application_data.mobile))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'mobile must be 10 digits' });
    }

    if (application_data.pincode && !/^\d{6}$/.test(String(application_data.pincode))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'pincode must be 6 digits' });
    }

    const year = new Date().getFullYear();
    const typePrefix = {
      'new_connection': 'GNC',
      'reconnection': 'GRC',
      'disconnection': 'GDC',
      'transfer': 'GTR',
      'cylinder_booking': 'GCB',
      'conversion': 'GCV'
    }[application_type] || 'GAPP';

    // Determine connection_type: 'PNG' or 'LPG'
    const connectionType = (application_data.gas_type === 'png' ||
                            application_data.connection_type?.toLowerCase().includes('png'))
                            ? 'PNG' : 'LPG';

    const applicantName = application_data.full_name || application_data.applicant_name || 'Unknown';
    const applicantPhone = application_data.mobile || application_data.contact_number || application_data.phone || '';
    const applicantEmail = application_data.email || null;

    const applicationPayload = { ...application_data, additional_info };

    // Insert with placeholder number first to get the ID
    const insertResult = await client.query(
      `INSERT INTO gas_applications
       (application_number, application_type, connection_type, status,
        applicant_name, applicant_phone, applicant_email,
        application_data, documents)
       VALUES ('PENDING', $1, $2, 'pending', $3, $4, $5, $6, $7) RETURNING id`,
      [
        application_type,
        connectionType,
        applicantName,
        applicantPhone,
        applicantEmail,
        JSON.stringify(applicationPayload),
        JSON.stringify([])
      ]
    );

    const applicationId = insertResult.rows[0].id;
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM gas_applications WHERE EXTRACT(YEAR FROM submission_date) = $1`,
      [year]
    );
    const applicationNumber = `${typePrefix}${year}${String(applicationId).padStart(6, '0')}`;

    await client.query(
      'UPDATE gas_applications SET application_number = $1 WHERE id = $2',
      [applicationNumber, applicationId]
    );

    // Upload documents to Supabase Storage
    const processedDocs = await uploadDocuments(applicationId, Array.isArray(documents) ? documents : []);
    if (processedDocs.length > 0) {
      await client.query(
        'UPDATE gas_applications SET documents = $1 WHERE id = $2',
        [JSON.stringify(processedDocs), applicationId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Gas connection application submitted successfully',
      data: {
        application_number: applicationNumber,
        application_id: applicationId
      }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Submit gas application error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (client) client.release();
  }
});

// Track application status
router.get('/track/:applicationNumber', async (req, res) => {
  try {
    const { applicationNumber } = req.params;
    const { mobile, email } = req.query;

    const result = await pool.query(
      `SELECT a.application_number, a.applicant_name as full_name, a.applicant_phone as mobile,
              a.applicant_email as email, a.application_data, a.connection_type,
              a.status as application_status, a.submission_date as created_at,
              c.id as consumer_id, c.connection_status
       FROM gas_applications a
       LEFT JOIN gas_consumers c ON c.full_name = a.applicant_name AND c.phone = a.applicant_phone
       WHERE a.application_number = $1`,
      [applicationNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = result.rows[0];

    if (mobile && String(app.mobile || '') !== String(mobile)) {
      return res.status(403).json({ success: false, message: 'Mobile verification failed for this application' });
    }

    if (email && String(app.email || '').toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Email verification failed for this application' });
    }

    res.json({ success: true, data: app });

  } catch (error) {
    console.error('Track application error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's applications by mobile
router.get('/my-applications/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;

    const result = await pool.query(
      `SELECT id, application_number, connection_type, status as application_status,
              submission_date as created_at
       FROM gas_applications
       WHERE applicant_phone = $1
       ORDER BY submission_date DESC`,
      [mobile]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lookup consumer by mobile number for cylinder booking
router.get('/consumer-by-mobile/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;

    const result = await pool.query(
      `SELECT id, consumer_number, full_name, phone as mobile,
              CONCAT(address_line1, ', ', city) as address,
              connection_status, connection_type
       FROM gas_consumers
       WHERE phone = $1 AND connection_status = 'active'`,
      [mobile]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active consumer found with this mobile number' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Consumer lookup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Book LPG cylinder
router.post('/cylinder-booking', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { consumer_number, mobile, cylinder_type, quantity = 1, delivery_preference = 'home_delivery' } = req.body;

    if (!consumer_number || !mobile) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'consumer_number and mobile are required' });
    }

    if (!/^\d{10}$/.test(String(mobile))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'mobile must be 10 digits' });
    }

    const allowedCylinderTypes = new Set(['domestic_14.2kg', 'domestic_5kg', 'commercial_19kg', 'commercial_47.5kg']);
    const allowedDeliveryTypes = new Set(['home_delivery', 'self_pickup']);

    if (cylinder_type && !allowedCylinderTypes.has(cylinder_type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid cylinder type' });
    }

    if (!allowedDeliveryTypes.has(delivery_preference)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid delivery preference' });
    }

    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'quantity must be between 1 and 2' });
    }

    const consumerResult = await client.query(
      `SELECT id, connection_type
       FROM gas_consumers
       WHERE consumer_number = $1 AND phone = $2 AND connection_status = 'active'`,
      [consumer_number, mobile]
    );

    if (consumerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Active consumer not found for given consumer number and mobile' });
    }

    const consumer = consumerResult.rows[0];

    const actualCylinderType = cylinder_type ||
      (consumer.connection_type === 'commercial' ? 'commercial_19kg' : 'domestic_14.2kg');

    const year = new Date().getFullYear();
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM gas_cylinder_bookings WHERE EXTRACT(YEAR FROM booked_at) = $1`,
      [year]
    );
    const bookingNumber = `GCB${year}${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

    const cylinderPrices = {
      'domestic_14.2kg': 850,
      'domestic_5kg': 450,
      'commercial_19kg': 2100,
      'commercial_47.5kg': 5200
    };
    const pricePerUnit = cylinderPrices[actualCylinderType] || 850;
    const totalAmount = pricePerUnit * parsedQuantity;

    const cylBookingMap = {
      'domestic_14.2kg': '14kg', 'domestic_5kg': '14kg',
      'commercial_19kg': '19kg', 'commercial_47.5kg': 'commercial',
      '14kg': '14kg', '19kg': '19kg', 'commercial': 'commercial'
    };

    const result = await client.query(
      `INSERT INTO gas_cylinder_bookings
       (booking_number, customer_id, cylinder_type, quantity, total_amount, delivery_type, booking_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'placed') RETURNING id`,
      [
        bookingNumber,
        consumer.id,
        cylBookingMap[actualCylinderType] || '14kg',
        parsedQuantity,
        totalAmount,
        delivery_preference
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Cylinder booked successfully',
      data: {
        booking_number: bookingNumber,
        booking_id: result.rows[0].id,
        estimated_delivery: '2-3 business days',
        amount: totalAmount
      }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Cylinder booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (client) client.release();
  }
});

// =====================================================
// DOCUMENT UPLOAD ROUTES (Supabase Storage)
// =====================================================

// Upload documents for gas application (base64 JSON body)
router.post('/upload-documents', async (req, res) => {
  try {
    const { application_number, documents } = req.body;

    if (!application_number) {
      return res.status(400).json({ success: false, message: 'application_number is required' });
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ success: false, message: 'documents array is required' });
    }

    const appResult = await pool.query(
      'SELECT id, documents FROM gas_applications WHERE application_number = $1',
      [application_number]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const applicationId = appResult.rows[0].id;
    let existingDocs = [];
    try {
      const raw = appResult.rows[0].documents;
      existingDocs = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    } catch { existingDocs = []; }

    const newDocs = await uploadDocuments(applicationId, documents);
    const allDocs = [...existingDocs, ...newDocs];

    await pool.query(
      'UPDATE gas_applications SET documents = $1 WHERE application_number = $2',
      [JSON.stringify(allDocs), application_number]
    );

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      data: { documents: newDocs }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get documents for an application
router.get('/documents/:application_number', async (req, res) => {
  try {
    const { application_number } = req.params;

    const result = await pool.query(
      'SELECT documents FROM gas_applications WHERE application_number = $1',
      [application_number]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    let documents = [];
    try {
      const raw = result.rows[0].documents;
      documents = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    } catch { documents = []; }

    res.json({ success: true, data: documents });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
