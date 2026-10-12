const { z } = require('zod');

const allocateRoomSchema = {
  body: z.object({
    room_id: z.number().int().positive("Valid room ID is required"),
    roommates: z.array(z.string()).max(3, "Maximum 3 roommates allowed").optional()
  })
};

const requestOtpSchema = {
  body: z.object({
    roommate_reg_no: z.string().min(1, "Roommate registration number is required")
  })
};

const verifyOtpSchema = {
  body: z.object({
    roommate_reg_no: z.string().min(1, "Roommate registration number is required"),
    otp_code: z.string().length(6, "OTP must be 6 digits")
  })
};

module.exports = {
  allocateRoomSchema,
  requestOtpSchema,
  verifyOtpSchema
};
