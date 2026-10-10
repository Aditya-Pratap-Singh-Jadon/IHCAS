const express = require('express');
const router = express.Router();
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const counsellingController = require('./counselling.controller');
const schema = require('./counselling.schema');

router.use(requireAuth);

// Admin Routes
router.post('/sessions', requireRole(['ADMIN']), validate(schema.createSessionSchema), counsellingController.createSession);
router.post('/sessions/:id/generate-slots', requireRole(['ADMIN']), counsellingController.generateSlots);

// Student Routes
router.get('/status', requireRole(['STUDENT']), counsellingController.getStatus);
router.post('/activate', requireRole(['STUDENT']), counsellingController.activateSlot);

module.exports = router;
