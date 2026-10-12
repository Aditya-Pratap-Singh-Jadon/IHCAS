const express = require('express');
const router = express.Router();
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const notificationsController = require('./notifications.controller');
const schema = require('./notifications.schema');

router.use(requireAuth);

router.get('/', notificationsController.getNotifications);
router.put('/:id/read', notificationsController.markAsRead);
router.post('/announcements', requireRole(['ADMIN', 'WARDEN']), validate(schema.createAnnouncementSchema), notificationsController.createAnnouncement);

module.exports = router;
