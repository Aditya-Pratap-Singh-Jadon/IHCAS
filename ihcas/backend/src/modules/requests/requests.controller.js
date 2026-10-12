const pool = require('../../config/db');
const { createNotification } = require('../../services/notification.service');

// --- Helpers ---
const getStudentScope = (req) => {
  return req.user.role === 'STUDENT' ? `WHERE r.student_id = ${pool.escape(req.user.user_id)}` : '';
};

const getWardenScope = async (req) => {
  if (req.user.role === 'WARDEN') {
    const [wardens] = await pool.query('SELECT hostel_id FROM WARDEN WHERE warden_id = ?', [req.user.user_id]);
    if (wardens[0] && wardens[0].hostel_id) {
      // Return subquery to filter students in this warden's hostel
      return `WHERE r.student_id IN (
        SELECT student_id FROM ALLOCATION a 
        JOIN ROOM rm ON a.room_id = rm.room_id 
        WHERE rm.hostel_id = ${pool.escape(wardens[0].hostel_id)} 
        AND a.status IN ('CONFIRMED', 'LOCKED')
      )`;
    }
    return 'WHERE 1=0'; // Warden with no hostel assigned
  } else if (req.user.role === 'ADMIN') {
    return ''; // Admins see all
  }
  return 'WHERE 1=0'; // Fallback
};

// --- Leave Requests ---
const getLeaveRequests = async (req, res, next) => {
  try {
    let whereClause = '';
    if (req.user.role === 'STUDENT') {
      whereClause = getStudentScope(req);
    } else {
      whereClause = await getWardenScope(req);
    }

    const [rows] = await pool.query(`SELECT r.* FROM LEAVE_REQUEST r ${whereClause} ORDER BY r.requested_at DESC`);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

const createLeaveRequest = async (req, res, next) => {
  try {
    const { start_date, end_date, reason } = req.body;
    if (new Date(start_date) > new Date(end_date)) {
      return next({ statusCode: 400, message: 'Start date must be before end date' });
    }

    await pool.query(
      'INSERT INTO LEAVE_REQUEST (student_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
      [req.user.user_id, start_date, end_date, reason]
    );
    res.status(201).json({ success: true, message: 'Leave request submitted successfully' });
  } catch (error) { next(error); }
};

const reviewLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const whereClause = await getWardenScope(req);
    
    // Check if it exists in scope
    const [reqs] = await pool.query(`SELECT r.* FROM LEAVE_REQUEST r ${whereClause ? whereClause + ' AND' : 'WHERE'} r.leave_id = ?`, [id]);
    if (reqs.length === 0) return next({ statusCode: 404, message: 'Leave request not found or not in scope' });
    if (reqs[0].status !== 'PENDING') return next({ statusCode: 400, message: 'Request is not pending' });

    await pool.query(
      'UPDATE LEAVE_REQUEST SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE leave_id = ?',
      [status, req.user.user_id, id]
    );

    await createNotification(reqs[0].student_id, 'Leave Request Update', `Your leave request has been ${status}`, 'LEAVE');

    res.json({ success: true, message: `Leave request ${status}` });
  } catch (error) { next(error); }
};

// --- Room Change Requests ---
const getRoomChangeRequests = async (req, res, next) => {
  try {
    let whereClause = '';
    if (req.user.role === 'STUDENT') {
      whereClause = getStudentScope(req);
    } else {
      whereClause = await getWardenScope(req);
    }
    const [rows] = await pool.query(`SELECT r.* FROM ROOM_CHANGE_REQUEST r ${whereClause} ORDER BY r.requested_at DESC`);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

const createRoomChangeRequest = async (req, res, next) => {
  try {
    const { requested_room_type, reason } = req.body;
    
    // Check if student has an active allocation
    const [allocs] = await pool.query(
      "SELECT room_id FROM ALLOCATION WHERE student_id = ? AND status IN ('CONFIRMED', 'LOCKED')",
      [req.user.user_id]
    );
    if (allocs.length === 0) return next({ statusCode: 400, message: 'No active room allocation found' });
    
    // Check if there is already a pending room change request
    const [pendings] = await pool.query(
      "SELECT change_id FROM ROOM_CHANGE_REQUEST WHERE student_id = ? AND status = 'PENDING'",
      [req.user.user_id]
    );
    if (pendings.length > 0) return next({ statusCode: 400, message: 'You already have a pending room change request' });

    await pool.query(
      'INSERT INTO ROOM_CHANGE_REQUEST (student_id, current_room_id, requested_room_type, reason) VALUES (?, ?, ?, ?)',
      [req.user.user_id, allocs[0].room_id, requested_room_type, reason]
    );
    res.status(201).json({ success: true, message: 'Room change request submitted' });
  } catch (error) { next(error); }
};

const reviewRoomChangeRequest = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, new_room_id } = req.body;
    
    const whereClause = await getWardenScope(req);
    const [reqs] = await connection.query(`SELECT r.* FROM ROOM_CHANGE_REQUEST r ${whereClause ? whereClause + ' AND' : 'WHERE'} r.change_id = ? FOR UPDATE`, [id]);
    
    if (reqs.length === 0) {
      await connection.rollback();
      return next({ statusCode: 404, message: 'Room change request not found or not in scope' });
    }
    const requestRecord = reqs[0];
    if (requestRecord.status !== 'PENDING') {
      await connection.rollback();
      return next({ statusCode: 400, message: 'Request is not pending' });
    }

    if (status === 'REJECTED') {
      await connection.query(
        'UPDATE ROOM_CHANGE_REQUEST SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE change_id = ?',
        ['REJECTED', req.user.user_id, id]
      );
      await createNotification(requestRecord.student_id, 'Room Change Update', 'Your room change request was rejected', 'ROOM_CHANGE', connection);
      await connection.commit();
      return res.json({ success: true, message: 'Room change request rejected' });
    }

    // APPROVED logic
    if (status === 'APPROVED') {
      await connection.beginTransaction();

      // Lock current allocation
      const [allocs] = await connection.query(
        "SELECT allocation_id, room_id FROM ALLOCATION WHERE student_id = ? AND status IN ('CONFIRMED', 'LOCKED') FOR UPDATE",
        [requestRecord.student_id]
      );
      if (allocs.length === 0) {
        await connection.rollback();
        return next({ statusCode: 400, message: 'Student no longer has an active allocation' });
      }

      const currentAllocation = allocs[0];
      
      // Get student gender
      const [studentRes] = await connection.query("SELECT gender FROM STUDENT WHERE student_id = ? FOR UPDATE", [requestRecord.student_id]);
      const studentGender = studentRes[0].gender;

      // Lock and check new room
      const [roomRes] = await connection.query(
        "SELECT r.capacity, r.status, h.gender as hostel_gender FROM ROOM r JOIN HOSTEL h ON r.hostel_id = h.hostel_id WHERE r.room_id = ? FOR UPDATE",
        [new_room_id]
      );
      
      if (roomRes.length === 0) {
        await connection.rollback();
        return next({ statusCode: 404, message: 'Target room not found' });
      }
      
      const targetRoom = roomRes[0];
      if (targetRoom.status === 'MAINTENANCE') {
        await connection.rollback();
        return next({ statusCode: 400, message: 'Target room is under maintenance' });
      }
      if (targetRoom.hostel_gender !== studentGender) {
        await connection.rollback();
        return next({ statusCode: 403, message: 'Target room hostel gender does not match student gender' });
      }

      // Check capacity
      const [occRes] = await connection.query(
        "SELECT COUNT(*) as count FROM ALLOCATION WHERE room_id = ? AND status IN ('CONFIRMED', 'LOCKED')",
        [new_room_id]
      );
      if (occRes[0].count >= targetRoom.capacity) {
        await connection.rollback();
        return next({ statusCode: 409, message: 'Target room does not have enough capacity' });
      }

      // Proceed with reallocation
      // 1. Close current allocation
      await connection.query("UPDATE ALLOCATION SET status = 'CANCELLED' WHERE allocation_id = ?", [currentAllocation.allocation_id]);
      
      // 2. Create new allocation
      await connection.query(
        "INSERT INTO ALLOCATION (student_id, room_id, allocation_type, status, confirmed_at) VALUES (?, ?, 'SELF', 'CONFIRMED', NOW())",
        [requestRecord.student_id, new_room_id]
      );

      // 3. Update request
      await connection.query(
        'UPDATE ROOM_CHANGE_REQUEST SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE change_id = ?',
        ['APPROVED', req.user.user_id, id]
      );
      
      await createNotification(requestRecord.student_id, 'Room Change Approved', 'Your room change request was approved and your room has been reassigned.', 'ROOM_CHANGE', connection);

      await connection.commit();
      return res.json({ success: true, message: 'Room change request approved and reallocation successful' });
    }
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// --- Mess Change Requests ---
const getMessChangeRequests = async (req, res, next) => {
  try {
    let whereClause = '';
    if (req.user.role === 'STUDENT') {
      whereClause = getStudentScope(req);
    } else {
      whereClause = await getWardenScope(req);
    }
    const [rows] = await pool.query(`SELECT r.* FROM MESS_CHANGE_REQUEST r ${whereClause} ORDER BY r.requested_at DESC`);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

const createMessChangeRequest = async (req, res, next) => {
  try {
    const { requested_mess, reason } = req.body;
    
    // Simple deduplication
    const [pendings] = await pool.query(
      "SELECT mess_id FROM MESS_CHANGE_REQUEST WHERE student_id = ? AND status = 'PENDING'",
      [req.user.user_id]
    );
    if (pendings.length > 0) return next({ statusCode: 400, message: 'You already have a pending mess change request' });

    await pool.query(
      'INSERT INTO MESS_CHANGE_REQUEST (student_id, current_mess, requested_mess, reason) VALUES (?, ?, ?, ?)',
      [req.user.user_id, 'CURRENT_MESS', requested_mess, reason] // Simplified current_mess as it's not strongly typed in schema
    );
    res.status(201).json({ success: true, message: 'Mess change request submitted' });
  } catch (error) { next(error); }
};

const reviewMessChangeRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const whereClause = await getWardenScope(req);
    
    const [reqs] = await pool.query(`SELECT r.* FROM MESS_CHANGE_REQUEST r ${whereClause ? whereClause + ' AND' : 'WHERE'} r.mess_id = ?`, [id]);
    if (reqs.length === 0) return next({ statusCode: 404, message: 'Mess change request not found or not in scope' });
    if (reqs[0].status !== 'PENDING') return next({ statusCode: 400, message: 'Request is not pending' });

    await pool.query(
      'UPDATE MESS_CHANGE_REQUEST SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE mess_id = ?',
      [status, req.user.user_id, id]
    );

    await createNotification(reqs[0].student_id, 'Mess Change Update', `Your mess change request has been ${status}`, 'MESS');

    res.json({ success: true, message: `Mess change request ${status}` });
  } catch (error) { next(error); }
};

// --- Complaints ---
const getComplaints = async (req, res, next) => {
  try {
    let whereClause = '';
    if (req.user.role === 'STUDENT') {
      whereClause = getStudentScope(req);
    } else {
      whereClause = await getWardenScope(req);
    }
    const [rows] = await pool.query(`SELECT r.* FROM COMPLAINT r ${whereClause} ORDER BY r.created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

const createComplaint = async (req, res, next) => {
  try {
    const { category, description, priority } = req.body;
    
    await pool.query(
      'INSERT INTO COMPLAINT (student_id, category, description, priority) VALUES (?, ?, ?, ?)',
      [req.user.user_id, category, description, priority || 'LOW']
    );
    res.status(201).json({ success: true, message: 'Complaint submitted' });
  } catch (error) { next(error); }
};

const reviewComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Actually complaints usually transition to 'RESOLVED' or similar, schema uses ENUM('PENDING', 'APPROVED', 'REJECTED', 'CLOSED')
    const whereClause = await getWardenScope(req);
    
    const [reqs] = await pool.query(`SELECT r.* FROM COMPLAINT r ${whereClause ? whereClause + ' AND' : 'WHERE'} r.complaint_id = ?`, [id]);
    if (reqs.length === 0) return next({ statusCode: 404, message: 'Complaint not found or not in scope' });
    if (reqs[0].status === 'CLOSED') return next({ statusCode: 400, message: 'Complaint is already closed' });

    await pool.query(
      'UPDATE COMPLAINT SET status = ?, resolved_at = NOW(), resolved_by = ? WHERE complaint_id = ?',
      [status, req.user.user_id, id]
    );

    await createNotification(reqs[0].student_id, 'Complaint Update', `Your complaint status is now ${status}`, 'COMPLAINT');

    res.json({ success: true, message: `Complaint ${status}` });
  } catch (error) { next(error); }
};

module.exports = {
  getLeaveRequests, createLeaveRequest, reviewLeaveRequest,
  getRoomChangeRequests, createRoomChangeRequest, reviewRoomChangeRequest,
  getMessChangeRequests, createMessChangeRequest, reviewMessChangeRequest,
  getComplaints, createComplaint, reviewComplaint
};
