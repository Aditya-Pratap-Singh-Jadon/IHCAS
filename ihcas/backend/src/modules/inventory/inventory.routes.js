const express = require('express');
const router = express.Router();
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const inventoryController = require('./inventory.controller');
const schema = require('./inventory.schema');

// Auth requirement for all inventory routes
router.use(requireAuth);

// --- Hostels ---
router.get('/hostels', inventoryController.getHostels);
router.post('/hostels', requireRole(['ADMIN']), validate(schema.createHostelSchema), inventoryController.createHostel);
router.put('/hostels/:id', requireRole(['ADMIN']), validate(schema.updateHostelSchema), inventoryController.updateHostel);

// --- Room Types ---
router.get('/room-types', inventoryController.getRoomTypes);
router.post('/room-types', requireRole(['ADMIN']), validate(schema.createRoomTypeSchema), inventoryController.createRoomType);

// --- Rooms ---
router.get('/rooms', inventoryController.getRooms);
router.post('/rooms', requireRole(['ADMIN']), validate(schema.createRoomSchema), inventoryController.createRoom);
router.put('/rooms/:id', requireRole(['ADMIN', 'WARDEN']), validate(schema.updateRoomSchema), inventoryController.updateRoom);

module.exports = router;
