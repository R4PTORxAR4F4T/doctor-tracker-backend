const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', uptime: process.uptime() }));

router.use('/auth', require('./auth.routes'));

// Everything below requires a valid token AND the admin role.
router.use(protect, authorize('admin'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/doctors', require('./doctor.routes'));
router.use('/patients', require('./patient.routes'));

module.exports = router;
