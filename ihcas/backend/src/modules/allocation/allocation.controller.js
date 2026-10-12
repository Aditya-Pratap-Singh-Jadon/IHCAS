const pool = require('../../config/db');
const crypto = require('crypto');
const otpService = require('../../services/otp.service');

const hashOtp = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

const requestOtp = async (req, res, next) => {
  try {
    const { roommate_reg_no } = req.body;
    const studentId = req.user.user_id;

    // Get primary student details
    const [primaryRes] = await pool.query('SELECT gender FROM STUDENT WHERE student_id = ?', [studentId]);
    if (primaryRes.length === 0) return res.status(404).json({ error: { message: 'Student not found' } });
    const primaryGender = primaryRes[0].gender;

    // Validate target student
    const [targetRes] = await pool.query(`
      SELECT s.student_id, s.gender, s.allocation_status, u.email 
      FROM STUDENT s JOIN USER u ON s.student_id = u.user_id 
      WHERE s.reg_no = ?`, [roommate_reg_no]
    );
    if (targetRes.length === 0) {
      return res.status(404).json({ error: { message: 'Roommate not found' } });
    }

    const target = targetRes[0];
    if (target.student_id === studentId) {
      return res.status(400).json({ error: { message: 'Cannot add yourself as a roommate' } });
    }
    if (target.gender !== primaryGender) {
      return res.status(400).json({ error: { message: 'Roommate must be of the same gender' } });
    }
    if (['CONFIRMED', 'LOCKED'].includes(target.allocation_status)) {
      return res.status(400).json({ error: { message: 'Roommate already has an active allocation' } });
    }

    // Generate secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashOtp(otpCode);
    
    // Calculate expiry
    const expiryMinutes = 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60000);

    // Initial persistence as PENDING
    const [insertRes] = await pool.query(
      `INSERT INTO OTP_VERIFICATION 
      (student_id, roommate_reg_no, otp_hash, destination_contact, delivery_channel, delivery_status, status, expires_at) 
      VALUES (?, ?, ?, ?, 'EMAIL', 'PENDING', 'PENDING', ?)`,
      [studentId, roommate_reg_no, otpHash, target.email, expiresAt]
    );
    const otpId = insertRes.insertId;

    // Attempt delivery
    const deliveryResult = await otpService.sendEmailOTP(target.email, otpCode);
    
    if (deliveryResult.success) {
      await pool.query(
        "UPDATE OTP_VERIFICATION SET delivery_status = 'SENT', status = 'SENT' WHERE otp_id = ?",
        [otpId]
      );
      // Mask email for response
      const maskedEmail = target.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => {
        return gp2 + '*'.repeat(gp3.length);
      });
      return res.status(200).json({ success: true, message: `OTP generated and sent to roommate at ${maskedEmail}` });
    } else {
      await pool.query(
        "UPDATE OTP_VERIFICATION SET delivery_status = 'FAILED', status = 'FAILED' WHERE otp_id = ?",
        [otpId]
      );
      return res.status(500).json({ error: { message: 'Failed to deliver OTP to roommate. Please try again later.' } });
    }
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { roommate_reg_no, otp_code } = req.body;
    const studentId = req.user.user_id;

    // Get latest SENT or PENDING OTP
    const [otpRes] = await pool.query(
      `SELECT otp_id, otp_hash, expires_at, attempts 
       FROM OTP_VERIFICATION 
       WHERE student_id = ? AND roommate_reg_no = ? AND status IN ('PENDING', 'SENT') 
       ORDER BY created_at DESC LIMIT 1`,
      [studentId, roommate_reg_no]
    );

    if (otpRes.length === 0) {
      return res.status(400).json({ error: { message: 'No pending OTP found for this roommate' } });
    }

    const otpRecord = otpRes[0];
    
    if (new Date() > new Date(otpRecord.expires_at)) {
      await pool.query("UPDATE OTP_VERIFICATION SET status = 'EXPIRED' WHERE otp_id = ?", [otpRecord.otp_id]);
      return res.status(400).json({ error: { message: 'OTP has expired. Please request a new one.' } });
    }

    if (otpRecord.attempts >= 3) {
      await pool.query("UPDATE OTP_VERIFICATION SET status = 'FAILED' WHERE otp_id = ?", [otpRecord.otp_id]);
      return res.status(400).json({ error: { message: 'Maximum attempts reached. Please request a new OTP.' } });
    }

    const inputHash = hashOtp(otp_code);
    if (otpRecord.otp_hash !== inputHash) {
      await pool.query("UPDATE OTP_VERIFICATION SET attempts = attempts + 1 WHERE otp_id = ?", [otpRecord.otp_id]);
      return res.status(400).json({ error: { message: 'Invalid OTP' } });
    }

    // Success
    await pool.query(
      "UPDATE OTP_VERIFICATION SET status = 'VERIFIED', verified_at = NOW() WHERE otp_id = ?",
      [otpRecord.otp_id]
    );

    res.status(200).json({ success: true, message: 'Roommate verified successfully' });
  } catch (error) {
    next(error);
  }
};

const allocateRoom = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { room_id, roommates = [] } = req.body;
    const studentId = req.user.user_id;

    await connection.beginTransaction();

    // 1. Lock student record to serialize requests and check allocation status
    const [primaryRes] = await connection.query(
      "SELECT gender, allocation_status FROM STUDENT WHERE student_id = ? FOR UPDATE",
      [studentId]
    );
    if (primaryRes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: { message: 'Student not found' } });
    }
    if (['CONFIRMED', 'LOCKED'].includes(primaryRes[0].allocation_status)) {
      await connection.rollback();
      return res.status(400).json({ error: { message: 'You already have an active room allocation' } });
    }
    const primaryGender = primaryRes[0].gender;

    // 2. Check active slot
    const [slotRes] = await connection.query(
      "SELECT slot_id, status, end_time FROM COUNSELLING_SLOT WHERE student_id = ? FOR UPDATE",
      [studentId]
    );
    if (slotRes.length === 0 || slotRes[0].status !== 'ACTIVE' || new Date() > new Date(slotRes[0].end_time)) {
      await connection.rollback();
      return res.status(403).json({ error: { message: 'You do not have an active, valid counselling session' } });
    }
    const slotId = slotRes[0].slot_id;

    // 3. Roommate validation
    const verifiedRoommates = [];
    if (roommates.length > 0) {
      for (const reg_no of roommates) {
        const [rmRes] = await connection.query(
          "SELECT student_id, gender, allocation_status FROM STUDENT WHERE reg_no = ? FOR UPDATE",
          [reg_no]
        );
        if (rmRes.length === 0) {
          await connection.rollback();
          return res.status(400).json({ error: { message: `Roommate ${reg_no} not found` } });
        }
        
        const rm = rmRes[0];
        if (['CONFIRMED', 'LOCKED'].includes(rm.allocation_status)) {
          await connection.rollback();
          return res.status(400).json({ error: { message: `Roommate ${reg_no} is already allocated` } });
        }
        
        if (rm.gender !== primaryGender) {
          await connection.rollback();
          return res.status(400).json({ error: { message: `Roommate ${reg_no} must be of the same gender` } });
        }

        // Check if verified and get otp_id
        const [otpRes] = await connection.query(
          "SELECT otp_id FROM OTP_VERIFICATION WHERE student_id = ? AND roommate_reg_no = ? AND status = 'VERIFIED'",
          [studentId, reg_no]
        );
        if (otpRes.length === 0) {
          await connection.rollback();
          return res.status(403).json({ error: { message: `Roommate ${reg_no} has not been verified` } });
        }
        verifiedRoommates.push({ student_id: rm.student_id, otp_id: otpRes[0].otp_id });
      }
      
      const uniqueIds = new Set(verifiedRoommates.map(r => r.student_id));
      if (uniqueIds.size !== verifiedRoommates.length) {
        await connection.rollback();
        return res.status(400).json({ error: { message: 'Duplicate roommates specified' } });
      }
    }

    // 4. Room Validation and Locking
    const [roomRes] = await connection.query(
      `SELECT r.*, h.gender as hostel_gender 
       FROM ROOM r JOIN HOSTEL h ON r.hostel_id = h.hostel_id 
       WHERE r.room_id = ? FOR UPDATE`,
      [room_id]
    );

    if (roomRes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: { message: 'Room not found' } });
    }
    const room = roomRes[0];
    if (room.status === 'MAINTENANCE') {
      await connection.rollback();
      return res.status(400).json({ error: { message: 'Room is currently under maintenance' } });
    }

    if (primaryGender !== room.hostel_gender) {
      await connection.rollback();
      return res.status(403).json({ error: { message: 'Room is in a hostel that does not match your gender' } });
    }

    // Recalculate Occupancy
    const [occRes] = await connection.query(
      "SELECT COUNT(*) as count FROM ALLOCATION WHERE room_id = ? AND status IN ('CONFIRMED', 'LOCKED')",
      [room_id]
    );
    const currentOccupancy = occRes[0].count;
    const requiredBeds = 1 + verifiedRoommates.length;

    if (currentOccupancy + requiredBeds > room.capacity) {
      await connection.rollback();
      return res.status(409).json({ error: { message: 'Not enough available beds in this room' } });
    }

    // 5. Execute Allocation
    const [allocRes2] = await connection.query(
      "INSERT INTO ALLOCATION (student_id, slot_id, room_id, allocation_type, status, confirmed_at) VALUES (?, ?, ?, 'SELF', 'CONFIRMED', NOW())",
      [studentId, slotId, room_id]
    );
    const primaryAllocationId = allocRes2.insertId;
    await connection.query("UPDATE STUDENT SET allocation_status = 'CONFIRMED' WHERE student_id = ?", [studentId]);

    // Allocate roommates and link OTP verification
    for (const rm of verifiedRoommates) {
      await connection.query(
        "INSERT INTO ALLOCATION (student_id, slot_id, room_id, allocation_type, status, confirmed_at) VALUES (?, NULL, ?, 'SELF', 'CONFIRMED', NOW())",
        [rm.student_id, room_id]
      );
      await connection.query(
        "INSERT INTO STUDENT_ROOMMATE (allocation_id, student_id, roommate_id, otp_id, is_verified, verified_at) VALUES (?, ?, ?, ?, TRUE, NOW())",
        [primaryAllocationId, studentId, rm.student_id, rm.otp_id]
      );
      await connection.query("UPDATE STUDENT SET allocation_status = 'CONFIRMED' WHERE student_id = ?", [rm.student_id]);
    }

    // Update Room
    const newOccupancy = currentOccupancy + requiredBeds;
    const newRoomStatus = (newOccupancy === room.capacity) ? 'FULL' : 'PARTIALLY_FILLED';
    await connection.query(
      "UPDATE ROOM SET occupied_beds = ?, status = ? WHERE room_id = ?",
      [newOccupancy, newRoomStatus, room_id]
    );

    // Update Slot
    await connection.query(
      "UPDATE COUNSELLING_SLOT SET status = 'COMPLETED', is_active = FALSE WHERE slot_id = ?",
      [slotId]
    );

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Room allocated successfully',
      data: {
        allocation_id: primaryAllocationId,
        room_id: room.room_id,
        room_number: room.room_number,
        hostel_id: room.hostel_id,
        status: 'CONFIRMED'
      }
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

module.exports = {
  requestOtp,
  verifyOtp,
  allocateRoom
};
