const express = require('express');
const router = express.Router();

// Import electricity routes
const authRoutes = require('./auth');
const applicationRoutes = require('./applications');
const billRoutes = require('./bills');
const paymentRoutes = require('./payments');
const complaintRoutes = require('./complaints');
const consumerRoutes = require('./consumer');
const settingsRoutes = require('./settings');
const otpRoutes = require('./otp');
const mobileUploadRoutes = require('./mobileUpload');

// Mount routes
router.use('/auth', authRoutes);
router.use('/applications', applicationRoutes);
router.use('/bills', billRoutes);
router.use('/payments', paymentRoutes);
router.use('/complaints', complaintRoutes);
router.use('/consumer', consumerRoutes);
router.use('/settings', settingsRoutes);
router.use('/otp', otpRoutes);
router.use('/mobile-upload', mobileUploadRoutes);


module.exports = router;
