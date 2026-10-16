const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const dashboardController = require('./dashboard.controller');

router.use(requireAuth);

router.get('/student', requireRole(['STUDENT']), dashboardController.getStudentDashboard);
router.get('/warden', requireRole(['WARDEN']), dashboardController.getWardenDashboard);
router.get('/admin/analytics', requireRole(['ADMIN']), dashboardController.getAdminAnalytics);
router.get('/admin', requireRole(['ADMIN']), dashboardController.getAdminDashboard);

module.exports = router;
