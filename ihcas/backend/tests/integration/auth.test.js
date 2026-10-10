require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');

let testUserId;
let testUserEmail = 'teststudent@example.com';
let testUserPassword = 'password123';
let token;

beforeAll(async () => {
  // Clear user if exists
  await pool.query('DELETE FROM USER WHERE email = ?', [testUserEmail]);
  
  // Create a test student
  const hash = await bcrypt.hash(testUserPassword, 10);
  const [result] = await pool.query(
    'INSERT INTO USER (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
    ['Test Student', testUserEmail, hash, 'STUDENT', true]
  );
  testUserId = result.insertId;

  await pool.query(
    'INSERT INTO STUDENT (student_id, reg_no, cgpa, academic_rank, gender) VALUES (?, ?, ?, ?, ?)',
    [testUserId, 'REG12345', 8.5, 100, 'MALE']
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM USER WHERE user_id = ?', [testUserId]);
  await pool.end();
});

describe('Authentication API', () => {
  it('should return 400 for missing input', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUserEmail }); // missing password
    
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUserEmail, password: 'wrongpassword' });
    
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/Invalid email or password/i);
  });

  it('should login successfully and return a token cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUserEmail, password: testUserPassword });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUserEmail);
    expect(res.headers['set-cookie']).toBeDefined();
    
    // Extract token for next tests
    const cookie = res.headers['set-cookie'][0];
    token = cookie.split(';')[0].split('=')[1];
  });

  it('should allow access to /api/auth/me with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=${token}`]);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe(testUserEmail);
  });

  it('should deny access to protected endpoint without token', async () => {
    const res = await request(app)
      .get('/api/auth/me');
    
    expect(res.statusCode).toBe(401);
  });

  it('should deny access with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=invalid.token.here`]);
    
    expect(res.statusCode).toBe(401);
  });

  it('should logout and clear cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout');
    
    expect(res.statusCode).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/token=;/);
  });
});
