const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    return next(error);
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production';
    const decoded = jwt.verify(token, secret);
    
    // Enforce domain policy even on active tokens
    if (decoded.email && decoded.role) {
      const normalizedEmail = decoded.email.trim().toLowerCase();
      const domain = normalizedEmail.split('@')[1];
      
      let isValid = false;
      if (decoded.role === 'STUDENT') {
        isValid = domain === 'vitstudent.ac.in';
      } else if (decoded.role === 'ADMIN' || decoded.role === 'WARDEN') {
        isValid = domain === 'vit.ac.in';
      }
      
      if (!isValid) {
        const error = new Error('Invalid email domain for the given role');
        error.statusCode = 403;
        return next(error);
      }
    }

    req.user = decoded; // Contains user_id, role, etc.
    next();
  } catch (err) {
    const error = new Error('Invalid or expired token');
    error.statusCode = 401;
    next(error);
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const error = new Error('Forbidden: Insufficient privileges');
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};
