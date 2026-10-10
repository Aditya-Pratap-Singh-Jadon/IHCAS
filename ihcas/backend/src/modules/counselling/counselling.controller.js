const pool = require('../../config/db');

// --- Helper: Expire Slot if timed out ---
const checkAndExpireSlot = async (slotId, connection = pool) => {
  // Global cleanup: passively expire any active slots that have timed out
  await connection.query(
    "UPDATE COUNSELLING_SLOT SET status = 'PENDING', is_active = FALSE WHERE status = 'ACTIVE' AND end_time < NOW()"
  );

  const [slots] = await connection.query('SELECT status, end_time FROM COUNSELLING_SLOT WHERE slot_id = ?', [slotId]);
  if (slots.length > 0) {
    const slot = slots[0];
    if (slot.status === 'ACTIVE' && new Date() > new Date(slot.end_time)) {
      return true; // it should have been expired by the global cleanup above, but return true just in case
    }
  }
  return false;
};

// --- Admin: Create Session ---
const createSession = async (req, res, next) => {
  try {
    const { academic_year, start_date, end_date, slot_duration_minutes, status } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO COUNSELLING_SESSION (academic_year, start_date, end_date, slot_duration_minutes, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [academic_year, new Date(start_date), new Date(end_date), slot_duration_minutes, status, req.user.user_id]
    );

    res.status(201).json({ success: true, data: { session_id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

// --- Admin: Generate Slots ---
const generateSlots = async (req, res, next) => {
  const sessionId = req.params.id;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [sessions] = await connection.query('SELECT * FROM COUNSELLING_SESSION WHERE session_id = ? FOR UPDATE', [sessionId]);
    if (sessions.length === 0) throw new Error('Session not found');
    const session = sessions[0];

    // Get all students without a CONFIRMED or LOCKED allocation
    const [students] = await connection.query(`
      SELECT s.student_id 
      FROM STUDENT s
      LEFT JOIN ALLOCATION a ON s.student_id = a.student_id AND a.status IN ('CONFIRMED', 'LOCKED')
      WHERE a.allocation_id IS NULL
      ORDER BY s.academic_rank ASC, s.cgpa DESC, s.student_id ASC
    `);

    // Check existing slots to prevent duplicates
    const [existing] = await connection.query('SELECT student_id FROM COUNSELLING_SLOT WHERE session_id = ?', [sessionId]);
    const existingIds = new Set(existing.map(e => e.student_id));

    let currentTime = new Date(session.start_date);
    const duration = session.slot_duration_minutes * 60000;
    
    let generatedCount = 0;

    for (const student of students) {
      if (!existingIds.has(student.student_id)) {
        const endTime = new Date(currentTime.getTime() + duration);
        
        await connection.query(
          'INSERT INTO COUNSELLING_SLOT (session_id, student_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
          [sessionId, student.student_id, currentTime, endTime, 'PENDING']
        );
        
        currentTime = endTime;
        generatedCount++;
      }
    }

    await connection.commit();
    res.json({ success: true, message: `Generated ${generatedCount} slots.` });
  } catch (error) {
    await connection.rollback();
    error.statusCode = 400;
    next(error);
  } finally {
    connection.release();
  }
};

// --- Student: Get Status ---
const getStatus = async (req, res, next) => {
  const studentId = req.user.user_id;

  try {
    // 1. Get the student's slot
    const [slots] = await pool.query(`
      SELECT cs.*, s.academic_rank, s.cgpa 
      FROM COUNSELLING_SLOT cs 
      JOIN STUDENT s ON cs.student_id = s.student_id
      WHERE cs.student_id = ?
    `, [studentId]);

    if (slots.length === 0) {
      return res.json({ success: true, data: { has_slot: false } });
    }

    let slot = slots[0];

    // 2. Server-side expiry check
    if (slot.status === 'ACTIVE' && new Date() > new Date(slot.end_time)) {
      await checkAndExpireSlot(slot.slot_id);
      slot.status = 'PENDING';
      slot.is_active = 0;
    }

    // 3. Calculate queue position if PENDING
    let queuePosition = null;
    if (slot.status === 'PENDING') {
      const [posRes] = await pool.query(`
        SELECT COUNT(*) as pos
        FROM COUNSELLING_SLOT cs
        JOIN STUDENT s ON cs.student_id = s.student_id
        WHERE cs.session_id = ? AND cs.status = 'PENDING'
        AND (
          s.academic_rank < ? OR 
          (s.academic_rank = ? AND s.cgpa > ?) OR
          (s.academic_rank = ? AND s.cgpa = ? AND s.student_id < ?)
        )
      `, [slot.session_id, slot.academic_rank, slot.academic_rank, slot.cgpa, slot.academic_rank, slot.cgpa, slot.student_id]);
      queuePosition = posRes[0].pos + 1;
    }

    res.json({
      success: true,
      data: {
        has_slot: true,
        slot_id: slot.slot_id,
        session_id: slot.session_id,
        status: slot.status,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: !!slot.is_active,
        queue_position: queuePosition
      }
    });
  } catch (error) {
    next(error);
  }
};

// --- Student: Activate Slot ---
const activateSlot = async (req, res, next) => {
  const studentId = req.user.user_id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the slot row
    const [slots] = await connection.query(`
      SELECT cs.*, s.academic_rank, s.cgpa 
      FROM COUNSELLING_SLOT cs 
      JOIN STUDENT s ON cs.student_id = s.student_id
      WHERE cs.student_id = ? FOR UPDATE
    `, [studentId]);

    if (slots.length === 0) throw new Error('No counselling slot found');
    let slot = slots[0];

    // Enforce expiry if already active
    if (slot.status === 'ACTIVE' && new Date() > new Date(slot.end_time)) {
      await checkAndExpireSlot(slot.slot_id, connection);
      slot.status = 'PENDING';
    }

    if (slot.status !== 'PENDING') {
      throw new Error(`Cannot activate slot with status: ${slot.status}`);
    }

    // Check if eligible to activate (scheduled time arrived OR at front of queue)
    const isScheduled = new Date() >= new Date(slot.start_time);
    
    // Check queue position
    const [posRes] = await connection.query(`
      SELECT COUNT(*) as pos
      FROM COUNSELLING_SLOT cs
      JOIN STUDENT s ON cs.student_id = s.student_id
      WHERE cs.session_id = ? AND cs.status = 'PENDING'
      AND (
        s.academic_rank < ? OR 
        (s.academic_rank = ? AND s.cgpa > ?) OR
        (s.academic_rank = ? AND s.cgpa = ? AND s.student_id < ?)
      )
    `, [slot.session_id, slot.academic_rank, slot.academic_rank, slot.cgpa, slot.academic_rank, slot.cgpa, slot.student_id]);
    
    const isFrontOfQueue = posRes[0].pos === 0;

    if (!isScheduled && !isFrontOfQueue) {
      const err = new Error('Not eligible to activate yet. Wait for your scheduled time or turn.');
      err.statusCode = 403;
      throw err;
    }

    // Prevent duplicate active sessions for the same student (student_id is UNIQUE in schema, so they only have one slot. 
    // We just checked it's PENDING, so it cannot be a duplicate active).

    // Start fresh 3 minute session
    const [sessions] = await connection.query('SELECT slot_duration_minutes FROM COUNSELLING_SESSION WHERE session_id = ?', [slot.session_id]);
    const duration = (sessions[0]?.slot_duration_minutes || 3) * 60000;
    
    const newStart = new Date();
    const newEnd = new Date(newStart.getTime() + duration);

    await connection.query(`
      UPDATE COUNSELLING_SLOT 
      SET status = 'ACTIVE', start_time = ?, end_time = ?, is_active = TRUE
      WHERE slot_id = ?
    `, [newStart, newEnd, slot.slot_id]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Counselling session activated',
      data: {
        start_time: newStart,
        end_time: newEnd
      }
    });
  } catch (error) {
    await connection.rollback();
    if (!error.statusCode) error.statusCode = 400;
    next(error);
  } finally {
    connection.release();
  }
};

module.exports = {
  createSession,
  generateSlots,
  getStatus,
  activateSlot
};
