require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let adminToken, wardenToken, maleStudentToken, femaleStudentToken;
let wardenId, maleStudentId, femaleStudentId;
let adminId;
let maleHostelId, femaleHostelId, roomTypeId, maleRoomId, femaleRoomId;

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production', { expiresIn: '1h' });
};

beforeAll(async () => {
  // Clear inventory tables for test isolation
  await pool.query("DELETE FROM ROOM");
  await pool.query("DELETE FROM ROOM_TYPE");
  await pool.query("DELETE FROM HOSTEL");
  await pool.query("DELETE FROM USER WHERE email LIKE '%@invtest.com'");

  const hash = await bcrypt.hash('password123', 10);

  // Users
  // 1. Admin
  const [aRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin@invtest.com', hash, 'ADMIN']);
  adminId = aRes.insertId;
  await pool.query('INSERT INTO ADMIN (admin_id, employee_id) VALUES (?, ?)', [adminId, 'ADM_INV']);
  adminToken = generateToken({ user_id: adminId, role: 'ADMIN', email: 'admin@invtest.com' });

  // 2. Warden
  const [wRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Warden', 'warden@invtest.com', hash, 'WARDEN']);
  wardenId = wRes.insertId;
  await pool.query('INSERT INTO WARDEN (warden_id, employee_id) VALUES (?, ?)', [wardenId, 'WRD_INV']);
  wardenToken = generateToken({ user_id: wardenId, role: 'WARDEN', email: 'warden@invtest.com' });

  // 3. Male Student
  const [msRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Male Student', 'male@invtest.com', hash, 'STUDENT']);
  maleStudentId = msRes.insertId;
  await pool.query('INSERT INTO STUDENT (student_id, reg_no, gender) VALUES (?, ?, ?)', [maleStudentId, 'MS_INV', 'MALE']);
  maleStudentToken = generateToken({ user_id: maleStudentId, role: 'STUDENT', email: 'male@invtest.com' });

  // 4. Female Student
  const [fsRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Female Student', 'female@invtest.com', hash, 'STUDENT']);
  femaleStudentId = fsRes.insertId;
  await pool.query('INSERT INTO STUDENT (student_id, reg_no, gender) VALUES (?, ?, ?)', [femaleStudentId, 'FS_INV', 'FEMALE']);
  femaleStudentToken = generateToken({ user_id: femaleStudentId, role: 'STUDENT', email: 'female@invtest.com' });
});

afterAll(async () => {
  // Clean up
  await pool.query("DELETE FROM ALLOCATION");
  await pool.query("DELETE FROM COUNSELLING_SLOT");
  await pool.query("DELETE FROM COUNSELLING_SESSION");
  await pool.query("DELETE FROM ROOM");
  await pool.query("DELETE FROM ROOM_TYPE");
  await pool.query("DELETE FROM HOSTEL");
  await pool.query("DELETE FROM USER WHERE email LIKE '%@invtest.com'");
  await pool.end();
});

describe('Inventory APIs', () => {
  describe('Hostels & Room Types (Admin)', () => {
    it('Admin can create hostels', async () => {
      let res = await request(app).post('/api/inventory/hostels')
        .set('Cookie', [`token=${adminToken}`])
        .send({ name: 'Male Hostel A', gender: 'MALE', total_capacity: 100, warden_id: wardenId });
      expect(res.statusCode).toBe(201);
      maleHostelId = res.body.data.hostel_id;

      // Update Warden's assigned hostel
      await pool.query('UPDATE WARDEN SET hostel_id = ? WHERE warden_id = ?', [maleHostelId, wardenId]);

      res = await request(app).post('/api/inventory/hostels')
        .set('Cookie', [`token=${adminToken}`])
        .send({ name: 'Female Hostel B', gender: 'FEMALE', total_capacity: 100 });
      expect(res.statusCode).toBe(201);
      femaleHostelId = res.body.data.hostel_id;
    });

    it('Student cannot create hostels', async () => {
      const res = await request(app).post('/api/inventory/hostels')
        .set('Cookie', [`token=${maleStudentToken}`])
        .send({ name: 'Hacked Hostel', gender: 'MALE', total_capacity: 50 });
      expect(res.statusCode).toBe(403);
    });

    it('Admin can create room types', async () => {
      const res = await request(app).post('/api/inventory/room-types')
        .set('Cookie', [`token=${adminToken}`])
        .send({ type_name: 'Double Non-AC', capacity: 2 });
      expect(res.statusCode).toBe(201);
      roomTypeId = res.body.data.room_type_id;
    });
  });

  describe('Gender and Role Eligibility (GET)', () => {
    it('Male student only sees male hostels', async () => {
      const res = await request(app).get('/api/inventory/hostels').set('Cookie', [`token=${maleStudentToken}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].gender).toBe('MALE');
    });

    it('Female student only sees female hostels', async () => {
      const res = await request(app).get('/api/inventory/hostels').set('Cookie', [`token=${femaleStudentToken}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].gender).toBe('FEMALE');
    });

    it('Admin sees all hostels', async () => {
      const res = await request(app).get('/api/inventory/hostels').set('Cookie', [`token=${adminToken}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Rooms (Creation and Validation)', () => {
    it('Fails to create room if capacity does not match room type', async () => {
      const res = await request(app).post('/api/inventory/rooms')
        .set('Cookie', [`token=${adminToken}`])
        .send({ hostel_id: maleHostelId, room_number: '101', floor: 1, room_type_id: roomTypeId, capacity: 3 }); // Room type has capacity 2
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/Room capacity must match/i);
    });

    it('Fails to create room with missing hostel', async () => {
      const res = await request(app).post('/api/inventory/rooms')
        .set('Cookie', [`token=${adminToken}`])
        .send({ hostel_id: 99999, room_number: '102', floor: 1, room_type_id: roomTypeId, capacity: 2 });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/Hostel not found/i);
    });

    it('Admin creates rooms successfully', async () => {
      let res = await request(app).post('/api/inventory/rooms')
        .set('Cookie', [`token=${adminToken}`])
        .send({ hostel_id: maleHostelId, room_number: 'M101', floor: 1, room_type_id: roomTypeId, capacity: 2 });
      expect(res.statusCode).toBe(201);
      maleRoomId = res.body.data.room_id;

      res = await request(app).post('/api/inventory/rooms')
        .set('Cookie', [`token=${adminToken}`])
        .send({ hostel_id: femaleHostelId, room_number: 'F101', floor: 1, room_type_id: roomTypeId, capacity: 2 });
      expect(res.statusCode).toBe(201);
      femaleRoomId = res.body.data.room_id;
    });

    it('Warden can update a room in their own hostel', async () => {
      const res = await request(app).put(`/api/inventory/rooms/${maleRoomId}`)
        .set('Cookie', [`token=${wardenToken}`])
        .send({ status: 'MAINTENANCE' });
      expect(res.statusCode).toBe(200);
    });

    it('Warden cannot update a room in another hostel', async () => {
      const res = await request(app).put(`/api/inventory/rooms/${femaleRoomId}`)
        .set('Cookie', [`token=${wardenToken}`])
        .send({ status: 'MAINTENANCE' });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Availability Calculations', () => {
    beforeAll(async () => {
      // Revert male room to available
      await request(app).put(`/api/inventory/rooms/${maleRoomId}`)
        .set('Cookie', [`token=${adminToken}`])
        .send({ status: 'AVAILABLE' });

      // Add a dummy session & slot to attach an allocation to
      const [sesRes] = await pool.query('INSERT INTO COUNSELLING_SESSION (academic_year, start_date, end_date, slot_duration_minutes) VALUES (?, NOW(), NOW(), 10)', ['2026-2027']);
      const sessionId = sesRes.insertId;
      const [slotRes] = await pool.query('INSERT INTO COUNSELLING_SLOT (session_id, student_id, start_time, end_time) VALUES (?, ?, NOW(), NOW())', [sessionId, maleStudentId]);
      const slotId = slotRes.insertId;

      // Add a CONFIRMED allocation to maleRoomId
      await pool.query('INSERT INTO ALLOCATION (student_id, slot_id, room_id, allocation_type, status) VALUES (?, ?, ?, ?, ?)', 
        [maleStudentId, slotId, maleRoomId, 'SELF', 'CONFIRMED']);
      
      // Add a CANCELLED allocation (should not affect count)
      await pool.query('INSERT INTO ALLOCATION (student_id, slot_id, room_id, allocation_type, status) VALUES (?, ?, ?, ?, ?)', 
        [maleStudentId, slotId, maleRoomId, 'SELF', 'CANCELLED']);
    });

    it('Calculates occupied capacity from active allocations only', async () => {
      const res = await request(app).get('/api/inventory/rooms')
        .set('Cookie', [`token=${adminToken}`])
        .query({ hostel_id: maleHostelId });
      
      expect(res.statusCode).toBe(200);
      const room = res.body.data.find(r => r.room_id === maleRoomId);
      expect(room).toBeDefined();
      expect(room.calculated_occupied_beds).toBe(1); // 1 Confirmed, 1 Cancelled
      expect(room.capacity).toBe(2);
      expect(room.available_capacity).toBe(1);
      expect(room.is_available).toBe(true);
    });
  });
});
