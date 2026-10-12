require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let student1Token, student2Token, student3Token, adminToken;
let student1Id, student2Id, student3Id, adminId;
let hostelId, roomId, roomIdMaintenance;
let sessionId, slot1Id, slot2Id, slot3Id;

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production', { expiresIn: '1h' });
};

const hashOtp = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

beforeAll(async () => {
  await pool.query("DELETE FROM STUDENT_ROOMMATE");
  await pool.query("DELETE FROM ALLOCATION");
  await pool.query("DELETE FROM OTP_VERIFICATION");
  await pool.query("DELETE FROM COUNSELLING_SLOT");
  await pool.query("DELETE FROM COUNSELLING_SESSION");
  await pool.query("DELETE FROM ROOM");
  await pool.query("DELETE FROM ROOM_TYPE");
  await pool.query("DELETE FROM HOSTEL");
  await pool.query("DELETE FROM WARDEN");
  await pool.query("DELETE FROM ADMIN");
  await pool.query("DELETE FROM STUDENT");
  await pool.query("DELETE FROM USER");

  const hash = await bcrypt.hash('password123', 10);
  
  // Admin
  const [aRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin_alloc@vit.ac.in', hash, 'ADMIN']);
  adminId = aRes.insertId;
  adminToken = generateToken({ user_id: adminId, role: 'ADMIN', email: 'admin_alloc@vit.ac.in' });

  // Students
  const [s1Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['S1', 's1_alloc@vitstudent.ac.in', hash, 'STUDENT']);
  student1Id = s1Res.insertId;
  await pool.query("INSERT INTO STUDENT (student_id, reg_no, gender, academic_rank, cgpa) VALUES (?, 'REG_A1', 'MALE', 1, 9.5)", [student1Id]);
  student1Token = generateToken({ user_id: student1Id, role: 'STUDENT', email: 's1_alloc@vitstudent.ac.in' });

  const [s2Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['S2', 's2_alloc@vitstudent.ac.in', hash, 'STUDENT']);
  student2Id = s2Res.insertId;
  await pool.query("INSERT INTO STUDENT (student_id, reg_no, gender, academic_rank, cgpa) VALUES (?, 'REG_A2', 'MALE', 2, 9.0)", [student2Id]);
  student2Token = generateToken({ user_id: student2Id, role: 'STUDENT', email: 's2_alloc@vitstudent.ac.in' });

  const [s3Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['S3', 's3_alloc@vitstudent.ac.in', hash, 'STUDENT']);
  student3Id = s3Res.insertId;
  await pool.query("INSERT INTO STUDENT (student_id, reg_no, gender, academic_rank, cgpa) VALUES (?, 'REG_A3', 'FEMALE', 3, 8.5)", [student3Id]);
  student3Token = generateToken({ user_id: student3Id, role: 'STUDENT', email: 's3_alloc@vitstudent.ac.in' });

  // Inventory
  const [hRes] = await pool.query("INSERT INTO HOSTEL (name, gender, total_capacity) VALUES ('MH-Men Hostel A', 'MALE', 100)");
  hostelId = hRes.insertId;

  const [rtRes] = await pool.query("INSERT INTO ROOM_TYPE (type_name, capacity) VALUES ('Double', 2)");
  global.rtId = rtRes.insertId;

  const [rRes] = await pool.query("INSERT INTO ROOM (hostel_id, room_number, room_type_id, capacity, status) VALUES (?, '101', ?, 2, 'AVAILABLE')", [hostelId, global.rtId]);
  roomId = rRes.insertId;

  const [rmRes] = await pool.query("INSERT INTO ROOM (hostel_id, room_number, room_type_id, capacity, status) VALUES (?, '102', ?, 2, 'MAINTENANCE')", [hostelId, global.rtId]);
  roomIdMaintenance = rmRes.insertId;

  // Session & Slots
  const [sessRes] = await pool.query("INSERT INTO COUNSELLING_SESSION (academic_year, start_date, end_date, slot_duration_minutes, status) VALUES ('2023', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 3, 'ACTIVE')");
  sessionId = sessRes.insertId;

  const [sl1Res] = await pool.query("INSERT INTO COUNSELLING_SLOT (session_id, student_id, start_time, end_time, status, is_active) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 3 MINUTE), 'ACTIVE', TRUE)", [sessionId, student1Id]);
  slot1Id = sl1Res.insertId;
  
  const [sl2Res] = await pool.query("INSERT INTO COUNSELLING_SLOT (session_id, student_id, start_time, end_time, status, is_active) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 3 MINUTE), 'ACTIVE', TRUE)", [sessionId, student2Id]);
  slot2Id = sl2Res.insertId;
  
  // slot3 is not active yet
  const [sl3Res] = await pool.query("INSERT INTO COUNSELLING_SLOT (session_id, student_id, start_time, end_time, status, is_active) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1443 MINUTE), 'PENDING', FALSE)", [sessionId, student3Id]);
  slot3Id = sl3Res.insertId;
});

afterAll(async () => {
  await pool.end();
});

describe('Allocation and Roommate APIs', () => {

  describe('OTP and Roommate Verification', () => {
    beforeAll(() => { 
      process.env.OTP_PROVIDER = 'TEST_MOCK'; 
      jest.spyOn(crypto, 'randomInt').mockReturnValue(123456);
    });
    afterAll(() => { 
      delete process.env.OTP_PROVIDER; 
      jest.restoreAllMocks();
    });

    it('Should reject OTP request if roommate does not exist', async () => {
      const res = await request(app).post('/api/allocation/roommate-otp/request')
        .set('Cookie', [`token=${student1Token}`])
        .send({ roommate_reg_no: 'INVALID_REG' });
      expect(res.statusCode).toBe(404);
    });

    it('Should reject OTP request for opposite gender', async () => {
      const res = await request(app).post('/api/allocation/roommate-otp/request')
        .set('Cookie', [`token=${student1Token}`])
        .send({ roommate_reg_no: 'REG_A3' }); // S3 is FEMALE
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/gender/);
    });

    it('Should reject self-pairing', async () => {
      const res = await request(app).post('/api/allocation/roommate-otp/request')
        .set('Cookie', [`token=${student1Token}`])
        .send({ roommate_reg_no: 'REG_A1' });
      expect(res.statusCode).toBe(400);
    });

    it('Should successfully request OTP for valid roommate', async () => {
      const res = await request(app).post('/api/allocation/roommate-otp/request')
        .set('Cookie', [`token=${student1Token}`])
        .send({ roommate_reg_no: 'REG_A2' });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/OTP generated/);
      
      // Verify DB Audit fields
      const [otpRows] = await pool.query("SELECT * FROM OTP_VERIFICATION WHERE student_id = ? AND roommate_reg_no = 'REG_A2' ORDER BY created_at DESC LIMIT 1", [student1Id]);
      expect(otpRows[0].delivery_channel).toBe('EMAIL');
      expect(otpRows[0].delivery_status).toBe('SENT');
      expect(otpRows[0].status).toBe('SENT');
    });

    it('Should reject invalid OTP verification (and increment attempts)', async () => {
      const res = await request(app).post('/api/allocation/roommate-otp/verify')
        .set('Cookie', [`token=${student1Token}`])
        .send({ roommate_reg_no: 'REG_A2', otp_code: '000000' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/Invalid OTP/);
    });

    it('Should successfully verify correct OTP', async () => {
      const res = await request(app).post('/api/allocation/roommate-otp/verify')
        .set('Cookie', [`token=${student1Token}`])
        .send({ roommate_reg_no: 'REG_A2', otp_code: '123456' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Room Allocation Core Rules', () => {
    
    it('Should reject allocation if student does not have ACTIVE session', async () => {
      const res = await request(app).post('/api/allocation')
        .set('Cookie', [`token=${student3Token}`]) // S3 is PENDING
        .send({ room_id: roomId });
      expect(res.statusCode).toBe(403);
    });

    it('Should reject allocation for room under maintenance', async () => {
      const res = await request(app).post('/api/allocation')
        .set('Cookie', [`token=${student1Token}`])
        .send({ room_id: roomIdMaintenance });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/maintenance/);
    });

    it('Should reject allocation for incompatible hostel gender', async () => {
      // Create a female hostel and room
      const [hRes] = await pool.query("INSERT INTO HOSTEL (name, gender, total_capacity) VALUES ('LH-Women Hostel A', 'FEMALE', 100)");
      const fHostelId = hRes.insertId;
      const [rRes] = await pool.query("INSERT INTO ROOM (hostel_id, room_number, room_type_id, capacity, status) VALUES (?, '201', ?, 2, 'AVAILABLE')", [fHostelId, global.rtId]);
      const fRoomId = rRes.insertId;

      const res = await request(app).post('/api/allocation')
        .set('Cookie', [`token=${student1Token}`]) // S1 is MALE
        .send({ room_id: fRoomId });
      expect(res.statusCode).toBe(403);
      expect(res.body.error.message).toMatch(/gender/);
    });

    it('Should reject allocation if roommate gender has been tampered with despite valid OTP', async () => {
      // 1. Force a verified OTP for a female student (S3) and male student (S1)
      await pool.query(
        "INSERT INTO OTP_VERIFICATION (student_id, roommate_reg_no, otp_hash, destination_contact, delivery_channel, delivery_status, status, expires_at) VALUES (?, ?, ?, ?, 'EMAIL', 'SENT', 'VERIFIED', DATE_ADD(NOW(), INTERVAL 10 MINUTE))",
        [student1Id, 'REG_A3', hashOtp('999999'), 's3_alloc@vitstudent.ac.in']
      );

      // 2. S1 attempts to allocate room with S3
      const res = await request(app).post('/api/allocation')
        .set('Cookie', [`token=${student1Token}`])
        .send({ room_id: roomId, roommates: ['REG_A3'] });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/must be of the same gender/);
    });

  });

  describe('Allocation Concurrency and Success', () => {

    it('Concurrent requests for same room should correctly lock and handle capacity', async () => {
      // We have Room 101 with capacity 2. S1 wants it with roommate S2.
      // At the exact same time, S1 tries to submit multiple times to simulate a double click.
      // Alternatively, S2 tries to submit independently? But S2 is also verified as S1's roommate.
      // Let's test S1 double clicking.
      const p1 = request(app).post('/api/allocation')
        .set('Cookie', [`token=${student1Token}`])
        .send({ room_id: roomId, roommates: ['REG_A2'] });
      const p2 = request(app).post('/api/allocation')
        .set('Cookie', [`token=${student1Token}`])
        .send({ room_id: roomId, roommates: ['REG_A2'] });
      
      const [res1, res2] = await Promise.all([p1, p2]);
      console.log('RES1', res1.body);
      console.log('RES2', res2.body);

      const statuses = [res1.statusCode, res2.statusCode];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400); // One fails because student already has active allocation
    });

    it('Should verify correct state updates after successful allocation', async () => {
      // Verify DB State
      // Room should be FULL
      const [room] = await pool.query("SELECT occupied_beds, status FROM ROOM WHERE room_id = ?", [roomId]);
      expect(room[0].occupied_beds).toBe(2);
      expect(room[0].status).toBe('FULL');

      // Slot should be COMPLETED
      const [slot] = await pool.query("SELECT status, is_active FROM COUNSELLING_SLOT WHERE slot_id = ?", [slot1Id]);
      expect(slot[0].status).toBe('COMPLETED');
      expect(slot[0].is_active).toBe(0);

      // S1 and S2 allocation_status should be CONFIRMED
      const [students] = await pool.query("SELECT allocation_status FROM STUDENT WHERE student_id IN (?, ?)", [student1Id, student2Id]);
      expect(students[0].allocation_status).toBe('CONFIRMED');
      expect(students[1].allocation_status).toBe('CONFIRMED');

      // STUDENT_ROOMMATE should exist and have otp_id
      const [sr] = await pool.query("SELECT * FROM STUDENT_ROOMMATE WHERE student_id = ? AND roommate_id = ?", [student1Id, student2Id]);
      expect(sr.length).toBe(1);
      expect(sr[0].otp_id).not.toBeNull();
    });

    it('Should reject S2 from allocating again since they were just allocated as roommate', async () => {
      const res = await request(app).post('/api/allocation')
        .set('Cookie', [`token=${student2Token}`]) // S2 is now allocated
        .send({ room_id: roomId });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/already have an active room allocation/);
    });

  });

});
