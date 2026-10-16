require('dotenv').config();
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Admin Analytics Integration Tests', () => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production';
  const adminToken = jwt.sign({ user_id: 1, email: 'admin@vit.ac.in', role: 'ADMIN' }, secret);
  const wardenToken = jwt.sign({ user_id: 2, email: 'warden.mha@vit.ac.in', role: 'WARDEN' }, secret);
  const studentToken = jwt.sign({ user_id: 9, email: 'aarav.sharma24@vitstudent.ac.in', role: 'STUDENT' }, secret);

  afterAll(async () => {
    await pool.end();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/dashboard/admin/analytics');
    expect(res.statusCode).toBe(401);
  });

  it('rejects student requests with 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/analytics')
      .set('Cookie', [`token=${studentToken}`]);
    expect(res.statusCode).toBe(403);
  });

  it('rejects warden requests with 403', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/analytics')
      .set('Cookie', [`token=${wardenToken}`]);
    expect(res.statusCode).toBe(403);
  });

  it('allows admin requests and returns comprehensive analytics payload', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/analytics')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const { data } = res.body;
    expect(data).toHaveProperty('kpis');
    expect(data.kpis).toHaveProperty('registered_students');
    expect(data.kpis).toHaveProperty('registered_hostels');
    expect(data.kpis).toHaveProperty('total_rooms');
    expect(data.kpis).toHaveProperty('total_bed_capacity');
    expect(data.kpis).toHaveProperty('occupied_beds');
    expect(data.kpis).toHaveProperty('available_beds');
    expect(data.kpis).toHaveProperty('overall_occupancy_percentage');
    expect(data.kpis).toHaveProperty('confirmed_allocations');
    expect(data.kpis).toHaveProperty('unallocated_students');

    expect(data).toHaveProperty('hostels');
    expect(Array.isArray(data.hostels)).toBe(true);
    expect(data).toHaveProperty('room_types');
    expect(Array.isArray(data.room_types)).toBe(true);
    expect(data).toHaveProperty('room_status_distribution');
    expect(data).toHaveProperty('counselling');
    expect(data.counselling).toHaveProperty('slots');
    expect(data).toHaveProperty('allocations');
    expect(data).toHaveProperty('requests');
  });

  it('supports gender filter parameter for hostels', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/analytics?gender=MALE')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hostels.length).toBeGreaterThan(0);
    res.body.data.hostels.forEach(h => {
      expect(h.gender).toBe('MALE');
    });
  });

  it('supports hostel_id filter parameter', async () => {
    const listRes = await request(app)
      .get('/api/dashboard/admin/analytics')
      .set('Cookie', [`token=${adminToken}`]);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data.hostels.length).toBeGreaterThan(0);
    const targetHostelId = listRes.body.data.hostels[0].hostel_id;

    const res = await request(app)
      .get(`/api/dashboard/admin/analytics?hostel_id=${targetHostelId}`)
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hostels.length).toBe(1);
    expect(res.body.data.hostels[0].hostel_id).toBe(targetHostelId);
  });

  it('supports session_id and date_range filters', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin/analytics?session_id=1&date_range=7D')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.counselling.slots).toBeDefined();
    expect(res.body.data.allocations.recent).toBeDefined();
  });
});
