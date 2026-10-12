const pool = require('../../config/db');

// --- Helper for Student Gender filtering ---
const getStudentGender = async (userId) => {
  const [rows] = await pool.query('SELECT gender FROM STUDENT WHERE student_id = ?', [userId]);
  return rows[0]?.gender || null;
};

// --- Hostels ---
const getHostels = async (req, res, next) => {
  try {
    let query = 'SELECT * FROM HOSTEL';
    const params = [];

    if (req.user.role === 'STUDENT') {
      const gender = await getStudentGender(req.user.user_id);
      if (gender === 'MALE' || gender === 'FEMALE') {
        query += ' WHERE gender = ?';
        params.push(gender);
      } else {
        query += ' WHERE 1=0';
      }
    }

    const [hostels] = await pool.query(query, params);
    res.json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};

const getHostelById = async (req, res, next) => {
  try {
    const hostelId = req.params.id;
    const [hostels] = await pool.query('SELECT * FROM HOSTEL WHERE hostel_id = ?', [hostelId]);
    if (hostels.length === 0) return next({ statusCode: 404, message: 'Hostel not found' });
    
    if (req.user.role === 'STUDENT') {
      const gender = await getStudentGender(req.user.user_id);
      if (gender !== hostels[0].gender) return next({ statusCode: 403, message: 'Cannot access restricted hostel' });
    }
    
    res.json({ success: true, data: hostels[0] });
  } catch (error) {
    next(error);
  }
};

const createHostel = async (req, res, next) => {
  try {
    const { name, gender, location, hostel_type, total_capacity, warden_id } = req.body;
    
    if (gender === 'MALE' && !name.startsWith('MH-')) return next({ statusCode: 400, message: "Boys' hostel name must start with MH-" });
    if (gender === 'FEMALE' && !name.startsWith('LH-')) return next({ statusCode: 400, message: "Girls' hostel name must start with LH-" });
    
    // Ensure warden_id exists if provided
    if (warden_id) {
      const [wardens] = await pool.query('SELECT warden_id FROM WARDEN WHERE warden_id = ?', [warden_id]);
      if (wardens.length === 0) {
        const err = new Error('Warden not found');
        err.statusCode = 400;
        return next(err);
      }
    }

    const [result] = await pool.query(
      'INSERT INTO HOSTEL (name, gender, location, hostel_type, total_capacity, warden_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, gender, location, hostel_type, total_capacity, warden_id || null]
    );

    res.status(201).json({ success: true, data: { hostel_id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

const updateHostel = async (req, res, next) => {
  try {
    const hostelId = req.params.id;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, message: 'No changes provided' });
    }

    if (updates.name !== undefined || updates.gender !== undefined) {
      const [currentHostel] = await pool.query('SELECT name, gender FROM HOSTEL WHERE hostel_id = ?', [hostelId]);
      if (currentHostel.length === 0) return next({ statusCode: 404, message: 'Hostel not found' });
      
      const finalName = updates.name !== undefined ? updates.name : currentHostel[0].name;
      const finalGender = updates.gender !== undefined ? updates.gender : currentHostel[0].gender;

      if (finalGender === 'MALE' && !finalName.startsWith('MH-')) return next({ statusCode: 400, message: "Boys' hostel name must start with MH-" });
      if (finalGender === 'FEMALE' && !finalName.startsWith('LH-')) return next({ statusCode: 400, message: "Girls' hostel name must start with LH-" });
    }

    if (updates.warden_id) {
      const [wardens] = await pool.query('SELECT warden_id FROM WARDEN WHERE warden_id = ?', [updates.warden_id]);
      if (wardens.length === 0) {
        const err = new Error('Warden not found');
        err.statusCode = 400;
        return next(err);
      }
    }

    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(hostelId);

    const [result] = await pool.query(`UPDATE HOSTEL SET ${setClause} WHERE hostel_id = ?`, values);
    
    if (result.affectedRows === 0) {
      const err = new Error('Hostel not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, message: 'Hostel updated successfully' });
  } catch (error) {
    next(error);
  }
};


// --- Room Types ---
const getRoomTypes = async (req, res, next) => {
  try {
    const [types] = await pool.query('SELECT * FROM ROOM_TYPE');
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
};

const createRoomType = async (req, res, next) => {
  try {
    const { type_name, capacity, has_ac, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO ROOM_TYPE (type_name, capacity, has_ac, description) VALUES (?, ?, ?, ?)',
      [type_name, capacity, has_ac, description]
    );
    res.status(201).json({ success: true, data: { room_type_id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

// --- Rooms ---
const getRooms = async (req, res, next) => {
  try {
    const { hostel_id } = req.query;
    
    let query = `
      SELECT r.*,
             COALESCE(a.active_count, 0) as calculated_occupied_beds,
             (r.capacity - COALESCE(a.active_count, 0)) as available_capacity,
             h.gender as hostel_gender
      FROM ROOM r
      JOIN HOSTEL h ON r.hostel_id = h.hostel_id
      LEFT JOIN (
        SELECT room_id, COUNT(*) as active_count
        FROM ALLOCATION
        WHERE status IN ('CONFIRMED', 'LOCKED')
        GROUP BY room_id
      ) a ON r.room_id = a.room_id
      WHERE 1=1
    `;
    const params = [];

    if (hostel_id) {
      query += ` AND r.hostel_id = ?`;
      params.push(hostel_id);
    }

    if (req.user.role === 'STUDENT') {
      const gender = await getStudentGender(req.user.user_id);
      if (gender === 'MALE' || gender === 'FEMALE') {
        query += ` AND h.gender = ?`;
        params.push(gender);
      } else {
        query += ` AND 1=0`;
      }
    } else if (req.user.role === 'WARDEN') {
      const [wardens] = await pool.query('SELECT hostel_id FROM WARDEN WHERE warden_id = ?', [req.user.user_id]);
      if (wardens[0] && wardens[0].hostel_id) {
        query += ` AND r.hostel_id = ?`;
        params.push(wardens[0].hostel_id);
      }
    }

    const [rooms] = await pool.query(query, params);

    // Map `calculated_occupied_beds` dynamically and correctly represent availability
    const enrichedRooms = rooms.map(r => ({
      ...r,
      // Note: we trust the active allocations over `occupied_beds` per the requirement
      is_available: r.status === 'AVAILABLE' || (r.status === 'PARTIALLY_FILLED' && r.available_capacity > 0)
    }));

    res.json({ success: true, data: enrichedRooms });
  } catch (error) {
    next(error);
  }
};

const getRoomById = async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const [rooms] = await pool.query(`
      SELECT r.*, h.gender as hostel_gender
      FROM ROOM r JOIN HOSTEL h ON r.hostel_id = h.hostel_id
      WHERE r.room_id = ?
    `, [roomId]);
    
    if (rooms.length === 0) return next({ statusCode: 404, message: 'Room not found' });
    
    if (req.user.role === 'STUDENT') {
      const gender = await getStudentGender(req.user.user_id);
      if (gender !== rooms[0].hostel_gender) return next({ statusCode: 403, message: 'Cannot access restricted room' });
    }
    
    res.json({ success: true, data: rooms[0] });
  } catch (error) {
    next(error);
  }
};

const createRoom = async (req, res, next) => {
  try {
    const { hostel_id, room_number, floor, room_type_id, capacity, status } = req.body;

    // Check hostel
    const [hostels] = await pool.query('SELECT hostel_id FROM HOSTEL WHERE hostel_id = ?', [hostel_id]);
    if (hostels.length === 0) {
      const err = new Error('Hostel not found');
      err.statusCode = 400;
      return next(err);
    }

    // Check room type
    const [roomTypes] = await pool.query('SELECT capacity FROM ROOM_TYPE WHERE room_type_id = ?', [room_type_id]);
    if (roomTypes.length === 0) {
      const err = new Error('Room type not found');
      err.statusCode = 400;
      return next(err);
    }

    if (capacity !== roomTypes[0].capacity) {
      const err = new Error('Room capacity must match room type capacity');
      err.statusCode = 400;
      return next(err);
    }

    const [result] = await pool.query(
      'INSERT INTO ROOM (hostel_id, room_number, floor, room_type_id, capacity, status) VALUES (?, ?, ?, ?, ?, ?)',
      [hostel_id, room_number, floor, room_type_id, capacity, status || 'AVAILABLE']
    );

    res.status(201).json({ success: true, data: { room_id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

const updateRoom = async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const updates = req.body;

    // Verify ownership if warden
    if (req.user.role === 'WARDEN') {
      const [roomData] = await pool.query('SELECT hostel_id FROM ROOM WHERE room_id = ?', [roomId]);
      if (roomData.length === 0) return next({ statusCode: 404, message: 'Room not found' });
      
      const [wardenData] = await pool.query('SELECT hostel_id FROM WARDEN WHERE warden_id = ?', [req.user.user_id]);
      if (!wardenData[0] || wardenData[0].hostel_id !== roomData[0].hostel_id) {
        return next({ statusCode: 403, message: 'Forbidden: Warden does not manage this hostel' });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, message: 'No changes provided' });
    }

    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(roomId);

    const [result] = await pool.query(`UPDATE ROOM SET ${setClause} WHERE room_id = ?`, values);
    if (result.affectedRows === 0) {
      const err = new Error('Room not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, message: 'Room updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHostels,
  getHostelById,
  createHostel,
  updateHostel,
  getRoomTypes,
  createRoomType,
  getRooms,
  getRoomById,
  createRoom,
  updateRoom
};
