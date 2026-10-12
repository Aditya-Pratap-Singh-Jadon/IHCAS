const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmailOTP = async (email, otpCode) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    // Mock delivery mode
    console.log(`[MOCK OTP DELIVERY] Sent OTP ${otpCode} to ${email}`);
    return { success: true, method: 'mock' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"IHCAS Counselling" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Roommate Verification Code',
      text: `Your roommate verification code is: ${otpCode}. It will expire in 10 minutes.`,
      html: `<b>Your roommate verification code is: ${otpCode}</b><br/>It will expire in 10 minutes.`
    });
    return { success: true, method: 'email', info };
  } catch (error) {
    console.error('Email OTP delivery failed:', error);
    return { success: false, method: 'email', error };
  }
};

module.exports = { sendEmailOTP };
