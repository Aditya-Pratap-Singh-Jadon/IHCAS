const { z } = require('zod');

const createHostelSchema = {
  body: z.object({
    name: z.string().min(1, "Name is required"),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    location: z.string().optional(),
    hostel_type: z.string().optional(),
    total_capacity: z.number().int().positive(),
    warden_id: z.number().int().optional().nullable()
  })
};

const updateHostelSchema = {
  body: z.object({
    name: z.string().min(1).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    location: z.string().optional(),
    hostel_type: z.string().optional(),
    total_capacity: z.number().int().positive().optional(),
    warden_id: z.number().int().optional().nullable()
  })
};

const createRoomTypeSchema = {
  body: z.object({
    type_name: z.string().min(1),
    capacity: z.number().int().positive(),
    has_ac: z.boolean().default(false),
    description: z.string().optional()
  })
};

const createRoomSchema = {
  body: z.object({
    hostel_id: z.number().int().positive(),
    room_number: z.string().min(1),
    floor: z.number().int(),
    room_type_id: z.number().int().positive(),
    capacity: z.number().int().positive(),
    status: z.enum(['AVAILABLE', 'PARTIALLY_FILLED', 'FULL', 'MAINTENANCE']).default('AVAILABLE')
  })
};

const updateRoomSchema = {
  body: z.object({
    room_number: z.string().min(1).optional(),
    floor: z.number().int().optional(),
    room_type_id: z.number().int().positive().optional(),
    capacity: z.number().int().positive().optional(),
    status: z.enum(['AVAILABLE', 'PARTIALLY_FILLED', 'FULL', 'MAINTENANCE']).optional()
  })
};

module.exports = {
  createHostelSchema,
  updateHostelSchema,
  createRoomTypeSchema,
  createRoomSchema,
  updateRoomSchema
};
