require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let adminToken, student1Token, student2Token, student3Token, student4Token;
let adminId, student1Id, student2Id, student3Id, student4Id;
let sessionId;

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production', { expiresIn: '1h' });
};

beforeAll(async () => {
  // Clear tables
  await pool.query("DELETE FROM ALLOCATION");
  await pool.query("DELETE FROM COUNSELLING_SLOT");
  await pool.query("DELETE FROM COUNSELLING_SESSION");
  await pool.query("DELETE FROM WARDEN");
  await pool.query("DELETE FROM ADMIN");
  await pool.query("DELETE FROM STUDENT");
  await pool.query("DELETE FROM USER");

  const hash = await bcrypt.hash('password123', 10);

  // Admin
  const [aRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin_cs@vit.ac.in', hash, 'ADMIN']);
  adminId = aRes.insertId;
  await pool.query('INSERT INTO ADMIN (admin_id, employee_id) VALUES (?, ?)', [adminId, 'ADM_CS']);
  adminToken = generateToken({ user_id: adminId, role: 'ADMIN', email: 'admin_cs@vit.ac.in' });

  // Student 1 (Rank 1)
  const [s1Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['S1', 's1_cs@vitstudent.ac.in', hash, 'STUDENT']);
  student1Id = s1Res.insertId;
  await pool.query('INSERT INTO STUDENT (student_id, reg_no, academic_rank, cgpa) VALUES (?, ?, ?, ?)', [student1Id, 'STU_CS1', 1, 9.5]);
  student1Token = generateToken({ user_id: student1Id, role: 'STUDENT', email: 's1_cs@vitstudent.ac.in' });

  // Student 2 (Rank 2)
  const [s2Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['S2', 's2_cs@vitstudent.ac.in', hash, 'STUDENT']);
  student2Id = s2Res.insertId;
  await pool.query('INSERT INTO STUDENT (student_id, reg_no, academic_rank, cgpa) VALUES (?, ?, ?, ?)', [student2Id, 'STU_CS2', 2, 9.0]);
  student2Token = generateToken({ user_id: student2Id, role: 'STUDENT', email: 's2_cs@vitstudent.ac.in' });

  // Student 3 (Rank 2 as well, but lower CGPA to test tie-breaking)
  const [s3Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['S3', 's3_cs@vitstudent.ac.in', hash, 'STUDENT']);
  student3Id = s3Res.insertId;
  await pool.query('INSERT INTO STUDENT (student_id, reg_no, academic_rank, cgpa) VALUES (?, ?, ?, ?)', [student3Id, 'STU_CS3', 2, 8.5]);
  student3Token = generateToken({ user_id: student3Id, role: 'STUDENT', email: 's3_cs@vitstudent.ac.in' });

  // Student 4 (Rank 2, CGPA 8.5 as well, tests student_id tie breaker)
  const [s4Res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['S4', 's4_cs@vitstudent.ac.in', hash, 'STUDENT']);
  student4Id = s4Res.insertId;
  await pool.query('INSERT INTO STUDENT (student_id, reg_no, academic_rank, cgpa) VALUES (?, ?, ?, ?)', [student4Id, 'STU_CS4', 2, 8.5]);
  student4Token = generateToken({ user_id: student4Id, role: 'STUDENT', email: 's4_cs@vitstudent.ac.in' });
});

afterAll(async () => {
  await pool.query("DELETE FROM ALLOCATION");
  await pool.query("DELETE FROM COUNSELLING_SLOT");
  await pool.query("DELETE FROM COUNSELLING_SESSION");
  await pool.query("DELETE FROM STUDENT WHERE reg_no LIKE 'STU_CS%'");
  await pool.query("DELETE FROM USER WHERE email LIKE '%@cstest.com' OR email LIKE '%@vit.ac.in' OR email LIKE '%@vitstudent.ac.in'");
  await pool.end();
});

describe('Counselling APIs', () => {
  describe('Session and Queue Setup (Admin)', () => {
    it('Admin creates counselling session', async () => {
      const res = await request(app).post('/api/counselling/sessions')
        .set('Cookie', [`token=${adminToken}`])
        .send({
          academic_year: '2026-2027',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000).toISOString(),
          slot_duration_minutes: 3
        });
      expect(res.statusCode).toBe(201);
      sessionId = res.body.data.session_id;
    });

    it('Student cannot create session', async () => {
      const res = await request(app).post('/api/counselling/sessions')
        .set('Cookie', [`token=${student1Token}`])
        .send({ academic_year: '2026-2027', start_date: new Date().toISOString(), end_date: new Date().toISOString() });
      expect(res.statusCode).toBe(403);
    });

    it('Admin generates slots, ordered by rank and CGPA', async () => {
      const res = await request(app).post(`/api/counselling/sessions/${sessionId}/generate-slots`)
        .set('Cookie', [`token=${adminToken}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/Generated/);

      // Verify order in DB
      const [slots] = await pool.query('SELECT student_id FROM COUNSELLING_SLOT WHERE session_id = ? ORDER BY start_time ASC', [sessionId]);
      expect(slots.length).toBe(4);
      expect(slots[0].student_id).toBe(student1Id); // Rank 1
      expect(slots[1].student_id).toBe(student2Id); // Rank 2, CGPA 9.0
      expect(slots[2].student_id).toBe(student3Id); // Rank 2, CGPA 8.5, ID smaller
      expect(slots[3].student_id).toBe(student4Id); // Rank 2, CGPA 8.5, ID larger
    });

    it('Generates no duplicate slots on second call', async () => {
      const res = await request(app).post(`/api/counselling/sessions/${sessionId}/generate-slots`)
        .set('Cookie', [`token=${adminToken}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/Generated 0 slots/);
    });
  });

  describe('Student Queue and Session Management', () => {
    it('Student 1 gets status and sees queue position 1', async () => {
      const res = await request(app).get('/api/counselling/status')
        .set('Cookie', [`token=${student1Token}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.has_slot).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.queue_position).toBe(1);
    });

    it('Student 2 sees queue position 2', async () => {
      const res = await request(app).get('/api/counselling/status')
        .set('Cookie', [`token=${student2Token}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.queue_position).toBe(2);
    });

    it('Student 1 activates slot', async () => {
      const res = await request(app).post('/api/counselling/activate')
        .set('Cookie', [`token=${student1Token}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/activated/);
    });

    it('Student 1 cannot activate again (already active)', async () => {
      const res = await request(app).post('/api/counselling/activate')
        .set('Cookie', [`token=${student1Token}`]);
      expect(res.statusCode).toBe(400); // Because status is ACTIVE
      expect(res.body.error.message).toMatch(/Cannot activate slot/);
    });

    it('Student 3 (queue pos 2) cannot activate if original time is in future', async () => {
      // Temporarily set student 3 original start time to future
      await pool.query('UPDATE COUNSELLING_SLOT SET start_time = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE student_id = ?', [student3Id]);
      const res = await request(app).post('/api/counselling/activate')
        .set('Cookie', [`token=${student3Token}`]);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.message).toMatch(/Not eligible to activate yet/);
    });

    it('Student 1 session expires and returns to ready queue with original priority', async () => {
      // Force student 1 slot to expire by setting end_time to past
      await pool.query("UPDATE COUNSELLING_SLOT SET end_time = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE student_id = ?", [student1Id]);

      // When student 1 checks status, it should automatically expire and return to PENDING
      const res = await request(app).get('/api/counselling/status')
        .set('Cookie', [`token=${student1Token}`]);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('PENDING'); // Returned to ready queue
      expect(res.body.data.queue_position).toBe(1); // Original priority preserved!
    });

    it('Student 1 can re-activate after returning to ready queue', async () => {
      // Student 1 checks queue, they are pos 1 again, so they should be able to activate
      const res = await request(app).post('/api/counselling/activate')
        .set('Cookie', [`token=${student1Token}`]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.end_time).toBeDefined(); // Gets fresh 3 minute slot
    });

    it('Concurrent requests attempting to activate the same slot', async () => {
      // Force S2 to front of queue by setting start_time to past
      await pool.query("UPDATE COUNSELLING_SLOT SET start_time = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE student_id = ?", [student2Id]);

      // Fire two concurrent activation requests
      const [res1, res2] = await Promise.all([
        request(app).post('/api/counselling/activate').set('Cookie', [`token=${student2Token}`]),
        request(app).post('/api/counselling/activate').set('Cookie', [`token=${student2Token}`])
      ]);

      // One should succeed, one should fail safely due to transaction lock and state change
      const statuses = [res1.statusCode, res2.statusCode];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400); // The second one fails with "Cannot activate slot with status: ACTIVE"
    });
  });
});
