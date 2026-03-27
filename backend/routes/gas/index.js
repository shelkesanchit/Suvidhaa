const express = require('express');
const router = express.Router();

// Gas Routes
router.use('/otp', require('./otp'));
router.use('/applications', require('./applications'));
router.use('/complaints', require('./complaints'));
router.use('/bills', require('./bills'));
router.use('/payments', require('./payments'));
router.use('/admin/payments', require('./adminPayments'));
router.use('/admin', require('./admin'));

module.exports = router;
