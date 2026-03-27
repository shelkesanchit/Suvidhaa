const express = require('express');
const router  = express.Router();

// Municipal Department Routes
router.use('/auth',         require('./auth'));
router.use('/otp',          require('./otp'));
router.use('/applications', require('./applications'));
router.use('/complaints',   require('./complaints'));
router.use('/consumers',    require('./consumers'));
router.use('/bills',        require('./bills'));
router.use('/payments',     require('./payments'));
router.use('/settings',     require('./settings'));
router.use('/admin',        require('./admin'));

module.exports = router;
