const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const validateDomainPolicy = (email, role) => {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split('@')[1];
  
  if (role === 'STUDENT') {
    return domain === 'vitstudent.ac.in';
  } else if (role === 'ADMIN' || role === 'WARDEN') {
    return domain === 'vit.ac.in';
  }
  return false;
};

const getOAuthClient = () => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM USER WHERE email = ?', [email]);
    if (users.length === 0) {
      // Generic error so we don't leak account existence
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    const user = users[0];
    if (!user.is_active) {
      const err = new Error('Account is disabled');
      err.statusCode = 403;
      return next(err);
    }

    if (!validateDomainPolicy(user.email, user.role)) {
      const err = new Error('Only authorized VIT email IDs are allowed. Students must use @vitstudent.ac.in, while administrators and wardens must use @vit.ac.in.');
      err.statusCode = 403;
      return next(err);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production';
    // Expire token according to environment or default 24h
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const payload = {
      user_id: user.user_id,
      role: user.role,
      email: user.email
    };
    
    const token = jwt.sign(payload, secret, { expiresIn });

    // Set cookie
    // In production, we'd use secure: true and sameSite: 'strict'
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const logout = (req, res, next) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
};

// Also an endpoint to get current auth status based on token
const me = (req, res, next) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
};

const googleLogin = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    return res.status(501).json({ error: { message: 'Google OAuth is not configured on the server.' } });
  }
  
  const client = getOAuthClient();
  const authorizeUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    prompt: 'consent'
  });
  
  res.redirect(authorizeUrl);
};

const googleCallback = async (req, res, next) => {
  const { code } = req.query;
  
  if (!code) {
    const err = new Error('Authorization code missing');
    err.statusCode = 400;
    return next(err);
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // If running in mocked test environment, we might bypass the external Google API call.
    // In real flow, we verify the ID token.
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    if (!payload.email_verified) {
      const err = new Error('Email must be verified by Google');
      err.statusCode = 403;
      return next(err);
    }
    
    const email = payload.email.trim().toLowerCase();

    const [users] = await pool.query('SELECT * FROM USER WHERE email = ?', [email]);
    if (users.length === 0) {
      const err = new Error('Only authorized VIT email IDs are allowed. Students must use @vitstudent.ac.in, while administrators and wardens must use @vit.ac.in.');
      err.statusCode = 403;
      return next(err);
    }

    const user = users[0];
    if (!user.is_active) {
      const err = new Error('Account is disabled');
      err.statusCode = 403;
      return next(err);
    }

    if (!validateDomainPolicy(user.email, user.role)) {
      const err = new Error('Only authorized VIT email IDs are allowed. Students must use @vitstudent.ac.in, while administrators and wardens must use @vit.ac.in.');
      err.statusCode = 403;
      return next(err);
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const jwtPayload = {
      user_id: user.user_id,
      role: user.role,
      email: user.email
    };
    
    const token = jwt.sign(jwtPayload, secret, { expiresIn });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // In a real app, you would redirect to frontend dashboard here, but we will return JSON for API simplicity.
    // Assuming frontend calls this route in a popup or handles redirect.
    res.json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  me,
  googleLogin,
  googleCallback
};
