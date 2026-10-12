const { z } = require('zod');

// Leave Request
const createLeaveSchema = z.object({
  body: z.object({
    start_date: z.string().date('Invalid start date (YYYY-MM-DD)'),
    end_date: z.string().date('Invalid end date (YYYY-MM-DD)'),
    reason: z.string().min(5, 'Reason must be at least 5 characters')
  })
});

const reviewRequestSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED'])
  })
});

const reviewRoomChangeSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    new_room_id: z.number().optional() // Required if APPROVED
  })
}).refine(data => {
  if (data.body.status === 'APPROVED' && !data.body.new_room_id) {
    return false;
  }
  return true;
}, {
  message: "new_room_id is required when approving a room change",
  path: ["body", "new_room_id"]
});

// Room Change Request
const createRoomChangeSchema = z.object({
  body: z.object({
    requested_room_type: z.string().min(1, 'Requested room type is required'),
    reason: z.string().min(5, 'Reason must be at least 5 characters')
  })
});

// Mess Change Request
const createMessChangeSchema = z.object({
  body: z.object({
    requested_mess: z.string().min(1, 'Requested mess is required'),
    reason: z.string().min(5, 'Reason must be at least 5 characters')
  })
});

// Complaint
const createComplaintSchema = z.object({
  body: z.object({
    category: z.string().min(1, 'Category is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('LOW')
  })
});

module.exports = {
  createLeaveSchema,
  reviewRequestSchema,
  reviewRoomChangeSchema,
  createRoomChangeSchema,
  createMessChangeSchema,
  createComplaintSchema
};
