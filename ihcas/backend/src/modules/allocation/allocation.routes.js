const express = require('express');
const router = express.Router();
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { allocateRoomSchema, requestOtpSchema, verifyOtpSchema } = require('./allocation.schema');
const allocationController = require('./allocation.controller');

// All endpoints require STUDENT role
router.use(requireAuth);
router.use(requireRole('STUDENT'));

router.post('/roommate-otp/request', validate(requestOtpSchema), allocationController.requestOtp);
router.post('/roommate-otp/verify', validate(verifyOtpSchema), allocationController.verifyOtp);
router.post('/', validate(allocateRoomSchema), allocationController.allocateRoom);

module.exports = router;
