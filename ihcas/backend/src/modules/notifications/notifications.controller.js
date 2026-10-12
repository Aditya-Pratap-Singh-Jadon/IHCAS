const pool = require('../../config/db');
const { createNotification } = require('../../services/notification.service');

const getNotifications = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM NOTIFICATION WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.user_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE NOTIFICATION SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) { next(error); }
};

// Admin/Warden can create announcements
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message } = req.body;
    
    // For simplicity, broadcast to all users in scope. Admin = all users, Warden = users in hostel.
    // In a real scenario, this would create one announcement record and link it, but schema requires user_id.
    
    let targetStudents = [];
    if (req.user.role === 'ADMIN') {
      const [students] = await pool.query('SELECT user_id FROM USER WHERE role = "STUDENT"');
      targetStudents = students;
    } else if (req.user.role === 'WARDEN') {
      const [wardens] = await pool.query('SELECT hostel_id FROM WARDEN WHERE warden_id = ?', [req.user.user_id]);
      if (wardens[0] && wardens[0].hostel_id) {
        const [students] = await pool.query(`
          SELECT u.user_id FROM USER u 
          JOIN ALLOCATION a ON u.user_id = a.student_id 
          JOIN ROOM rm ON a.room_id = rm.room_id 
          WHERE rm.hostel_id = ? AND a.status IN ('CONFIRMED', 'LOCKED')
        `, [wardens[0].hostel_id]);
        targetStudents = students;
      }
    }

    if (targetStudents.length === 0) {
      return next({ statusCode: 400, message: 'No targets found in your scope' });
    }

    // Batch insert
    const values = targetStudents.map(s => [s.user_id, title, message, 'ANNOUNCEMENT']);
    await pool.query('INSERT INTO NOTIFICATION (user_id, title, message, type) VALUES ?', [values]);

    res.status(201).json({ success: true, message: 'Announcement created' });
  } catch (error) { next(error); }
};

module.exports = {
  getNotifications,
  markAsRead,
  createAnnouncement
};
