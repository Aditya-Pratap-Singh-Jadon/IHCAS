const { z } = require('zod');

const createSessionSchema = {
  body: z.object({
    academic_year: z.string().min(1, "Academic year is required"),
    start_date: z.string().datetime(), // ISO string
    end_date: z.string().datetime(),
    slot_duration_minutes: z.number().int().positive().default(3),
    status: z.enum(['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED']).default('PLANNED')
  })
};

module.exports = {
  createSessionSchema
};
