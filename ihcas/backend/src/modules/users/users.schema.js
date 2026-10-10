const { z } = require('zod');

const updateProfileSchema = {
  body: z.object({
    phone: z.string().optional()
  })
};

module.exports = {
  updateProfileSchema
};
