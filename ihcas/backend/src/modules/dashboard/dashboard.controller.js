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
    const [hostels] = await pool.query("SELECT COUNT(*) as total_hostels, SUM(total_capacity) as planned_capacity FROM HOSTEL");
    const [roomsSummary] = await pool.query(`
      SELECT 
        COUNT(*) as total_rooms,
        COALESCE(SUM(capacity), 0) as total_bed_capacity,
        COALESCE(SUM(CASE WHEN status != 'MAINTENANCE' THEN capacity ELSE 0 END), 0) as operational_capacity,
        COALESCE(SUM(CASE WHEN status = 'MAINTENANCE' THEN capacity ELSE 0 END), 0) as maintenance_beds
      FROM ROOM
    `);
    const [occupancy] = await pool.query(`
      SELECT COUNT(*) as occupied_beds 
      FROM ALLOCATION 
      WHERE status IN ('CONFIRMED', 'LOCKED')
    `);

    // 3. Counselling Sessions
    const [sessions] = await pool.query("SELECT * FROM COUNSELLING_SESSION ORDER BY start_date DESC LIMIT 5");

    const totalBedCapacity = Number(roomsSummary[0].total_bed_capacity) || 0;
    const operationalCapacity = Number(roomsSummary[0].operational_capacity) || 0;

    res.json({
      success: true,
      data: {
        users: {
          students: students[0].count,
          wardens: wardens[0].count
        },
        inventory: {
          total_hostels: hostels[0].total_hostels || 0,
          total_capacity: totalBedCapacity,
          total_bed_capacity: totalBedCapacity,
          operational_capacity: operationalCapacity,
          maintenance_beds: Number(roomsSummary[0].maintenance_beds) || 0,
          planned_capacity: Number(hostels[0].planned_capacity) || 0,
          occupied_beds: occupancy[0].occupied_beds || 0
        },
        sessions: sessions
      }
    });
  } catch (error) { next(error); }
};

const getAdminAnalytics = async (req, res, next) => {
  try {
    const { hostel_id, gender, session_id, date_range, start_date, end_date } = req.query;

    // 1. Overall System KPIs
    const [studentsCount] = await pool.query("SELECT COUNT(*) as count FROM STUDENT");
    const [studentsByGender] = await pool.query("SELECT gender, COUNT(*) as count FROM STUDENT GROUP BY gender");
    const [hostelsCount] = await pool.query("SELECT COUNT(*) as count FROM HOSTEL");
    const [roomsSummary] = await pool.query(`
      SELECT 
        COUNT(*) as total_rooms,
        COALESCE(SUM(r.capacity), 0) as total_bed_capacity,
        COUNT(CASE WHEN r.status = 'MAINTENANCE' THEN 1 END) as maintenance_rooms,
        COALESCE(SUM(CASE WHEN r.status = 'MAINTENANCE' THEN r.capacity ELSE 0 END), 0) as maintenance_beds,
        COUNT(CASE WHEN r.status != 'MAINTENANCE' AND COALESCE(a.active_count, 0) = 0 THEN 1 END) as available_status_rooms,
        COUNT(CASE WHEN r.status != 'MAINTENANCE' AND COALESCE(a.active_count, 0) > 0 AND COALESCE(a.active_count, 0) < r.capacity THEN 1 END) as partially_filled_rooms,
        COUNT(CASE WHEN r.status != 'MAINTENANCE' AND COALESCE(a.active_count, 0) >= r.capacity THEN 1 END) as full_rooms
      FROM ROOM r
      LEFT JOIN (
        SELECT room_id, COUNT(*) as active_count
        FROM ALLOCATION
        WHERE status IN ('CONFIRMED', 'LOCKED')
        GROUP BY room_id
      ) a ON r.room_id = a.room_id
    `);

    // Authoritative occupied beds from active allocations
    const [activeAllocations] = await pool.query(`
      SELECT 
        COUNT(*) as occupied_beds,
        COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_allocations,
        COUNT(CASE WHEN status = 'LOCKED' THEN 1 END) as locked_allocations
      FROM ALLOCATION 
      WHERE status IN ('CONFIRMED', 'LOCKED')
    `);

    const totalStudents = studentsCount[0].count;
    const totalBedCapacity = Number(roomsSummary[0].total_bed_capacity) || 0;
    const occupiedBeds = Number(activeAllocations[0].occupied_beds) || 0;
    const maintenanceBeds = Number(roomsSummary[0].maintenance_beds) || 0;
    const operationalCapacity = totalBedCapacity - maintenanceBeds;
    const availableBeds = operationalCapacity - occupiedBeds;
    const occupancyPercentage = totalBedCapacity > 0 ? Number(((occupiedBeds / totalBedCapacity) * 100).toFixed(1)) : 0;
    const operationalOccupancyPercentage = operationalCapacity > 0 ? Number(((occupiedBeds / operationalCapacity) * 100).toFixed(1)) : 0;
    const unallocatedStudents = Math.max(0, totalStudents - occupiedBeds);

    // 2. Hostel Breakdown with filters
    let hostelFilterClause = '';
    const hostelParams = [];
    if (hostel_id && hostel_id !== 'ALL') {
      hostelFilterClause += ' AND h.hostel_id = ?';
      hostelParams.push(hostel_id);
    }
    if (gender && (gender === 'MALE' || gender === 'FEMALE')) {
      hostelFilterClause += ' AND h.gender = ?';
      hostelParams.push(gender);
    }

    const [hostelsList] = await pool.query(`
      SELECT 
        h.hostel_id,
        h.name,
        h.gender,
        h.total_capacity as configured_capacity,
        COUNT(DISTINCT r.room_id) as total_rooms,
        COALESCE(SUM(r.capacity), 0) as total_bed_capacity,
        COUNT(DISTINCT CASE WHEN r.status = 'MAINTENANCE' THEN r.room_id END) as maintenance_rooms,
        COALESCE(SUM(CASE WHEN r.status = 'MAINTENANCE' THEN r.capacity ELSE 0 END), 0) as maintenance_beds,
        COALESCE(SUM(CASE WHEN r.status != 'MAINTENANCE' THEN r.capacity ELSE 0 END), 0) as operational_capacity,
        COALESCE((
          SELECT COUNT(*)
          FROM ALLOCATION a
          JOIN ROOM rm ON a.room_id = rm.room_id
          WHERE rm.hostel_id = h.hostel_id AND a.status IN ('CONFIRMED', 'LOCKED')
        ), 0) as occupied_beds
      FROM HOSTEL h
      LEFT JOIN ROOM r ON h.hostel_id = r.hostel_id
      WHERE 1=1 ${hostelFilterClause}
      GROUP BY h.hostel_id, h.name, h.gender, h.total_capacity
      ORDER BY h.name ASC
    `, hostelParams);

    const hostelsData = hostelsList.map(h => {
      const totCap = Number(h.total_bed_capacity) || 0;
      const occ = Number(h.occupied_beds) || 0;
      const maint = Number(h.maintenance_beds) || 0;
      const opCap = Number(h.operational_capacity) || (totCap - maint);
      const avail = Math.max(0, opCap - occ);
      const pct = totCap > 0 ? Number(((occ / totCap) * 100).toFixed(1)) : 0;
      return {
        ...h,
        total_rooms: Number(h.total_rooms),
        total_bed_capacity: totCap,
        maintenance_rooms: Number(h.maintenance_rooms),
        maintenance_beds: maint,
        operational_capacity: opCap,
        occupied_beds: occ,
        available_beds: avail,
        occupancy_rate: pct
      };
    });

    // 3. Room Inventory Distribution (by Room Type)
    const [roomTypes] = await pool.query(`
      SELECT 
        rt.room_type_id,
        rt.type_name,
        rt.capacity,
        rt.has_ac,
        COUNT(r.room_id) as room_count,
        COALESCE(SUM(r.capacity), 0) as total_beds,
        COALESCE((
          SELECT COUNT(*)
          FROM ALLOCATION a
          JOIN ROOM rm ON a.room_id = rm.room_id
          WHERE rm.room_type_id = rt.room_type_id AND a.status IN ('CONFIRMED', 'LOCKED')
        ), 0) as occupied_beds
      FROM ROOM_TYPE rt
      LEFT JOIN ROOM r ON rt.room_type_id = r.room_type_id
      GROUP BY rt.room_type_id, rt.type_name, rt.capacity, rt.has_ac
      ORDER BY rt.capacity ASC, rt.has_ac DESC
    `);

    // 4. Counselling Sessions & Slots
    const [sessions] = await pool.query(`
      SELECT 
        session_id, academic_year, start_date, end_date, slot_duration_minutes, status, created_at
      FROM COUNSELLING_SESSION
      ORDER BY start_date DESC
    `);

    let slotWhere = 'WHERE 1=1';
    const slotParams = [];
    if (session_id && session_id !== 'ALL') {
      slotWhere += ' AND session_id = ?';
      slotParams.push(session_id);
    }

    const [slotsSummary] = await pool.query(`
      SELECT 
        COUNT(*) as total_slots,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_slots,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_slots,
        COUNT(CASE WHEN status = 'ACTIVE' OR is_active = 1 THEN 1 END) as active_slots,
        COUNT(CASE WHEN status IN ('TIMEOUT', 'EXPIRED') THEN 1 END) as timeout_slots
      FROM COUNSELLING_SLOT
      ${slotWhere}
    `, slotParams);

    // 5. Allocation Analytics (by Gender, by Hostel, and Recent timeline)
    const [allocationsByGender] = await pool.query(`
      SELECT 
        s.gender,
        COUNT(a.allocation_id) as allocated_count
      FROM ALLOCATION a
      JOIN STUDENT s ON a.student_id = s.student_id
      WHERE a.status IN ('CONFIRMED', 'LOCKED')
      GROUP BY s.gender
    `);

    let allocWhere = "WHERE a.status IN ('CONFIRMED', 'LOCKED')";
    const allocParams = [];
    if (hostel_id && hostel_id !== 'ALL') {
      allocWhere += ' AND r.hostel_id = ?';
      allocParams.push(hostel_id);
    }
    if (gender && (gender === 'MALE' || gender === 'FEMALE')) {
      allocWhere += ' AND s.gender = ?';
      allocParams.push(gender);
    }
    if (start_date) {
      allocWhere += ' AND COALESCE(a.confirmed_at, a.allocated_at) >= ?';
      allocParams.push(new Date(start_date));
    }
    if (end_date) {
      allocWhere += ' AND COALESCE(a.confirmed_at, a.allocated_at) <= ?';
      allocParams.push(new Date(end_date));
    } else if (date_range === '7D') {
      allocWhere += ' AND COALESCE(a.confirmed_at, a.allocated_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (date_range === '30D') {
      allocWhere += ' AND COALESCE(a.confirmed_at, a.allocated_at) >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const [recentAllocations] = await pool.query(`
      SELECT 
        a.allocation_id,
        u.name as student_name,
        s.reg_no,
        s.academic_rank,
        s.gender,
        r.room_number,
        h.name as hostel_name,
        rt.type_name,
        a.status,
        a.allocated_at,
        a.confirmed_at
      FROM ALLOCATION a
      JOIN STUDENT s ON a.student_id = s.student_id
      JOIN USER u ON s.student_id = u.user_id
      JOIN ROOM r ON a.room_id = r.room_id
      JOIN HOSTEL h ON r.hostel_id = h.hostel_id
      JOIN ROOM_TYPE rt ON r.room_type_id = rt.room_type_id
      ${allocWhere}
      ORDER BY COALESCE(a.confirmed_at, a.allocated_at) DESC
      LIMIT 12
    `, allocParams);

    // 6. Student Request Analytics
    const [leaveCounts] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
      FROM LEAVE_REQUEST
    `);

    const [roomChangeCounts] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
      FROM ROOM_CHANGE_REQUEST
    `);

    const [messChangeCounts] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
      FROM MESS_CHANGE_REQUEST
    `);

    const [complaintCounts] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status IN ('RESOLVED', 'CLOSED', 'APPROVED') THEN 1 END) as resolved
      FROM COMPLAINT
    `);

    const totalRequests = (leaveCounts[0].total || 0) + (roomChangeCounts[0].total || 0) + (messChangeCounts[0].total || 0) + (complaintCounts[0].total || 0);
    const totalPendingRequests = (leaveCounts[0].pending || 0) + (roomChangeCounts[0].pending || 0) + (messChangeCounts[0].pending || 0) + (complaintCounts[0].pending || 0);

    res.json({
      success: true,
      data: {
        kpis: {
          registered_students: totalStudents,
          registered_hostels: hostelsCount[0].count,
          total_rooms: Number(roomsSummary[0].total_rooms) || 0,
          total_bed_capacity: totalBedCapacity,
          operational_bed_capacity: operationalCapacity,
          maintenance_rooms: Number(roomsSummary[0].maintenance_rooms) || 0,
          maintenance_beds: maintenanceBeds,
          occupied_beds: occupiedBeds,
          available_beds: availableBeds,
          overall_occupancy_percentage: occupancyPercentage,
          operational_occupancy_percentage: operationalOccupancyPercentage,
          confirmed_allocations: Number(activeAllocations[0].confirmed_allocations) || 0,
          locked_allocations: Number(activeAllocations[0].locked_allocations) || 0,
          unallocated_students: unallocatedStudents
        },
        hostels: hostelsData,
        room_types: roomTypes.map(rt => {
          const tb = Number(rt.total_beds) || 0;
          const ob = Number(rt.occupied_beds) || 0;
          return {
            ...rt,
            room_count: Number(rt.room_count),
            total_beds: tb,
            occupied_beds: ob,
            available_beds: Math.max(0, tb - ob),
            occupancy_rate: tb > 0 ? Number(((ob / tb) * 100).toFixed(1)) : 0
          };
        }),
        room_status_distribution: {
          available: Number(roomsSummary[0].available_status_rooms) || 0,
          partially_filled: Number(roomsSummary[0].partially_filled_rooms) || 0,
          full: Number(roomsSummary[0].full_rooms) || 0,
          maintenance: Number(roomsSummary[0].maintenance_rooms) || 0
        },
        counselling: {
          total_sessions: sessions.length,
          sessions: sessions,
          slots: {
            total: Number(slotsSummary[0].total_slots) || 0,
            completed: Number(slotsSummary[0].completed_slots) || 0,
            pending: Number(slotsSummary[0].pending_slots) || 0,
            active: Number(slotsSummary[0].active_slots) || 0,
            timeout: Number(slotsSummary[0].timeout_slots) || 0
          },
          batch_capacity_limit: 20
        },
        allocations: {
          confirmed: Number(activeAllocations[0].confirmed_allocations) || 0,
          unallocated: unallocatedStudents,
          by_gender: allocationsByGender,
          students_by_gender: studentsByGender,
          recent: recentAllocations
        },
        requests: {
          total: totalRequests,
          pending: totalPendingRequests,
          leave: leaveCounts[0],
          room_change: roomChangeCounts[0],
          mess_change: messChangeCounts[0],
          complaints: complaintCounts[0]
        }
      }
    });
  } catch (error) { next(error); }
};

module.exports = {
  getStudentDashboard,
  getWardenDashboard,
  getAdminDashboard,
  getAdminAnalytics
};
