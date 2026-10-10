const pool = require('../../config/db');

// Get profile of the currently authenticated user
const getProfile = async (req, res, next) => {
  const { user_id, role } = req.user;

  try {
    const [users] = await pool.query('SELECT user_id, name, email, role, is_active, created_at FROM USER WHERE user_id = ?', [user_id]);
    if (users.length === 0) {
      const err = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }
    const user = users[0];

    // Join with role-specific tables
    let profileData = null;
    if (role === 'STUDENT') {
      const [students] = await pool.query('SELECT * FROM STUDENT WHERE student_id = ?', [user_id]);
      profileData = students[0] || null;
    } else if (role === 'ADMIN') {
      const [admins] = await pool.query('SELECT * FROM ADMIN WHERE admin_id = ?', [user_id]);
      profileData = admins[0] || null;
    } else if (role === 'WARDEN') {
      const [wardens] = await pool.query('SELECT * FROM WARDEN WHERE warden_id = ?', [user_id]);
      profileData = wardens[0] || null;
    }

    res.json({
      success: true,
      data: {
        ...user,
        profile: profileData
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update profile of the currently authenticated user (only permitted fields)
const updateProfile = async (req, res, next) => {
  const { user_id, role } = req.user;
  const { phone } = req.body; // For now, only phone is permitted for self-update across roles

  try {
    let tableName = '';
    let idColumn = '';
    
    if (role === 'STUDENT') {
      tableName = 'STUDENT';
      idColumn = 'student_id';
    } else if (role === 'ADMIN') {
      tableName = 'ADMIN';
      idColumn = 'admin_id';
    } else if (role === 'WARDEN') {
      tableName = 'WARDEN';
      idColumn = 'warden_id';
    }

    if (!tableName) {
      const err = new Error('Invalid role');
      err.statusCode = 400;
      return next(err);
    }

    if (phone !== undefined) {
      await pool.query(`UPDATE ${tableName} SET phone = ? WHERE ${idColumn} = ?`, [phone, user_id]);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Admin only: Get any user profile
const getUserById = async (req, res, next) => {
  const targetUserId = req.params.id;
  try {
    const [users] = await pool.query('SELECT user_id, name, email, role, is_active, created_at FROM USER WHERE user_id = ?', [targetUserId]);
    if (users.length === 0) {
      const err = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }
    const user = users[0];
    
    let profileData = null;
    if (user.role === 'STUDENT') {
      const [students] = await pool.query('SELECT * FROM STUDENT WHERE student_id = ?', [targetUserId]);
      profileData = students[0] || null;
    }
    
    res.json({
      success: true,
      data: {
        ...user,
        profile: profileData
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUserById
};
