require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let studentId;
let adminId;
let otherStudentId;
let studentToken;
let adminToken;
let otherStudentToken;

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production', { expiresIn: '1h' });
};

beforeAll(async () => {
  // Clear previous test data
  await pool.query("DELETE FROM USER WHERE email LIKE '%@testusers.com' OR email LIKE '%@vitstudent.ac.in' OR email LIKE '%@vit.ac.in'");

  const hash = await bcrypt.hash('password123', 10);

  // 1. Student User
  const [sRes] = await pool.query(
    'INSERT INTO USER (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
    ['Student One', 's1_users@vitstudent.ac.in', hash, 'STUDENT', true]
  );
  studentId = sRes.insertId;
  await pool.query(
    'INSERT INTO STUDENT (student_id, reg_no, phone) VALUES (?, ?, ?)',
    [studentId, 'STU001', '1234567890']
  );
  studentToken = generateToken({ user_id: studentId, role: 'STUDENT', email: 's1_users@vitstudent.ac.in' });

  // 2. Admin User
  const [aRes] = await pool.query(
    'INSERT INTO USER (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
    ['Admin One', 'admin_users@vit.ac.in', hash, 'ADMIN', true]
  );
  adminId = aRes.insertId;
  await pool.query(
    'INSERT INTO ADMIN (admin_id, employee_id) VALUES (?, ?)',
    [adminId, 'ADM001']
  );
  adminToken = generateToken({ user_id: adminId, role: 'ADMIN', email: 'admin_users@vit.ac.in' });

  // 3. Another Student User
  const [oRes] = await pool.query(
    'INSERT INTO USER (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
    ['Student Two', 's2_users@vitstudent.ac.in', hash, 'STUDENT', true]
  );
  otherStudentId = oRes.insertId;
  await pool.query(
    'INSERT INTO STUDENT (student_id, reg_no) VALUES (?, ?)',
    [otherStudentId, 'STU002']
  );
  otherStudentToken = generateToken({ user_id: otherStudentId, role: 'STUDENT', email: 's2_users@vitstudent.ac.in' });
});

afterAll(async () => {
  await pool.query("DELETE FROM USER WHERE email LIKE '%@testusers.com' OR email LIKE '%@vitstudent.ac.in' OR email LIKE '%@vit.ac.in'");
  await pool.end();
});

describe('Users API', () => {
  it('should retrieve own profile successfully', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Cookie', [`token=${studentToken}`]);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('s1_users@vitstudent.ac.in');
    expect(res.body.data.profile.reg_no).toBe('STU001');
  });

  it('should allow profile update for permitted fields (phone)', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Cookie', [`token=${studentToken}`])
      .send({ phone: '0987654321' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify change
    const [rows] = await pool.query('SELECT phone FROM STUDENT WHERE student_id = ?', [studentId]);
    expect(rows[0].phone).toBe('0987654321');
  });

  it('should deny a student access to another student profile via admin route', async () => {
    const res = await request(app)
      .get(`/api/users/${otherStudentId}`)
      .set('Cookie', [`token=${studentToken}`]);
    
    expect(res.statusCode).toBe(403);
    expect(res.body.error.message).toMatch(/Insufficient privileges/i);
  });

  it('should allow admin to access any user profile', async () => {
    const res = await request(app)
      .get(`/api/users/${otherStudentId}`)
      .set('Cookie', [`token=${adminToken}`]);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe('s2_users@vitstudent.ac.in');
    expect(res.body.data.profile.reg_no).toBe('STU002');
  });
});
