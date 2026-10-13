/**
 * seed-phase13.js
 * Comprehensive, idempotent test data seeder for IHCAS development database (ihcas_dev).
 * 
 * Generates:
 * - 100 realistic student accounts (50 boys, 50 girls) with valid reg_no format: ^24[A-Z0-9]{3}[0-9]{4}$
 * - Unique ranks 1 to 100 interleaved between boys and girls
 * - Realistic CGPA values (7.50 to 9.95)
 * - 6 Hostels: 3 boys (MH-A, MH-B, MH-C) and 3 girls (LH-A, LH-B, LH-C)
 * - 6 Warden accounts assigned to the hostels
 * - 1 System Admin account
 * - 8 Room Types covering 1, 2, 4, 6 bed capacities with AC and Non-AC
 * - 60 Rooms distributed across hostels with available, partially filled, full, and maintenance statuses
 * - 1 Active Counselling Session (2026-2027) with 3-minute slot duration
 * - 100 Counselling Slots preserving queue ordering for ranks 1-100
 * - Controlled allocations for partially filled and full test rooms
 * - Compatibility profiles for all 100 students
 * 
 * IDEMPOTENT: Safe to run repeatedly without duplicate key errors or resetting the database.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DEMO_PASSWORD = 'DemoPassword123!';

// 50 Boys names & course distributions
const BOY_NAMES = [
  'Aarav Sharma', 'Vihaan Patel', 'Vivaan Gupta', 'Aditya Kumar', 'Reyansh Verma',
  'Muhammad Khan', 'Sai Krishna', 'Arjun Reddy', 'Kabir Singh', 'Rohan Joshi',
  'Devansh Nair', 'Aryan Mehta', 'Dhruv Aggarwal', 'Ayaan Shah', 'Ishan Bhat',
  'Shaurya Malhotra', 'Atharva Kulkarni', 'Advait Desai', 'Pranav Rao', 'Rishabh Iyer',
  'Kunal Saxena', 'Siddharth Sen', 'Yash Vardhan', 'Harshit Chauhan', 'Manav Kapoor',
  'Tanmay Mishra', 'Nikhil Nambiar', 'Varun Pillai', 'Kartik Choudhury', 'Ayush Tiwari',
  'Chirag Jain', 'Harsh Pandey', 'Tejas Hegde', 'Mayank Sinha', 'Gaurav Das',
  'Akash Bose', 'Rohit Menon', 'Abhinav Ghosh', 'Parth Bhattacharya', 'Samarth Mukherjee',
  'Alok Chatterjee', 'Ankit Ganguly', 'Chetan Soni', 'Deepanshu Rawat', 'Eeshan Chawla',
  'Farhan Ansari', 'Girish Naidu', 'Hitesh Gokhale', 'Jayesh Patil', 'Lokesh Yadav'
];

// 50 Girls names & course distributions
const GIRL_NAMES = [
  'Aanya Gupta', 'Diya Verma', 'Ishita Sharma', 'Riya Sen', 'Saanvi Patel',
  'Ananya Iyer', 'Kiara Reddy', 'Myra Nair', 'Pari Joshi', 'Sara Khan',
  'Navya Malhotra', 'Aditi Mehta', 'Sneha Rao', 'Pooja Aggarwal', 'Tanvi Shah',
  'Kavya Bhat', 'Shreya Kulkarni', 'Meera Desai', 'Divya Kumar', 'Neha Singh',
  'Rashi Saxena', 'Swati Mishra', 'Kriti Vardhan', 'Priya Chauhan', 'Simran Kapoor',
  'Trisha Tiwari', 'Urvashi Choudhury', 'Vandana Nambiar', 'Vidya Pillai', 'Yamini Jain',
  'Anjali Pandey', 'Bhavna Hegde', 'Chhavi Sinha', 'Deepa Das', 'Garima Bose',
  'Harini Menon', 'Ipshita Ghosh', 'Janhavi Bhattacharya', 'Komal Mukherjee', 'Lavanya Chatterjee',
  'Mahika Ganguly', 'Nandini Soni', 'Pallavi Rawat', 'Radhika Chawla', 'Roshni Ansari',
  'Shalini Naidu', 'Tanisha Gokhale', 'Utkarsha Patil', 'Vaishnavi Yadav', 'Zoya Siddiqui'
];

// Course codes for realistic reg_nos
const BOY_COURSES = ['BCE', 'BME', 'BEE', 'BEC', 'BIT'];
const GIRL_COURSES = ['BCE', 'BCV', 'BCH', 'BEC', 'BBI'];

const HABIT_PREFERENCES = {
  sleep: ['EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE'],
  study: ['SILENT', 'GROUP', 'MUSIC'],
  clean: ['HIGH', 'MODERATE', 'RELAXED'],
  noise: ['LOW', 'MODERATE', 'HIGH'],
  social: ['INTROVERT', 'AMBIVERT', 'EXTROVERT'],
  temp: ['AC_LOVER', 'MODERATE', 'FAN_ONLY'],
  guest: ['RARELY', 'OCCASIONALLY', 'FREQUENTLY']
};

function getRandomChoice(arr, index) {
  return arr[index % arr.length];
}

async function seedPhase13() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
  });

  console.log(`Starting Phase 13 Idempotent Seeding on database: ${process.env.DB_NAME}...`);

  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // ==========================================
    // 1. ADMIN ACCOUNT
    // ==========================================
    console.log('1. Seeding Admin Account...');
    let adminId;
    const [existingAdminUser] = await pool.query('SELECT user_id FROM USER WHERE email = ?', ['admin@vit.ac.in']);
    if (existingAdminUser.length > 0) {
      adminId = existingAdminUser[0].user_id;
      await pool.query('UPDATE USER SET name = ?, password_hash = ?, role = ? WHERE user_id = ?', [
        'System Administrator', passwordHash, 'ADMIN', adminId
      ]);
    } else {
      const [res] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
        'System Administrator', 'admin@vit.ac.in', passwordHash, 'ADMIN'
      ]);
      adminId = res.insertId;
    }

    const [existingAdminProfile] = await pool.query('SELECT admin_id FROM ADMIN WHERE admin_id = ?', [adminId]);
    if (existingAdminProfile.length === 0) {
      await pool.query('INSERT INTO ADMIN (admin_id, employee_id, designation, phone) VALUES (?, ?, ?, ?)', [
        adminId, 'ADM001', 'Chief Hostel Warden', '9876543210'
      ]);
    }

    // ==========================================
    // 2. WARDEN ACCOUNTS & HOSTELS
    // ==========================================
    console.log('2. Seeding Hostels and Warden Accounts...');
    const hostelConfigs = [
      { name: 'MH-A', gender: 'MALE', location: 'North Campus', wardenEmail: 'warden@vit.ac.in', wardenName: 'MH-A Chief Warden', empId: 'WRD001' },
      { name: 'MH-B', gender: 'MALE', location: 'Central Campus', wardenEmail: 'warden.mhb@vit.ac.in', wardenName: 'MH-B Senior Warden', empId: 'WRD002' },
      { name: 'MH-C', gender: 'MALE', location: 'South Campus', wardenEmail: 'warden.mhc@vit.ac.in', wardenName: 'MH-C Associate Warden', empId: 'WRD003' },
      { name: 'LH-A', gender: 'FEMALE', location: 'East Campus', wardenEmail: 'warden.lha@vit.ac.in', wardenName: 'LH-A Chief Warden', empId: 'WRD004' },
      { name: 'LH-B', gender: 'FEMALE', location: 'West Campus', wardenEmail: 'warden.lhb@vit.ac.in', wardenName: 'LH-B Senior Warden', empId: 'WRD005' },
      { name: 'LH-C', gender: 'FEMALE', location: 'North-East Campus', wardenEmail: 'warden.lhc@vit.ac.in', wardenName: 'LH-C Associate Warden', empId: 'WRD006' }
    ];

    const hostelMap = {}; // name -> hostel_id

    for (const h of hostelConfigs) {
      // 2a. Upsert Warden User
      let wardenId;
      const [existingWardenUser] = await pool.query('SELECT user_id FROM USER WHERE email = ?', [h.wardenEmail]);
      if (existingWardenUser.length > 0) {
        wardenId = existingWardenUser[0].user_id;
        await pool.query('UPDATE USER SET name = ?, password_hash = ?, role = ? WHERE user_id = ?', [
          h.wardenName, passwordHash, 'WARDEN', wardenId
        ]);
      } else {
        const [wRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
          h.wardenName, h.wardenEmail, passwordHash, 'WARDEN'
        ]);
        wardenId = wRes.insertId;
      }

      // 2b. Upsert Warden Record (without hostel_id first if new)
      const [existingWarden] = await pool.query('SELECT warden_id FROM WARDEN WHERE warden_id = ?', [wardenId]);
      if (existingWarden.length === 0) {
        await pool.query('INSERT INTO WARDEN (warden_id, employee_id, phone) VALUES (?, ?, ?)', [
          wardenId, h.empId, '9876543200'
        ]);
      }

      // 2c. Upsert Hostel
      let hostelId;
      const [existingHostel] = await pool.query('SELECT hostel_id FROM HOSTEL WHERE name = ?', [h.name]);
      if (existingHostel.length > 0) {
        hostelId = existingHostel[0].hostel_id;
        await pool.query('UPDATE HOSTEL SET gender = ?, location = ?, hostel_type = ?, total_capacity = ?, warden_id = ? WHERE hostel_id = ?', [
          h.gender, h.location, 'UG', 120, wardenId, hostelId
        ]);
      } else {
        const [hRes] = await pool.query('INSERT INTO HOSTEL (name, gender, location, hostel_type, total_capacity, warden_id) VALUES (?, ?, ?, ?, ?, ?)', [
          h.name, h.gender, h.location, 'UG', 120, wardenId
        ]);
        hostelId = hRes.insertId;
      }

      // 2d. Update Warden's assigned hostel_id
      await pool.query('UPDATE WARDEN SET hostel_id = ? WHERE warden_id = ?', [hostelId, wardenId]);

      hostelMap[h.name] = hostelId;
    }

    // ==========================================
    // 3. ROOM TYPES
    // ==========================================
    console.log('3. Seeding Room Types...');
    const roomTypeConfigs = [
      { type_name: '1_BED_AC', capacity: 1, has_ac: true, description: 'Single Bed with Air Conditioning' },
      { type_name: '1_BED_NON_AC', capacity: 1, has_ac: false, description: 'Single Bed Non-AC' },
      { type_name: '2_BED_AC', capacity: 2, has_ac: true, description: 'Double Bed with Air Conditioning' },
      { type_name: '2_BED_NON_AC', capacity: 2, has_ac: false, description: 'Double Bed Non-AC' },
      { type_name: '4_BED_AC', capacity: 4, has_ac: true, description: 'Four Bed with Air Conditioning' },
      { type_name: '4_BED_NON_AC', capacity: 4, has_ac: false, description: 'Four Bed Non-AC' },
      { type_name: '6_BED_AC', capacity: 6, has_ac: true, description: 'Six Bed with Air Conditioning' },
      { type_name: '6_BED_NON_AC', capacity: 6, has_ac: false, description: 'Six Bed Non-AC' }
    ];

    const roomTypeMap = {}; // type_name -> room_type_id
    for (const rt of roomTypeConfigs) {
      const [existing] = await pool.query('SELECT room_type_id FROM ROOM_TYPE WHERE type_name = ?', [rt.type_name]);
      if (existing.length > 0) {
        roomTypeMap[rt.type_name] = existing[0].room_type_id;
        await pool.query('UPDATE ROOM_TYPE SET capacity = ?, has_ac = ?, description = ? WHERE room_type_id = ?', [
          rt.capacity, rt.has_ac, rt.description, existing[0].room_type_id
        ]);
      } else {
        const [res] = await pool.query('INSERT INTO ROOM_TYPE (type_name, capacity, has_ac, description) VALUES (?, ?, ?, ?)', [
          rt.type_name, rt.capacity, rt.has_ac, rt.description
        ]);
        roomTypeMap[rt.type_name] = res.insertId;
      }
    }

    // ==========================================
    // 4. ROOMS INVENTORY
    // ==========================================
    console.log('4. Seeding Rooms Inventory across 6 hostels...');
    // We create 10 rooms per hostel (Floors 1 to 5)
    const roomPlan = [
      { room_number: '101', floor: 1, type_name: '1_BED_AC', capacity: 1, status: 'AVAILABLE' },
      { room_number: '102', floor: 1, type_name: '1_BED_NON_AC', capacity: 1, status: 'AVAILABLE' },
      { room_number: '201', floor: 2, type_name: '2_BED_AC', capacity: 2, status: 'AVAILABLE' },
      { room_number: '202', floor: 2, type_name: '2_BED_NON_AC', capacity: 2, status: 'AVAILABLE' },
      { room_number: '301', floor: 3, type_name: '4_BED_AC', capacity: 4, status: 'AVAILABLE' },
      { room_number: '302', floor: 3, type_name: '4_BED_NON_AC', capacity: 4, status: 'AVAILABLE' },
      { room_number: '401', floor: 4, type_name: '6_BED_AC', capacity: 6, status: 'AVAILABLE' },
      { room_number: '402', floor: 4, type_name: '6_BED_NON_AC', capacity: 6, status: 'AVAILABLE' },
      { room_number: '501', floor: 5, type_name: '2_BED_AC', capacity: 2, status: 'AVAILABLE' },
      { room_number: '502', floor: 5, type_name: '4_BED_NON_AC', capacity: 4, status: 'AVAILABLE' }
    ];

    const roomLookup = {}; // `${hostelName}_${roomNumber}` -> room_id

    for (const [hostelName, hostelId] of Object.entries(hostelMap)) {
      for (const r of roomPlan) {
        const roomTypeId = roomTypeMap[r.type_name];
        let initialStatus = r.status;
        
        // For MH-A and LH-A, room 501 is designated as MAINTENANCE
        if ((hostelName === 'MH-A' || hostelName === 'LH-A') && r.room_number === '501') {
          initialStatus = 'MAINTENANCE';
        }

        const [existingRoom] = await pool.query('SELECT room_id FROM ROOM WHERE hostel_id = ? AND room_number = ?', [
          hostelId, r.room_number
        ]);

        let roomId;
        if (existingRoom.length > 0) {
          roomId = existingRoom[0].room_id;
          await pool.query('UPDATE ROOM SET floor = ?, room_type_id = ?, capacity = ?, status = ? WHERE room_id = ?', [
            r.floor, roomTypeId, r.capacity, initialStatus, roomId
          ]);
        } else {
          const [res] = await pool.query('INSERT INTO ROOM (hostel_id, room_number, floor, room_type_id, capacity, occupied_beds, status) VALUES (?, ?, ?, ?, ?, 0, ?)', [
            hostelId, r.room_number, r.floor, roomTypeId, r.capacity, initialStatus
          ]);
          roomId = res.insertId;
        }

        roomLookup[`${hostelName}_${r.room_number}`] = roomId;
      }
    }

    // ==========================================
    // 5. 100 REALISTIC STUDENTS (50 BOYS, 50 GIRLS)
    // ==========================================
    console.log('5. Seeding 100 Realistic Students (50 Boys, 50 Girls)...');
    const students = [];

    // Interleave ranks: Boys = Odd ranks (1, 3, ..., 99), Girls = Even ranks (2, 4, ..., 100)
    for (let i = 0; i < 50; i++) {
      // Boy
      const boyRank = (i * 2) + 1; // 1, 3, 5, ..., 99
      const boyCourse = BOY_COURSES[Math.floor(i / 10)]; // 10 per course
      const boyRoll = String(1001 + i).padStart(4, '0');
      const boyRegNo = `24${boyCourse}${boyRoll}`;
      const boyName = BOY_NAMES[i];
      const boyEmailSlug = boyName.toLowerCase().replace(/[^a-z]/g, '.');
      const boyEmail = `${boyEmailSlug}24@vitstudent.ac.in`;
      const boyCgpa = Number((9.95 - (boyRank - 1) * 0.0247).toFixed(2));

      students.push({
        name: boyName,
        email: boyEmail,
        reg_no: boyRegNo,
        gender: 'MALE',
        department: boyCourse,
        cgpa: boyCgpa,
        academic_rank: boyRank,
        year: 2,
        phone: `98765${String(10000 + i).slice(1)}`
      });

      // Girl
      const girlRank = (i * 2) + 2; // 2, 4, 6, ..., 100
      const girlCourse = GIRL_COURSES[Math.floor(i / 10)]; // 10 per course
      const girlRoll = String(2001 + i).padStart(4, '0');
      const girlRegNo = `24${girlCourse}${girlRoll}`;
      const girlName = GIRL_NAMES[i];
      const girlEmailSlug = girlName.toLowerCase().replace(/[^a-z]/g, '.');
      const girlEmail = `${girlEmailSlug}24@vitstudent.ac.in`;
      const girlCgpa = Number((9.95 - (girlRank - 1) * 0.0247).toFixed(2));

      students.push({
        name: girlName,
        email: girlEmail,
        reg_no: girlRegNo,
        gender: 'FEMALE',
        department: girlCourse,
        cgpa: girlCgpa,
        academic_rank: girlRank,
        year: 2,
        phone: `98766${String(10000 + i).slice(1)}`
      });
    }

    // Sort by rank ascending to ensure clean processing
    students.sort((a, b) => a.academic_rank - b.academic_rank);

    const studentMap = {}; // rank -> { student_id, ...student }

    for (const s of students) {
      // 5a. Upsert USER
      const studentRootPassword = s.email.split('@')[0];
      const studentPasswordHash = await bcrypt.hash(studentRootPassword, 10);

      let userId;
      const [existingUser] = await pool.query('SELECT user_id FROM USER WHERE email = ?', [s.email]);
      if (existingUser.length > 0) {
        userId = existingUser[0].user_id;
        await pool.query('UPDATE USER SET name = ?, password_hash = ?, role = ? WHERE user_id = ?', [
          s.name, studentPasswordHash, 'STUDENT', userId
        ]);
      } else {
        const [uRes] = await pool.query('INSERT INTO USER (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
          s.name, s.email, studentPasswordHash, 'STUDENT'
        ]);
        userId = uRes.insertId;
      }

      // 5b. Upsert STUDENT
      const [existingStudent] = await pool.query('SELECT student_id FROM STUDENT WHERE student_id = ?', [userId]);
      if (existingStudent.length > 0) {
        await pool.query(
          'UPDATE STUDENT SET reg_no = ?, cgpa = ?, academic_rank = ?, gender = ?, department = ?, year = ?, phone = ? WHERE student_id = ?',
          [s.reg_no, s.cgpa, s.academic_rank, s.gender, s.department, s.year, s.phone, userId]
        );
      } else {
        await pool.query(
          'INSERT INTO STUDENT (student_id, reg_no, cgpa, academic_rank, gender, department, year, phone, allocation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, s.reg_no, s.cgpa, s.academic_rank, s.gender, s.department, s.year, s.phone, 'PENDING']
        );
      }

      // 5c. Upsert COMPATIBILITY_PROFILE
      const [existingProfile] = await pool.query('SELECT profile_id FROM COMPATIBILITY_PROFILE WHERE student_id = ?', [userId]);
      if (existingProfile.length === 0) {
        await pool.query(
          `INSERT INTO COMPATIBILITY_PROFILE 
           (student_id, sleep_schedule, study_habits, cleanliness, noise_tolerance, social_preference, temperature_preference, guest_preference)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            getRandomChoice(HABIT_PREFERENCES.sleep, s.academic_rank),
            getRandomChoice(HABIT_PREFERENCES.study, s.academic_rank),
            getRandomChoice(HABIT_PREFERENCES.clean, s.academic_rank),
            getRandomChoice(HABIT_PREFERENCES.noise, s.academic_rank),
            getRandomChoice(HABIT_PREFERENCES.social, s.academic_rank),
            getRandomChoice(HABIT_PREFERENCES.temp, s.academic_rank),
            getRandomChoice(HABIT_PREFERENCES.guest, s.academic_rank)
          ]
        );
      }

      studentMap[s.academic_rank] = { ...s, student_id: userId };
    }

    // ==========================================
    // 6. COUNSELLING SESSION & SLOTS
    // ==========================================
    console.log('6. Seeding Counselling Session and Slots...');
    let sessionId;
    const [existingSession] = await pool.query('SELECT session_id FROM COUNSELLING_SESSION WHERE academic_year = ?', ['2026-2027']);
    const sessionStart = new Date(Date.now() - 1000); // starts now
    const sessionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days later

    if (existingSession.length > 0) {
      sessionId = existingSession[0].session_id;
      await pool.query('UPDATE COUNSELLING_SESSION SET start_date = ?, end_date = ?, slot_duration_minutes = ?, status = ?, created_by = ? WHERE session_id = ?', [
        sessionStart, sessionEnd, 3, 'ACTIVE', adminId, sessionId
      ]);
    } else {
      const [res] = await pool.query('INSERT INTO COUNSELLING_SESSION (academic_year, start_date, end_date, slot_duration_minutes, status, created_by) VALUES (?, ?, ?, ?, ?, ?)', [
        '2026-2027', sessionStart, sessionEnd, 3, 'ACTIVE', adminId
      ]);
      sessionId = res.insertId;
    }

    // Seed Slots for all 100 students
    // Ranks 1 to 88 will be PENDING in the queue
    // Ranks 89 to 100 will be pre-allocated for test scenarios
    let currentSlotTime = new Date(sessionStart.getTime());
    const slotDurationMs = 3 * 60 * 1000;

    for (let rank = 1; rank <= 100; rank++) {
      const st = studentMap[rank];
      const slotStartTime = new Date(currentSlotTime.getTime());
      const slotEndTime = new Date(slotStartTime.getTime() + slotDurationMs);

      const [existingSlot] = await pool.query('SELECT slot_id FROM COUNSELLING_SLOT WHERE session_id = ? AND student_id = ?', [
        sessionId, st.student_id
      ]);

      if (existingSlot.length > 0) {
        // Slot exists; keep in sync
        await pool.query(
          'UPDATE COUNSELLING_SLOT SET start_time = ?, end_time = ? WHERE slot_id = ?',
          [slotStartTime, slotEndTime, existingSlot[0].slot_id]
        );
        st.slot_id = existingSlot[0].slot_id;
      } else {
        const [res] = await pool.query(
          'INSERT INTO COUNSELLING_SLOT (session_id, student_id, start_time, end_time, status, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          [sessionId, st.student_id, slotStartTime, slotEndTime, 'PENDING', false]
        );
        st.slot_id = res.insertId;
      }

      currentSlotTime = slotEndTime;
    }

    // ==========================================
    // 7. CONTROLLED TEST ALLOCATIONS
    // ==========================================
    console.log('7. Preparing Controlled Room Allocations for Occupancy Scenarios...');
    // Clear any previous allocations for our seeded test students (idempotent setup)
    // To preserve idempotency, we assign allocations specifically to ranks 89-100:
    // Boys: Ranks 89, 91, 93, 95, 97, 99
    // Girls: Ranks 90, 92, 94, 96, 98, 100

    const allocationScenarios = [
      // MH-A Boys allocations
      { rank: 89, hostel: 'MH-A', room_number: '102' }, // 1-bed NON-AC -> becomes FULL (1/1)
      { rank: 91, hostel: 'MH-A', room_number: '201' }, // 2-bed AC -> becomes PARTIALLY_FILLED (1/2)
      { rank: 93, hostel: 'MH-A', room_number: '202' }, // 2-bed NON-AC -> bed 1/2
      { rank: 95, hostel: 'MH-A', room_number: '202' }, // 2-bed NON-AC -> bed 2/2 -> becomes FULL (2/2)
      { rank: 97, hostel: 'MH-A', room_number: '301' }, // 4-bed AC -> bed 1/4
      { rank: 99, hostel: 'MH-A', room_number: '301' }, // 4-bed AC -> bed 2/4 -> becomes PARTIALLY_FILLED (2/4)

      // LH-A Girls allocations
      { rank: 90, hostel: 'LH-A', room_number: '102' }, // 1-bed NON-AC -> becomes FULL (1/1)
      { rank: 92, hostel: 'LH-A', room_number: '201' }, // 2-bed AC -> becomes PARTIALLY_FILLED (1/2)
      { rank: 94, hostel: 'LH-A', room_number: '202' }, // 2-bed NON-AC -> bed 1/2
      { rank: 96, hostel: 'LH-A', room_number: '202' }, // 2-bed NON-AC -> bed 2/2 -> becomes FULL (2/2)
      { rank: 98, hostel: 'LH-A', room_number: '301' }, // 4-bed AC -> bed 1/4
      { rank: 100, hostel: 'LH-A', room_number: '301' }  // 4-bed AC -> bed 2/4 -> becomes PARTIALLY_FILLED (2/4)
    ];

    for (const alloc of allocationScenarios) {
      const st = studentMap[alloc.rank];
      const roomId = roomLookup[`${alloc.hostel}_${alloc.room_number}`];

      // Upsert ALLOCATION
      const [existingAlloc] = await pool.query('SELECT allocation_id FROM ALLOCATION WHERE student_id = ? AND room_id = ?', [
        st.student_id, roomId
      ]);

      if (existingAlloc.length === 0) {
        await pool.query(
          `INSERT INTO ALLOCATION (student_id, slot_id, room_id, allocation_type, status, confirmed_at)
           VALUES (?, ?, ?, 'SELF', 'CONFIRMED', NOW())`,
          [st.student_id, st.slot_id, roomId]
        );
      }

      // Mark Student CONFIRMED
      await pool.query("UPDATE STUDENT SET allocation_status = 'CONFIRMED' WHERE student_id = ?", [st.student_id]);

      // Mark Slot COMPLETED
      await pool.query("UPDATE COUNSELLING_SLOT SET status = 'COMPLETED', is_active = FALSE WHERE student_id = ?", [st.student_id]);
    }

    // Recalculate occupied beds and room status for ALL rooms to guarantee authoritative consistency
    console.log('8. Syncing authoritative room occupancy and status...');
    const [allRooms] = await pool.query('SELECT r.room_id, r.capacity, r.status, COUNT(a.allocation_id) as active_allocs FROM ROOM r LEFT JOIN ALLOCATION a ON r.room_id = a.room_id AND a.status IN (\'CONFIRMED\', \'LOCKED\') GROUP BY r.room_id, r.capacity, r.status');

    for (const r of allRooms) {
      if (r.status === 'MAINTENANCE') {
        await pool.query('UPDATE ROOM SET occupied_beds = ? WHERE room_id = ?', [r.active_allocs, r.room_id]);
      } else {
        let newStatus = 'AVAILABLE';
        if (r.active_allocs === r.capacity) {
          newStatus = 'FULL';
        } else if (r.active_allocs > 0) {
          newStatus = 'PARTIALLY_FILLED';
        }
        await pool.query('UPDATE ROOM SET occupied_beds = ?, status = ? WHERE room_id = ?', [
          r.active_allocs, newStatus, r.room_id
        ]);
      }
    }

    // Set Ranks 1 to 88 as explicitly PENDING in queue with inactive slot
    for (let r = 1; r <= 88; r++) {
      const st = studentMap[r];
      await pool.query("UPDATE STUDENT SET allocation_status = 'PENDING' WHERE student_id = ?", [st.student_id]);
      await pool.query("UPDATE COUNSELLING_SLOT SET status = 'PENDING', is_active = FALSE WHERE student_id = ?", [st.student_id]);
    }

    console.log('====================================================');
    console.log('Phase 13 Seeding Completed Successfully!');
    console.log('Summary:');
    console.log('- 100 Students seeded (50 MALE, 50 FEMALE)');
    console.log('- Academic ranks 1 to 100 interleaved between genders');
    console.log('- 6 Hostels (3 Boys: MH-A, MH-B, MH-C; 3 Girls: LH-A, LH-B, LH-C)');
    console.log('- 8 Room Types (1, 2, 4, 6 beds AC & Non-AC)');
    console.log('- 60 Rooms created across all hostels');
    console.log('- 1 Active Counselling Session (2026-2027)');
    console.log('- 100 Counselling Slots created');
    console.log('- 12 Controlled Allocations created for occupancy scenarios');
    console.log('- Ranks 1 to 88 are PENDING in queue, ready for test validation');
    console.log('====================================================');

  } catch (error) {
    console.error('Phase 13 Seeding Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedPhase13()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedPhase13 };
