const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyToken, isAdminOrStaff, isAdmin } = require('../../middleware/auth');
const dashboardController = require('../controllers/dashboardController');
const applicationController = require('../controllers/applicationController');
const complaintController = require('../controllers/complaintController');
const userController = require('../controllers/userController');
const consumerController = require('../controllers/consumerController');
const reportController = require('../controllers/reportController');
const meterReadingController = require('../controllers/meterReadingController');
const multer = require('multer');
const path = require('path');

// Use memory storage — files are uploaded to Supabase Storage in applicationController
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDF, and document files are allowed'));
    }
  }
});

// Dashboard Routes
router.get('/dashboard/stats', verifyToken, isAdminOrStaff, dashboardController.getDashboardStats);

// Application Routes
router.get('/applications', verifyToken, isAdminOrStaff, applicationController.getAllApplications);
router.put('/applications/:id', 
  verifyToken, 
  isAdminOrStaff, 
  [
    body('status').isIn([
      'submitted', 'document_verification', 'site_inspection', 
      'approval_pending', 'approved', 'rejected', 'work_in_progress', 'completed'
    ]),
    body('remarks').optional(),
    body('current_stage').optional()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  applicationController.updateApplication
);

// Document Upload Route for Applications
router.post('/applications/:id/documents', 
  verifyToken, 
  isAdminOrStaff, 
  upload.array('documents', 10),
  applicationController.uploadDocuments
);

// Complaint Routes
router.get('/complaints', verifyToken, isAdminOrStaff, complaintController.getAllComplaints);
router.put('/complaints/:id', 
  verifyToken, 
  isAdminOrStaff, 
  [
    body('status').optional().isIn(['open', 'assigned', 'in_progress', 'resolved', 'closed']),
    body('resolution_notes').optional()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  complaintController.updateComplaint
);

// User Management Routes
router.get('/users', verifyToken, isAdmin, userController.getAllUsers);
router.post('/users/staff', 
  verifyToken, 
  isAdmin, 
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('full_name').trim().notEmpty(),
    body('phone').matches(/^[0-9]{10}$/)
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  userController.createStaffUser
);
router.patch('/users/:id/toggle-status', verifyToken, isAdmin, userController.toggleUserStatus);

// Consumer Routes
router.get('/consumers', verifyToken, isAdminOrStaff, consumerController.getConsumerAccounts);

// Payment Collection Routes (admin counter payments, Razorpay ₹1 demo)
router.use('/payments', require('./payments'));

// Report Routes
router.get('/reports/payments', verifyToken, isAdminOrStaff, reportController.getPaymentReports);

// Meter Reading Routes
router.get('/meter-readings/customers', verifyToken, isAdminOrStaff, meterReadingController.getAllCustomers);
router.post('/meter-readings/submit', verifyToken, isAdminOrStaff, meterReadingController.submitMeterReading);
router.post('/meter-readings/bulk', verifyToken, isAdminOrStaff, meterReadingController.submitBulkMeterReadings);
router.get('/meter-readings/history/:customerId', verifyToken, isAdminOrStaff, meterReadingController.getMeterReadingHistory);

module.exports = router;
