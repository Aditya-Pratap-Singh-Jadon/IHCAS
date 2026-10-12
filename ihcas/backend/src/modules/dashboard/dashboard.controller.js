const pool = require('../../config/db');

const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.user_id;

    // 1. Identity & Basic Info
    const [students] = await pool.query(
      'SELECT s.*, u.name, u.email FROM STUDENT s JOIN USER u ON s.student_id = u.user_id WHERE s.student_id = ?',
      [studentId]
    );
    if (students.length === 0) return next({ statusCode: 404, message: 'Student not found' });
    const student = students[0];

    // 2. Allocation Info
    const [allocs] = await pool.query(`
      SELECT a.allocation_id, a.status as allocation_status, a.confirmed_at,
             r.room_number, r.floor, rt.type_name as room_type, h.name as hostel_name
      FROM ALLOCATION a
      JOIN ROOM r ON a.room_id = r.room_id
      JOIN ROOM_TYPE rt ON r.room_type_id = rt.room_type_id
      JOIN HOSTEL h ON r.hostel_id = h.hostel_id
      WHERE a.student_id = ? AND a.status IN ('CONFIRMED', 'LOCKED')
    `, [studentId]);
    const allocation = allocs.length > 0 ? allocs[0] : null;

    // 3. Roommate Info (if allocated)
    let roommates = [];
    if (allocation) {
      // Find others in the same room
      const [rms] = await pool.query(`
        SELECT u.name, s.reg_no, s.gender
        FROM ALLOCATION a
        JOIN STUDENT s ON a.student_id = s.student_id
        JOIN USER u ON s.student_id = u.user_id
        WHERE a.room_id = (
          SELECT room_id FROM ALLOCATION WHERE allocation_id = ?
        ) AND a.status IN ('CONFIRMED', 'LOCKED') AND a.student_id != ?
      `, [allocation.allocation_id, studentId]);
      roommates = rms;
    }

    // 4. Counselling Status
    const [slots] = await pool.query(
      'SELECT status, start_time, end_time FROM COUNSELLING_SLOT WHERE student_id = ? ORDER BY start_time DESC LIMIT 1',
      [studentId]
    );
    const counselling = slots.length > 0 ? slots[0] : null;

    // 5. Outstanding Requests
    const [leaveReqs] = await pool.query("SELECT leave_id, start_date, end_date, status FROM LEAVE_REQUEST WHERE student_id = ? AND status = 'PENDING'", [studentId]);
    const [roomReqs] = await pool.query("SELECT change_id, requested_room_type, status FROM ROOM_CHANGE_REQUEST WHERE student_id = ? AND status = 'PENDING'", [studentId]);
    const [messReqs] = await pool.query("SELECT mess_id, requested_mess, status FROM MESS_CHANGE_REQUEST WHERE student_id = ? AND status = 'PENDING'", [studentId]);
    const [complaints] = await pool.query("SELECT complaint_id, category, status FROM COMPLAINT WHERE student_id = ? AND status = 'PENDING'", [studentId]);

    // 6. Notifications
    const [notifications] = await pool.query('SELECT * FROM NOTIFICATION WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC', [studentId]);

    res.json({
      success: true,
      data: {
        student: {
          name: student.name,
          email: student.email,
          reg_no: student.reg_no,
          gender: student.gender,
          academic_rank: student.academic_rank,
          cgpa: student.cgpa
        },
        allocation: allocation,
        roommates: roommates,
        counselling: counselling,
        requests: {
          leave: leaveReqs,
          room_change: roomReqs,
          mess_change: messReqs,
          complaints: complaints
        },
        notifications: notifications
      }
    });
  } catch (error) { next(error); }
};

const getWardenDashboard = async (req, res, next) => {
  try {
    const wardenId = req.user.user_id;

    // 1. Warden and Hostel Info
    const [wardens] = await pool.query(
      'SELECT w.*, u.name, u.email, h.name as hostel_name, h.gender as hostel_gender, h.total_capacity FROM WARDEN w JOIN USER u ON w.warden_id = u.user_id LEFT JOIN HOSTEL h ON w.hostel_id = h.hostel_id WHERE w.warden_id = ?',
      [wardenId]
    );
    if (wardens.length === 0) return next({ statusCode: 404, message: 'Warden not found' });
    const warden = wardens[0];
    
    if (!warden.hostel_id) {
       return res.json({ success: true, data: { warden: warden, requests: { leave: [], room_change: [], mess_change: [], complaints: [] }, notifications: [] } });
    }

    const hostelId = warden.hostel_id;

    // 2. Inventory and Occupancy overview (simplified)
    const [rooms] = await pool.query('SELECT COUNT(*) as total_rooms, SUM(capacity) as total_bed_capacity FROM ROOM WHERE hostel_id = ?', [hostelId]);
    const [occupancy] = await pool.query(`
      SELECT COUNT(*) as occupied_beds 
      FROM ALLOCATION a 
      JOIN ROOM r ON a.room_id = r.room_id 
      WHERE r.hostel_id = ? AND a.status IN ('CONFIRMED', 'LOCKED')
    `, [hostelId]);

    // 3. Pending Requests
    const [leaveReqs] = await pool.query(`
      SELECT lr.leave_id, lr.start_date, lr.end_date, lr.status, u.name as student_name, s.reg_no
      FROM LEAVE_REQUEST lr
      JOIN STUDENT s ON lr.student_id = s.student_id
      JOIN USER u ON s.student_id = u.user_id
      JOIN ALLOCATION a ON s.student_id = a.student_id
      JOIN ROOM r ON a.room_id = r.room_id
      WHERE r.hostel_id = ? AND lr.status = 'PENDING' AND a.status IN ('CONFIRMED', 'LOCKED')
    `, [hostelId]);

    const [roomReqs] = await pool.query(`
      SELECT rr.change_id, rr.requested_room_type, rr.status, u.name as student_name, s.reg_no
      FROM ROOM_CHANGE_REQUEST rr
      JOIN STUDENT s ON rr.student_id = s.student_id
      JOIN USER u ON s.student_id = u.user_id
      JOIN ALLOCATION a ON s.student_id = a.student_id
      JOIN ROOM r ON a.room_id = r.room_id
      WHERE r.hostel_id = ? AND rr.status = 'PENDING' AND a.status IN ('CONFIRMED', 'LOCKED')
    `, [hostelId]);

    const [messReqs] = await pool.query(`
      SELECT mr.mess_id, mr.requested_mess, mr.status, u.name as student_name, s.reg_no
      FROM MESS_CHANGE_REQUEST mr
      JOIN STUDENT s ON mr.student_id = s.student_id
      JOIN USER u ON s.student_id = u.user_id
      JOIN ALLOCATION a ON s.student_id = a.student_id
      JOIN ROOM r ON a.room_id = r.room_id
      WHERE r.hostel_id = ? AND mr.status = 'PENDING' AND a.status IN ('CONFIRMED', 'LOCKED')
    `, [hostelId]);

    const [complaints] = await pool.query(`
      SELECT c.complaint_id, c.category, c.status, c.priority, u.name as student_name, s.reg_no
      FROM COMPLAINT c
      JOIN STUDENT s ON c.student_id = s.student_id
      JOIN USER u ON s.student_id = u.user_id
      JOIN ALLOCATION a ON s.student_id = a.student_id
      JOIN ROOM r ON a.room_id = r.room_id
      WHERE r.hostel_id = ? AND c.status = 'PENDING' AND a.status IN ('CONFIRMED', 'LOCKED')
    `, [hostelId]);

    // 4. Notifications
    const [notifications] = await pool.query('SELECT * FROM NOTIFICATION WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC', [wardenId]);

    res.json({
      success: true,
      data: {
        warden: {
          name: warden.name,
          email: warden.email,
          employee_id: warden.employee_id,
          hostel_id: warden.hostel_id,
          hostel_name: warden.hostel_name,
          hostel_gender: warden.hostel_gender,
          total_capacity: warden.total_capacity
        },
        inventory: {
          total_rooms: rooms[0].total_rooms,
          total_bed_capacity: rooms[0].total_bed_capacity,
          occupied_beds: occupancy[0].occupied_beds
        },
        requests: {
          leave: leaveReqs,
          room_change: roomReqs,
          mess_change: messReqs,
          complaints: complaints
        },
        notifications: notifications
      }
    });
  } catch (error) { next(error); }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    // 1. User Stats
    const [students] = await pool.query("SELECT COUNT(*) as count FROM STUDENT");
    const [wardens] = await pool.query("SELECT COUNT(*) as count FROM WARDEN");

    // 2. Inventory Stats
    const [hostels] = await pool.query("SELECT COUNT(*) as total_hostels, SUM(total_capacity) as total_capacity FROM HOSTEL");
    const [occupancy] = await pool.query(`
      SELECT COUNT(*) as occupied_beds 
      FROM ALLOCATION 
      WHERE status IN ('CONFIRMED', 'LOCKED')
    `);

    // 3. Counselling Sessions
    const [sessions] = await pool.query("SELECT * FROM COUNSELLING_SESSION ORDER BY start_date DESC LIMIT 5");

    res.json({
      success: true,
      data: {
        users: {
          students: students[0].count,
          wardens: wardens[0].count
        },
        inventory: {
          total_hostels: hostels[0].total_hostels || 0,
          total_capacity: hostels[0].total_capacity || 0,
          occupied_beds: occupancy[0].occupied_beds || 0
        },
        sessions: sessions
      }
    });
  } catch (error) { next(error); }
};

module.exports = {
  getStudentDashboard,
  getWardenDashboard,
  getAdminDashboard
};
