require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let adminToken;
let studentToken;

const generateToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production', { expiresIn: '1h' });

beforeAll(async () => {
  await pool.query("DELETE FROM ALLOCATION");
  await pool.query("DELETE FROM STUDENT");
  await pool.query("DELETE FROM ADMIN");
  await pool.query("DELETE FROM USER WHERE email LIKE '%@vit.ac.in' OR email LIKE '%@vitstudent.ac.in'");

  const hash = await bcrypt.hash('password123', 10);

  // Admin
  const [aRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin_db@vit.ac.in', hash, 'ADMIN']);
  adminToken = generateToken({ user_id: aRes.insertId, role: 'ADMIN', email: 'admin_db@vit.ac.in' });
  await pool.query('INSERT INTO ADMIN (admin_id, employee_id) VALUES (?, ?)', [aRes.insertId, 'ADM_DB1']);

  // Student
  const [s1Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Student 1', 'student1_db@vitstudent.ac.in', hash, 'STUDENT']);
  await pool.query("INSERT INTO STUDENT (student_id, reg_no, gender, allocation_status) VALUES (?, ?, ?, 'PENDING')", [s1Res.insertId, 'DB_ST1', 'MALE']);
  studentToken = generateToken({ user_id: s1Res.insertId, role: 'STUDENT', email: 'student1_db@vitstudent.ac.in' });
});

afterAll(async () => {
  await pool.end();
});

describe('Phase 11: Admin Dashboard', () => {
  it('Student cannot access Admin dashboard', async () => {
    const res = await request(app).get('/api/dashboard/admin').set('Cookie', [`token=${studentToken}`]);
    expect(res.statusCode).toBe(403);
  });

  it('Admin can fetch dashboard data', async () => {
    const res = await request(app).get('/api/dashboard/admin').set('Cookie', [`token=${adminToken}`]);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.students).toBeDefined();
    expect(res.body.data.inventory.total_hostels).toBeDefined();
  });
});
