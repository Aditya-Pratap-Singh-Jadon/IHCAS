require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

let validStudentId, validAdminId, invalidStudentId, invalidAdminId;
let validStudentEmail = 'validstudent@vitstudent.ac.in';
let validAdminEmail = 'validadmin@vit.ac.in';
let invalidStudentEmail = 'invalidstudent@vit.ac.in';
let invalidAdminEmail = 'invalidadmin@vitstudent.ac.in';
let otherDomainEmail = 'someone@gmail.com';
let password = 'password123';

beforeAll(async () => {
  await pool.query('DELETE FROM USER WHERE email IN (?, ?, ?, ?, ?)', [
    validStudentEmail, validAdminEmail, invalidStudentEmail, invalidAdminEmail, otherDomainEmail
  ]);
  
  const hash = await bcrypt.hash(password, 10);
  
  const [vs] = await pool.query('INSERT INTO USER (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)', ['Valid Student', validStudentEmail, hash, 'STUDENT', true]);
  validStudentId = vs.insertId;
  await pool.query('INSERT INTO STUDENT (student_id, reg_no, cgpa, academic_rank, gender) VALUES (?, ?, ?, ?, ?)', [validStudentId, 'VS123', 8.5, 100, 'MALE']);

  const [va] = await pool.query('INSERT INTO USER (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)', ['Valid Admin', validAdminEmail, hash, 'ADMIN', true]);
  validAdminId = va.insertId;
  await pool.query('INSERT INTO ADMIN (admin_id, employee_id) VALUES (?, ?)', [validAdminId, 'Test']);

  const [is] = await pool.query('INSERT INTO USER (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)', ['Invalid Student', invalidStudentEmail, hash, 'STUDENT', true]);
  invalidStudentId = is.insertId;
  
  const [ia] = await pool.query('INSERT INTO USER (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)', ['Invalid Admin', invalidAdminEmail, hash, 'ADMIN', true]);
  invalidAdminId = ia.insertId;
});

afterAll(async () => {
  await pool.query('DELETE FROM USER WHERE user_id IN (?, ?, ?, ?)', [validStudentId, validAdminId, invalidStudentId, invalidAdminId]);
  await pool.end();
});

describe('Authentication API & Domain Rules', () => {

  describe('Local Email/Password Login', () => {
    it('should login successfully for valid student domain', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: validStudentEmail, password });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should login successfully for valid admin domain', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: validAdminEmail, password });
      expect(res.statusCode).toBe(200);
    });

    it('should reject student logging in with @vit.ac.in', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: invalidStudentEmail, password });
      expect(res.statusCode).toBe(403);
      expect(res.body.error.message).toMatch(/Only authorized VIT email IDs are allowed/);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('should reject admin logging in with @vitstudent.ac.in', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: invalidAdminEmail, password });
      expect(res.statusCode).toBe(403);
      expect(res.body.error.message).toMatch(/Only authorized VIT email IDs are allowed/);
    });
  });

  describe('Google OAuth Flow', () => {
    beforeAll(() => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      process.env.GOOGLE_CALLBACK_URL = 'http://localhost/callback';
    });
    
    afterAll(() => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_CALLBACK_URL;
      jest.restoreAllMocks();
    });

    it('should redirect to Google for login', async () => {
      const res = await request(app).get('/api/auth/google');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toMatch(/https:\/\/accounts\.google\.com/);
    });

    it('should reject Google callback if email is not verified', async () => {
      jest.spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({ tokens: { id_token: 'mock_token' } });
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({ email_verified: false, email: validStudentEmail })
      });

      const res = await request(app).get('/api/auth/google/callback?code=mock_code');
      expect(res.statusCode).toBe(403);
      expect(res.body.error.message).toMatch(/Email must be verified/);
    });

    it('should reject Google callback if email is an unauthorized domain', async () => {
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({ email_verified: true, email: otherDomainEmail })
      });

      const res = await request(app).get('/api/auth/google/callback?code=mock_code');
      expect(res.statusCode).toBe(403);
      expect(res.body.error.message).toMatch(/Only authorized VIT email IDs are allowed/);
    });

    it('should reject Google callback for student with admin domain', async () => {
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({ email_verified: true, email: invalidStudentEmail })
      });

      const res = await request(app).get('/api/auth/google/callback?code=mock_code');
      expect(res.statusCode).toBe(403);
    });

    it('should login successfully via Google for valid student', async () => {
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({ email_verified: true, email: validStudentEmail })
      });

      const res = await request(app).get('/api/auth/google/callback?code=mock_code');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

});
