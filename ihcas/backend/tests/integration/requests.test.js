require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let adminToken, wardenToken, studentToken;
let adminId, wardenId, studentId;
let hostelId, roomId, allocationId;

const generateToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production', { expiresIn: '1h' });

beforeAll(async () => {
  // Clear tables
  await pool.query("DELETE FROM NOTIFICATION");
  await pool.query("DELETE FROM COMPLAINT");
  await pool.query("DELETE FROM MESS_CHANGE_REQUEST");
  await pool.query("DELETE FROM ROOM_CHANGE_REQUEST");
  await pool.query("DELETE FROM LEAVE_REQUEST");
  await pool.query("DELETE FROM ALLOCATION");
  await pool.query("DELETE FROM ROOM");
  await pool.query("DELETE FROM ROOM_TYPE");
  await pool.query("DELETE FROM HOSTEL");
  await pool.query("DELETE FROM USER WHERE email LIKE '%@vit.ac.in' OR email LIKE '%@vitstudent.ac.in'");

  const hash = await bcrypt.hash('password123', 10);

  // Users
  const [aRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin_req@vit.ac.in', hash, 'ADMIN']);
  adminId = aRes.insertId;
  adminToken = generateToken({ user_id: adminId, role: 'ADMIN', email: 'admin_req@vit.ac.in' });

  const [wRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Warden', 'warden_req@vit.ac.in', hash, 'WARDEN']);
  wardenId = wRes.insertId;
  wardenToken = generateToken({ user_id: wardenId, role: 'WARDEN', email: 'warden_req@vit.ac.in' });

  const [sRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Student', 'student_req@vitstudent.ac.in', hash, 'STUDENT']);
  studentId = sRes.insertId;
  await pool.query("INSERT INTO STUDENT (student_id, reg_no, gender, allocation_status) VALUES (?, ?, ?, 'CONFIRMED')", [studentId, 'REQ_ST', 'MALE']);
  studentToken = generateToken({ user_id: studentId, role: 'STUDENT', email: 'student_req@vitstudent.ac.in' });

  // Inventory
  const [hRes] = await pool.query("INSERT INTO HOSTEL (name, gender, total_capacity) VALUES ('MH-Req', 'MALE', 100)");
  hostelId = hRes.insertId;
  await pool.query("INSERT INTO WARDEN (warden_id, employee_id, hostel_id) VALUES (?, ?, ?)", [wardenId, 'EMP_W', hostelId]);

  const [rtRes] = await pool.query("INSERT INTO ROOM_TYPE (type_name, capacity) VALUES ('Single', 1)");
  const rtId = rtRes.insertId;

  const [rRes] = await pool.query("INSERT INTO ROOM (hostel_id, room_number, room_type_id, capacity, status) VALUES (?, '101', ?, 1, 'FULL')", [hostelId, rtId]);
  roomId = rRes.insertId;

  // New room for room change
  const [r2Res] = await pool.query("INSERT INTO ROOM (hostel_id, room_number, room_type_id, capacity, status) VALUES (?, '102', ?, 1, 'AVAILABLE')", [hostelId, rtId]);
  global.newRoomId = r2Res.insertId;

  const [alRes] = await pool.query(
    "INSERT INTO ALLOCATION (student_id, room_id, allocation_type, status, confirmed_at) VALUES (?, ?, 'SELF', 'CONFIRMED', NOW())",
    [studentId, roomId]
  );
  allocationId = alRes.insertId;
});

afterAll(async () => {
  await pool.end();
});

describe('Phase 7: Requests and Dashboard', () => {

  describe('Leave Requests', () => {
    let leaveId;
    it('Student can create a leave request', async () => {
      const res = await request(app).post('/api/requests/leave')
        .set('Cookie', [`token=${studentToken}`])
        .send({ start_date: '2026-12-01', end_date: '2026-12-05', reason: 'Going home' });
      expect(res.statusCode).toBe(201);
    });

    it('Student can get their leave requests', async () => {
      const res = await request(app).get('/api/requests/leave').set('Cookie', [`token=${studentToken}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      leaveId = res.body.data[0].leave_id;
    });

    it('Warden can review leave request', async () => {
      const res = await request(app).put(`/api/requests/leave/${leaveId}/review`)
        .set('Cookie', [`token=${wardenToken}`])
        .send({ status: 'APPROVED' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Room Change Requests', () => {
    let changeId;
    it('Student can create a room change request', async () => {
      const res = await request(app).post('/api/requests/room-change')
        .set('Cookie', [`token=${studentToken}`])
        .send({ requested_room_type: 'Single', reason: 'Too noisy' });
      expect(res.statusCode).toBe(201);
    });

    it('Warden can approve room change request', async () => {
      // Get ID
      const listRes = await request(app).get('/api/requests/room-change').set('Cookie', [`token=${wardenToken}`]);
      changeId = listRes.body.data[0].change_id;

      const res = await request(app).put(`/api/requests/room-change/${changeId}/review`)
        .set('Cookie', [`token=${wardenToken}`])
        .send({ status: 'APPROVED', new_room_id: global.newRoomId });
      expect(res.statusCode).toBe(200);

      // Verify allocation changed
      const [allocs] = await pool.query("SELECT room_id FROM ALLOCATION WHERE student_id = ? AND status = 'CONFIRMED'", [studentId]);
      expect(allocs[0].room_id).toBe(global.newRoomId);
    });
  });

  describe('Complaints & Notifications', () => {
    it('Student can create a complaint', async () => {
      const res = await request(app).post('/api/requests/complaints')
        .set('Cookie', [`token=${studentToken}`])
        .send({ category: 'Maintenance', description: 'Leaky faucet', priority: 'HIGH' });
      expect(res.statusCode).toBe(201);
    });

    it('Student receives notifications for approved requests', async () => {
      const res = await request(app).get('/api/notifications').set('Cookie', [`token=${studentToken}`]);
      expect(res.statusCode).toBe(200);
      // Should have notifications for Leave and Room Change
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Student Dashboard', () => {
    it('Student can fetch their dashboard with correct data', async () => {
      const res = await request(app).get('/api/dashboard/student').set('Cookie', [`token=${studentToken}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.student.reg_no).toBe('REQ_ST');
      expect(res.body.data.allocation.room_number).toBe('102'); // Due to room change
      expect(res.body.data.requests.complaints.length).toBe(1);
    });
  });

});
