const { z } = require('zod');

const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title is required'),
    message: z.string().min(5, 'Message is required')
  })
});

module.exports = {
  createAnnouncementSchema
};
