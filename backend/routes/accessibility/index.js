/**
 * Accessibility API Routes
 * Handles UDID verification and accessibility-related endpoints
 */
const express = require('express');
const router = express.Router();

// Demo UDID data store
// In production, this would connect to the actual UDID database
const DEMO_UDID_DATA = {
  'BLIND12345': {
    full_name: 'Ramesh Kumar Sharma',
    father_name: 'Suresh Kumar Sharma',
    date_of_birth: '1990-05-15',
    gender: 'Male',
    age: 34,
    aadhaar_last4: '4523',
    aadhaar_number: 'XXXX-XXXX-4523',
    mobile: '9876543210',
    email: 'ramesh.sharma@example.com',
    address: {
      line1: 'Flat 12, Shanti Nagar',
      line2: 'Andheri East',
      ward: 'Ward 3',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400069'
    },
    disability_type: 'Visual Impairment',
    disability_percentage: 100,
    udid_number: 'BLIND12345',
    aadhaar_linked: true,
    service_type: 'Electricity New Connection',
    meter_type: 'Residential',
    previous_applications: []
  },
  'BLIND67890': {
    full_name: 'Sunita Devi',
    father_name: 'Ram Prasad',
    date_of_birth: '1985-08-20',
    gender: 'Female',
    age: 39,
    aadhaar_last4: '7890',
    aadhaar_number: 'XXXX-XXXX-7890',
    mobile: '8765432109',
    email: 'sunita.devi@example.com',
    address: {
      line1: 'House No. 23, Gandhi Nagar',
      line2: 'Civil Lines',
      ward: 'Ward 7',
      city: 'Nagpur',
      district: 'Nagpur',
      state: 'Maharashtra',
      pincode: '440001'
    },
    disability_type: 'Visual Impairment',
    disability_percentage: 80,
    udid_number: 'BLIND67890',
    aadhaar_linked: true,
    service_type: 'Water New Connection',
    meter_type: 'Residential',
    previous_applications: []
  },
  'BLIND11111': {
    full_name: 'Mohan Singh',
    father_name: 'Balwant Singh',
    date_of_birth: '1978-12-10',
    gender: 'Male',
    age: 46,
    aadhaar_last4: '1111',
    aadhaar_number: 'XXXX-XXXX-1111',
    mobile: '7654321098',
    email: 'mohan.singh@example.com',
    address: {
      line1: 'Plot 45, Industrial Area',
      line2: 'MIDC',
      ward: 'Ward 12',
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pincode: '411018'
    },
    disability_type: 'Visual Impairment',
    disability_percentage: 100,
    udid_number: 'BLIND11111',
    aadhaar_linked: true,
    service_type: 'Gas Connection',
    meter_type: 'Domestic',
    previous_applications: []
  }
};

/**
 * POST /api/accessibility/verify-udid
 * Verify UDID and return user data
 */
router.post('/verify-udid', async (req, res) => {
  try {
    const { udid } = req.body;

    if (!udid) {
      return res.status(400).json({
        success: false,
        error: 'UDID is required'
      });
    }

    const normalizedUdid = udid.toUpperCase().trim();

    // Check demo data
    const userData = DEMO_UDID_DATA[normalizedUdid];

    if (userData) {
      return res.json({
        success: true,
        data: userData,
        message: 'UDID verified successfully'
      });
    }

    // In production, this would query the actual UDID database
    // For now, return not found for unknown IDs
    return res.status(404).json({
      success: false,
      error: 'UDID not found. Please check your ID and try again.'
    });
  } catch (error) {
    console.error('UDID verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed. Please try again.'
    });
  }
});

/**
 * GET /api/accessibility/supported-services
 * Get list of supported accessibility features and departments
 */
router.get('/supported-services', (req, res) => {
  res.json({
    success: true,
    data: {
      departments: [
        {
          id: 'electricity',
          name: { en: 'Electricity', hi: 'बिजली', mr: 'वीज' },
          route: '/electricity'
        },
        {
          id: 'municipal',
          name: { en: 'Municipal', hi: 'नगरपालिका', mr: 'नगरपालिका' },
          route: '/municipal'
        },
        {
          id: 'water',
          name: { en: 'Water', hi: 'पानी', mr: 'पाणी' },
          route: '/water'
        },
        {
          id: 'gas',
          name: { en: 'Gas', hi: 'गैस', mr: 'गॅस' },
          route: '/gas'
        }
      ],
      features: [
        'voice_navigation',
        'text_to_speech',
        'udid_autofill',
        'voice_form_filling',
        'multilingual_support'
      ],
      languages: [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'mr', name: 'Marathi' }
      ]
    }
  });
});

/**
 * GET /api/accessibility/demo-ids
 * Get list of demo UDID numbers for testing (development only)
 */
router.get('/demo-ids', (req, res) => {
  // Only expose in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }

  const demoIds = Object.keys(DEMO_UDID_DATA).map(id => ({
    udid: id,
    name: DEMO_UDID_DATA[id].full_name,
    disability: DEMO_UDID_DATA[id].disability_type
  }));

  res.json({
    success: true,
    data: demoIds,
    message: 'Demo IDs for testing accessibility features'
  });
});

/**
 * POST /api/accessibility/log-usage
 * Log accessibility feature usage for analytics (optional)
 */
router.post('/log-usage', (req, res) => {
  const { feature, action, department, success, errorMessage } = req.body;

  // In production, this would log to analytics database
  console.log('[Accessibility Usage]', {
    timestamp: new Date().toISOString(),
    feature,
    action,
    department,
    success,
    errorMessage
  });

  res.json({
    success: true,
    message: 'Usage logged'
  });
});

/**
 * GET /api/accessibility/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    features: {
      tts: true,
      stt: true,
      udid_verification: true
    }
  });
});

module.exports = router;
