const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

module.exports = {
  login,
  logout,
  me
};
