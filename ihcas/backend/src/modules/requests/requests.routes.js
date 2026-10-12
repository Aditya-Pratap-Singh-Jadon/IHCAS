const express = require('express');
const router = express.Router();
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const requestsController = require('./requests.controller');
const schema = require('./requests.schema');

router.use(requireAuth);

// --- Leave Requests ---
router.get('/leave', requestsController.getLeaveRequests);
router.post('/leave', requireRole(['STUDENT']), validate(schema.createLeaveSchema), requestsController.createLeaveRequest);
router.put('/leave/:id/review', requireRole(['ADMIN', 'WARDEN']), validate(schema.reviewRequestSchema), requestsController.reviewLeaveRequest);

// --- Room Change Requests ---
router.get('/room-change', requestsController.getRoomChangeRequests);
router.post('/room-change', requireRole(['STUDENT']), validate(schema.createRoomChangeSchema), requestsController.createRoomChangeRequest);
router.put('/room-change/:id/review', requireRole(['ADMIN', 'WARDEN']), validate(schema.reviewRoomChangeSchema), requestsController.reviewRoomChangeRequest);

// --- Mess Change Requests ---
router.get('/mess-change', requestsController.getMessChangeRequests);
router.post('/mess-change', requireRole(['STUDENT']), validate(schema.createMessChangeSchema), requestsController.createMessChangeRequest);
router.put('/mess-change/:id/review', requireRole(['ADMIN', 'WARDEN']), validate(schema.reviewRequestSchema), requestsController.reviewMessChangeRequest);

// --- Complaints ---
router.get('/complaints', requestsController.getComplaints);
router.post('/complaints', requireRole(['STUDENT']), validate(schema.createComplaintSchema), requestsController.createComplaint);
router.put('/complaints/:id/review', requireRole(['ADMIN', 'WARDEN']), validate(schema.reviewRequestSchema), requestsController.reviewComplaint);

module.exports = router;
