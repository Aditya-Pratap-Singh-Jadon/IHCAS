/**
 * verify-phase13.js
 * Comprehensive functional verification for Phase 13 test data and business rules against ihcas_dev.
 */

process.env.NODE_ENV = 'development';
require('dotenv').config();
const mysql = require('mysql2/promise');
const request = require('supertest');
const app = require('../src/app');

async function runVerification() {
  console.log('===========================================================');
  console.log('IHCAS Phase 13 - Functional Verification Suite');
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log('===========================================================\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const results = [];
  function assert(condition, description) {
    if (condition) {
      results.push({ pass: true, desc: description });
      console.log(`  [PASS] ${description}`);
    } else {
      results.push({ pass: false, desc: description });
      console.error(`  [FAIL] ${description}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST SECTION 1: 100 Students Integrity & Format
    // -------------------------------------------------------------
    console.log('--- 1. Student Accounts & Academic Data ---');
    const [seededStudents] = await pool.query(
      "SELECT s.*, u.email, u.name FROM STUDENT s JOIN USER u ON s.student_id = u.user_id WHERE u.email LIKE '%24@vitstudent.ac.in' ORDER BY s.academic_rank ASC"
    );

    assert(seededStudents.length === 100, `Exactly 100 Phase 13 students found (Found: ${seededStudents.length})`);

    const boys = seededStudents.filter(s => s.gender === 'MALE');
    const girls = seededStudents.filter(s => s.gender === 'FEMALE');

    assert(boys.length === 50, `Exactly 50 seeded boys found (Found: ${boys.length})`);
    assert(girls.length === 50, `Exactly 50 seeded girls found (Found: ${girls.length})`);

    const regNoRegex = /^24[A-Z0-9]{3}[0-9]{4}$/;
    const allRegNoMatch = seededStudents.every(s => regNoRegex.test(s.reg_no) && s.reg_no.length === 9);
    assert(allRegNoMatch, 'All 100 registration numbers match ^24[A-Z0-9]{3}[0-9]{4}$ and are exactly 9 chars');

    const uniqueRegNos = new Set(seededStudents.map(s => s.reg_no));
    assert(uniqueRegNos.size === 100, 'All 100 registration numbers are unique');

    const ranks = seededStudents.map(s => s.academic_rank).sort((a, b) => a - b);
    const ranksExact1To100 = ranks.length === 100 && ranks[0] === 1 && ranks[99] === 100 && new Set(ranks).size === 100;
    assert(ranksExact1To100, 'Academic ranks range from 1 to 100 with zero duplicates or gaps');

    const oddBoysCount = boys.filter(b => b.academic_rank % 2 === 1).length;
    const evenGirlsCount = girls.filter(g => g.academic_rank % 2 === 0).length;
    assert(oddBoysCount === 50 && evenGirlsCount === 50, 'Academic ranks are interleaved evenly between boys and girls');

    const allCgpaRealistic = seededStudents.every(s => s.cgpa >= 7.50 && s.cgpa <= 9.95);
    assert(allCgpaRealistic, 'All CGPAs are realistic between 7.50 and 9.95');

    // -------------------------------------------------------------
    // TEST SECTION 2: Hostel & Room Inventory
    // -------------------------------------------------------------
    console.log('\n--- 2. Hostel & Room Inventory ---');
    const [hostels] = await pool.query('SELECT * FROM HOSTEL');
    const maleHostels = hostels.filter(h => h.gender === 'MALE');
    const femaleHostels = hostels.filter(h => h.gender === 'FEMALE');

    assert(maleHostels.length >= 3, `At least 3 boys hostels exist (Found: ${maleHostels.length})`);
    assert(femaleHostels.length >= 3, `At least 3 girls hostels exist (Found: ${femaleHostels.length})`);
    assert(maleHostels.every(h => h.name.startsWith('MH-')), 'All boys hostels follow MH-<blockName> convention');
    assert(femaleHostels.every(h => h.name.startsWith('LH-')), 'All girls hostels follow LH-<blockName> convention');

    const [roomTypes] = await pool.query('SELECT * FROM ROOM_TYPE');
    const capacities = new Set(roomTypes.map(rt => rt.capacity));
    assert([1, 2, 4, 6].every(c => capacities.has(c)), 'All required room capacities (1, 2, 4, 6) exist in ROOM_TYPE');

    const [rooms] = await pool.query('SELECT * FROM ROOM');
    assert(rooms.length >= 60, `Substantial room inventory exists (Total rooms: ${rooms.length})`);

    const statuses = new Set(rooms.map(r => r.status));
    assert(statuses.has('AVAILABLE'), 'Rooms with AVAILABLE status exist');
    assert(statuses.has('PARTIALLY_FILLED'), 'Rooms with PARTIALLY_FILLED status exist');
    assert(statuses.has('FULL'), 'Rooms with FULL status exist');
    assert(statuses.has('MAINTENANCE'), 'Rooms with MAINTENANCE status exist');

    // Validate Authoritative Occupancy Calculation
    const [occCheck] = await pool.query(`
      SELECT r.room_id, r.room_number, r.capacity, r.occupied_beds,
             COUNT(a.allocation_id) as actual_allocations
      FROM ROOM r
      LEFT JOIN ALLOCATION a ON r.room_id = a.room_id AND a.status IN ('CONFIRMED', 'LOCKED')
      GROUP BY r.room_id, r.room_number, r.capacity, r.occupied_beds
      HAVING r.occupied_beds != actual_allocations
    `);
    assert(occCheck.length === 0, 'Room occupied_beds strictly agrees with authoritative ALLOCATION records for all rooms');

    // -------------------------------------------------------------
    // TEST SECTION 3: Authentication & Role Verification (API)
    // -------------------------------------------------------------
    console.log('\n--- 3. Authentication & Role Enforcement (API) ---');
    const DEMO_PW = 'DemoPassword123!';

    // 3a. Admin Login
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@vit.ac.in', password: DEMO_PW });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.data.user.role === 'ADMIN', 'Admin demo login succeeds with ADMIN role');
    const adminCookie = adminLoginRes.headers['set-cookie'];

    // 3b. Warden Login
    const wardenLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'warden@vit.ac.in', password: DEMO_PW });
    assert(wardenLoginRes.status === 200 && wardenLoginRes.body.data.user.role === 'WARDEN', 'MH-A Warden demo login succeeds with WARDEN role');
    const wardenCookie = wardenLoginRes.headers['set-cookie'];

    const wardenLhaLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'warden.lha@vit.ac.in', password: DEMO_PW });
    assert(wardenLhaLoginRes.status === 200 && wardenLhaLoginRes.body.data.user.role === 'WARDEN', 'LH-A Warden demo login succeeds with WARDEN role');

    // 3c. Boy Student Login (Rank 1)
    const boy1 = seededStudents.find(s => s.academic_rank === 1);
    const boy1LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: boy1.email, password: boy1.email.split('@')[0] });
    assert(boy1LoginRes.status === 200 && boy1LoginRes.body.data.user.role === 'STUDENT', `Boy Rank 1 (${boy1.email}) login succeeds with STUDENT role`);
    const boy1Cookie = boy1LoginRes.headers['set-cookie'];

    // 3d. Girl Student Login (Rank 2)
    const girl1 = seededStudents.find(s => s.academic_rank === 2);
    const girl1LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: girl1.email, password: girl1.email.split('@')[0] });
    assert(girl1LoginRes.status === 200 && girl1LoginRes.body.data.user.role === 'STUDENT', `Girl Rank 2 (${girl1.email}) login succeeds with STUDENT role`);
    const girl1Cookie = girl1LoginRes.headers['set-cookie'];

    // -------------------------------------------------------------
    // TEST SECTION 4: Gender-Separated Inventory Access (API)
    // -------------------------------------------------------------
    console.log('\n--- 4. Gender Isolation & Inventory Scope (API) ---');

    // Male student fetching hostels
    const boyHostelsRes = await request(app)
      .get('/api/inventory/hostels')
      .set('Cookie', boy1Cookie);
    assert(
      boyHostelsRes.status === 200 && boyHostelsRes.body.data.every(h => h.gender === 'MALE'),
      'Male student sees ONLY male hostels (LH hostels hidden)'
    );

    // Female student fetching hostels
    const girlHostelsRes = await request(app)
      .get('/api/inventory/hostels')
      .set('Cookie', girl1Cookie);
    assert(
      girlHostelsRes.status === 200 && girlHostelsRes.body.data.every(h => h.gender === 'FEMALE'),
      'Female student sees ONLY female hostels (MH hostels hidden)'
    );

    // Male student fetching rooms in LH-A
    const lhA = hostels.find(h => h.name === 'LH-A');
    const mhA = hostels.find(h => h.name === 'MH-A');

    const boyCrossHostelRes = await request(app)
      .get(`/api/inventory/hostels/${lhA.hostel_id}`)
      .set('Cookie', boy1Cookie);
    assert(boyCrossHostelRes.status === 403, 'Male student accessing LH-A hostel profile receives 403 Forbidden');

    const girlCrossHostelRes = await request(app)
      .get(`/api/inventory/hostels/${mhA.hostel_id}`)
      .set('Cookie', girl1Cookie);
    assert(girlCrossHostelRes.status === 403, 'Female student accessing MH-A hostel profile receives 403 Forbidden');

    // -------------------------------------------------------------
    // TEST SECTION 5: Counselling Queue Ordering & 3-Min Timer (API)
    // -------------------------------------------------------------
    console.log('\n--- 5. Counselling Queue Ordering & Server-Authoritative Timer (API) ---');

    // Status of Rank 1
    const boy1StatusRes = await request(app)
      .get('/api/counselling/status')
      .set('Cookie', boy1Cookie);
    assert(
      boy1StatusRes.status === 200 && boy1StatusRes.body.data.queue_position === 1,
      `Student Rank 1 is at front of queue (queue_position = 1)`
    );

    // Status of Rank 2
    const girl1StatusRes = await request(app)
      .get('/api/counselling/status')
      .set('Cookie', girl1Cookie);
    assert(
      girl1StatusRes.status === 200 && girl1StatusRes.body.data.queue_position === 2,
      `Student Rank 2 is next in line (queue_position = 2)`
    );

    // Non-front student whose scheduled time has not arrived trying to activate prematurely
    const [futureSlots] = await pool.query(
      `SELECT cs.student_id, u.email 
       FROM COUNSELLING_SLOT cs 
       JOIN USER u ON cs.student_id = u.user_id 
       JOIN STUDENT s ON cs.student_id = s.student_id
       WHERE cs.start_time > NOW() AND s.allocation_status = 'PENDING'
       ORDER BY cs.start_time ASC LIMIT 1`
    );
    const prematureStudent = futureSlots[0];
    const prematureLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: prematureStudent.email, password: prematureStudent.email.split('@')[0] });
    const prematureCookie = prematureLoginRes.headers['set-cookie'];

    const prematureActivateRes = await request(app)
      .post('/api/counselling/activate')
      .set('Cookie', prematureCookie);
    assert(prematureActivateRes.status === 403, 'Student not at front of queue receives 403 when attempting premature activation');

    // Rank 1 activates slot
    const boy1ActivateRes = await request(app)
      .post('/api/counselling/activate')
      .set('Cookie', boy1Cookie);
    assert(boy1ActivateRes.status === 200, 'Student Rank 1 successfully activates counselling slot');

    const startTime = new Date(boy1ActivateRes.body.data.start_time);
    const endTime = new Date(boy1ActivateRes.body.data.end_time);
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    assert(Math.round(durationMinutes) === 3, `Server enforces authoritative 3-minute timer (Duration: ${durationMinutes} mins)`);

    // Verify Rank 1 status is now ACTIVE
    const boy1ActiveStatus = await request(app)
      .get('/api/counselling/status')
      .set('Cookie', boy1Cookie);
    assert(boy1ActiveStatus.body.data.status === 'ACTIVE' && boy1ActiveStatus.body.data.is_active === true, 'Slot status transitioned to ACTIVE');

    // Test timeout expiry and queue re-entry preserving priority:
    // Artificially expire the slot in DB to test backend expiry logic
    await pool.query("UPDATE COUNSELLING_SLOT SET end_time = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE student_id = ?", [boy1.student_id]);
    const boy1ExpiredStatus = await request(app)
      .get('/api/counselling/status')
      .set('Cookie', boy1Cookie);
    assert(
      boy1ExpiredStatus.body.data.status === 'PENDING' && boy1ExpiredStatus.body.data.queue_position === 1,
      'Timed-out slot automatically resets to PENDING and preserves front-of-queue priority (#1)'
    );

    // -------------------------------------------------------------
    // TEST SECTION 6: Controlled Room Allocation Scenarios (API)
    // -------------------------------------------------------------
    console.log('\n--- 6. Controlled Room Allocation Scenarios (API) ---');

    // Reactivate boy1 for allocation tests
    await request(app)
      .post('/api/counselling/activate')
      .set('Cookie', boy1Cookie);

    // Find test rooms in MH-A and LH-A
    const [mhRooms] = await pool.query('SELECT * FROM ROOM WHERE hostel_id = ?', [mhA.hostel_id]);
    const [lhRooms] = await pool.query('SELECT * FROM ROOM WHERE hostel_id = ?', [lhA.hostel_id]);

    const fullMhRoom = mhRooms.find(r => r.room_number === '202');
    const maintMhRoom = mhRooms.find(r => r.room_number === '501');
    const availMhRoom = mhRooms.find(r => r.room_number === '101');
    const availLhRoom = lhRooms.find(r => r.room_number === '101');

    // 6a. Cross-Gender Allocation Rejection
    const crossAllocRes = await request(app)
      .post('/api/allocation')
      .set('Cookie', boy1Cookie)
      .send({ room_id: availLhRoom.room_id });
    assert(crossAllocRes.status === 403, 'Male student allocating female hostel room is rejected (403 Forbidden)');

    // 6b. Full Room Allocation Rejection
    const fullAllocRes = await request(app)
      .post('/api/allocation')
      .set('Cookie', boy1Cookie)
      .send({ room_id: fullMhRoom.room_id });
    assert(fullAllocRes.status === 409, 'Allocation attempt for a FULL room is rejected (409 Conflict)');

    // 6c. Maintenance Room Allocation Rejection
    const maintAllocRes = await request(app)
      .post('/api/allocation')
      .set('Cookie', boy1Cookie)
      .send({ room_id: maintMhRoom.room_id });
    assert(maintAllocRes.status === 400, 'Allocation attempt for a MAINTENANCE room is rejected (400 Bad Request)');

    // 6d. Duplicate Allocation Rejection
    // Pre-allocated student (Rank 89) attempts allocation
    const boy89 = seededStudents.find(s => s.academic_rank === 89);
    const boy89LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: boy89.email, password: boy89.email.split('@')[0] });
    const boy89Cookie = boy89LoginRes.headers['set-cookie'];

    const dupAllocRes = await request(app)
      .post('/api/allocation')
      .set('Cookie', boy89Cookie)
      .send({ room_id: availMhRoom.room_id });
    assert(dupAllocRes.status === 400, 'Already allocated student attempting duplicate allocation is rejected (400 Bad Request)');

    // Reset boy1's slot back to PENDING so ihcas_dev queue remains ready for user testing
    await pool.query("UPDATE COUNSELLING_SLOT SET status = 'PENDING', is_active = FALSE WHERE student_id = ?", [boy1.student_id]);
    await pool.query("UPDATE STUDENT SET allocation_status = 'PENDING' WHERE student_id = ?", [boy1.student_id]);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n===========================================================');
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('===========================================================');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Verification failed with uncaught exception:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runVerification();
