const express = require('express');
const router = express.Router();
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const usersController = require('./users.controller');
const { updateProfileSchema } = require('./users.schema');

// Profile routes (accessible by any authenticated user)
router.get('/me', requireAuth, usersController.getProfile);
router.put('/me', requireAuth, validate(updateProfileSchema), usersController.updateProfile);

// Admin only routes
router.get('/:id', requireAuth, requireRole(['ADMIN']), usersController.getUserById);

module.exports = router;
