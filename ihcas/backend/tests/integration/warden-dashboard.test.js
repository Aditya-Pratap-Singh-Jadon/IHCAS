require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let adminToken, warden1Token, warden2Token, student1Token, student2Token;
let warden1Id, warden2Id, student1Id, student2Id;
let hostel1Id, hostel2Id;
let room1Id, room2Id;

const generateToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production', { expiresIn: '1h' });

beforeAll(async () => {
  await pool.query("DELETE FROM ROOM_CHANGE_REQUEST");
  await pool.query("DELETE FROM ALLOCATION");
  await pool.query("DELETE FROM STUDENT");
  await pool.query("DELETE FROM WARDEN");
  await pool.query("DELETE FROM ADMIN");
  await pool.query("DELETE FROM ROOM");
  await pool.query("DELETE FROM ROOM_TYPE");
  await pool.query("DELETE FROM HOSTEL");
  await pool.query("DELETE FROM USER WHERE email LIKE '%@vit.ac.in' OR email LIKE '%@vitstudent.ac.in'");

  const hash = await bcrypt.hash('password123', 10);

  // Users
  const [aRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin_wd@vit.ac.in', hash, 'ADMIN']);
  adminToken = generateToken({ user_id: aRes.insertId, role: 'ADMIN', email: 'admin_wd@vit.ac.in' });
  await pool.query('INSERT INTO ADMIN (admin_id, employee_id) VALUES (?, ?)', [aRes.insertId, 'ADM_WD1']);

  const [w1Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Warden 1', 'warden1_wd@vit.ac.in', hash, 'WARDEN']);
  warden1Id = w1Res.insertId;
  warden1Token = generateToken({ user_id: warden1Id, role: 'WARDEN', email: 'warden1_wd@vit.ac.in' });

  const [w2Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Warden 2', 'warden2_wd@vit.ac.in', hash, 'WARDEN']);
  warden2Id = w2Res.insertId;
  warden2Token = generateToken({ user_id: warden2Id, role: 'WARDEN', email: 'warden2_wd@vit.ac.in' });

  const [s1Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Student 1', 'student1_wd@vitstudent.ac.in', hash, 'STUDENT']);
  student1Id = s1Res.insertId;
  await pool.query("INSERT INTO STUDENT (student_id, reg_no, gender, allocation_status) VALUES (?, ?, ?, 'CONFIRMED')", [student1Id, 'WD_ST1', 'MALE']);
  student1Token = generateToken({ user_id: student1Id, role: 'STUDENT', email: 'student1_wd@vitstudent.ac.in' });

  const [s2Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Student 2', 'student2_wd@vitstudent.ac.in', hash, 'STUDENT']);
  student2Id = s2Res.insertId;
  await pool.query("INSERT INTO STUDENT (student_id, reg_no, gender, allocation_status) VALUES (?, ?, ?, 'CONFIRMED')", [student2Id, 'WD_ST2', 'FEMALE']);
  student2Token = generateToken({ user_id: student2Id, role: 'STUDENT', email: 'student2_wd@vitstudent.ac.in' });

  // Inventory
  const [h1Res] = await pool.query("INSERT INTO HOSTEL (name, gender, total_capacity) VALUES ('MH-WD1', 'MALE', 100)");
  hostel1Id = h1Res.insertId;
  
  const [h2Res] = await pool.query("INSERT INTO HOSTEL (name, gender, total_capacity) VALUES ('LH-WD2', 'FEMALE', 100)");
  hostel2Id = h2Res.insertId;

  const [rtRes] = await pool.query("INSERT INTO ROOM_TYPE (type_name, capacity) VALUES ('Single', 1)");
  
  const [r1Res] = await pool.query("INSERT INTO ROOM (hostel_id, room_number, floor, capacity, room_type_id) VALUES (?, '101', 1, 1, ?)", [hostel1Id, rtRes.insertId]);
  room1Id = r1Res.insertId;
  
  const [r2Res] = await pool.query("INSERT INTO ROOM (hostel_id, room_number, floor, capacity, room_type_id) VALUES (?, '201', 2, 1, ?)", [hostel2Id, rtRes.insertId]);
  room2Id = r2Res.insertId;

  // Assign Wardens
  await pool.query('INSERT INTO WARDEN (warden_id, employee_id, hostel_id) VALUES (?, ?, ?)', [warden1Id, 'WD_EMP1', hostel1Id]);
  await pool.query('INSERT INTO WARDEN (warden_id, employee_id, hostel_id) VALUES (?, ?, ?)', [warden2Id, 'WD_EMP2', hostel2Id]);

  // Allocations
  await pool.query("INSERT INTO ALLOCATION (student_id, room_id, allocation_type, status) VALUES (?, ?, 'SELF', 'CONFIRMED')", [student1Id, room1Id]);
  await pool.query("INSERT INTO ALLOCATION (student_id, room_id, allocation_type, status) VALUES (?, ?, 'SELF', 'CONFIRMED')", [student2Id, room2Id]);

  // Requests
  await pool.query("INSERT INTO ROOM_CHANGE_REQUEST (student_id, current_room_id, requested_room_type, reason, status) VALUES (?, ?, 'Double', 'Test', 'PENDING')", [student1Id, room1Id]);
  await pool.query("INSERT INTO ROOM_CHANGE_REQUEST (student_id, current_room_id, requested_room_type, reason, status) VALUES (?, ?, 'Double', 'Test', 'PENDING')", [student2Id, room2Id]);
});

afterAll(async () => {
  await pool.end();
});

describe('Phase 8b: Warden Dashboard and Scope', () => {
  it('Student cannot access Warden dashboard', async () => {
    const res = await request(app).get('/api/dashboard/warden').set('Cookie', [`token=${student1Token}`]);
    expect(res.statusCode).toBe(403);
  });

  it('Warden sees only their assigned hostel records', async () => {
    const res = await request(app).get('/api/dashboard/warden').set('Cookie', [`token=${warden1Token}`]);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.warden.hostel_name).toBe('MH-WD1');
    expect(res.body.data.inventory.total_rooms).toBe(1);
    expect(res.body.data.requests.room_change.length).toBe(1);
    
    // Ensure the request is from Student 1 (MALE) which is in Hostel 1
    expect(res.body.data.requests.room_change[0].student_name).toBe('Student 1');
  });

  it('Warden 2 sees only their assigned hostel records', async () => {
    const res = await request(app).get('/api/dashboard/warden').set('Cookie', [`token=${warden2Token}`]);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.warden.hostel_name).toBe('LH-WD2');
    expect(res.body.data.requests.room_change.length).toBe(1);
    
    // Ensure the request is from Student 2 (FEMALE) which is in Hostel 2
    expect(res.body.data.requests.room_change[0].student_name).toBe('Student 2');
  });

  it('Direct-ID attempt to access another hostel request is rejected', async () => {
    // Get the request ID for student 2 (Hostel 2)
    const [reqs] = await pool.query("SELECT change_id FROM ROOM_CHANGE_REQUEST WHERE student_id = ?", [student2Id]);
    const student2RequestId = reqs[0].change_id;

    // Warden 1 tries to approve Warden 2's student request
    const res = await request(app)
      .put(`/api/requests/room-change/${student2RequestId}/review`)
      .set('Cookie', [`token=${warden1Token}`])
      .send({ status: 'REJECTED' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toMatch(/not found or not in scope/);
  });
});
