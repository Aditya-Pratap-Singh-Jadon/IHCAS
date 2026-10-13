const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function exportDatabaseUsers() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'ihcas_app',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ihcas_dev'
  });

  console.log('Connected to database:', process.env.DB_NAME);

  // 1. Admins
  const [admins] = await conn.query(`
    SELECT u.user_id, u.name, u.email, u.role, u.is_active, u.created_at,
           a.employee_id, a.designation, a.phone
    FROM user u
    LEFT JOIN admin a ON u.user_id = a.admin_id
    WHERE u.role = 'ADMIN'
    ORDER BY u.user_id ASC
  `);

  const formattedAdmins = admins.map(a => ({
    ...a,
    login_credentials: {
      email: a.email,
      password: 'DemoPassword123!'
    }
  }));

  // 2. Wardens
  const [wardens] = await conn.query(`
    SELECT u.user_id, u.name, u.email, u.role, u.is_active, u.created_at,
           w.employee_id, w.phone, w.hostel_id,
           h.name AS hostel_name, h.gender AS hostel_gender, h.location AS hostel_location,
           h.hostel_type, h.total_capacity AS hostel_capacity
    FROM user u
    LEFT JOIN warden w ON u.user_id = w.warden_id
    LEFT JOIN hostel h ON w.hostel_id = h.hostel_id
    WHERE u.role = 'WARDEN'
    ORDER BY u.user_id ASC
  `);

  const formattedWardens = wardens.map(w => ({
    ...w,
    login_credentials: {
      email: w.email,
      password: 'DemoPassword123!'
    }
  }));

  // 3. Students
  const [students] = await conn.query(`
    SELECT u.user_id, u.name, u.email, u.role, u.is_active, u.created_at,
           s.reg_no, s.cgpa, s.academic_rank, s.gender, s.department, s.year, s.phone, s.allocation_status,
           cp.sleep_schedule, cp.study_habits, cp.cleanliness, cp.noise_tolerance,
           cp.social_preference, cp.temperature_preference, cp.guest_preference,
           cs.slot_id, cs.session_id, cs.start_time AS slot_start_time, cs.end_time AS slot_end_time,
           cs.status AS slot_status, cs.is_active AS slot_is_active,
           al.allocation_id, al.allocation_type, al.status AS allocation_status_record,
           al.allocated_at, al.confirmed_at, al.locked_at,
           rm.room_number, rm.floor AS room_floor,
           rt.type_name AS room_type_name, rt.has_ac AS room_has_ac,
           hst.name AS allocated_hostel_name
    FROM user u
    LEFT JOIN student s ON u.user_id = s.student_id
    LEFT JOIN compatibility_profile cp ON u.user_id = cp.student_id
    LEFT JOIN counselling_slot cs ON u.user_id = cs.student_id
    LEFT JOIN allocation al ON u.user_id = al.student_id
    LEFT JOIN room rm ON al.room_id = rm.room_id
    LEFT JOIN room_type rt ON rm.room_type_id = rt.room_type_id
    LEFT JOIN hostel hst ON rm.hostel_id = hst.hostel_id
    WHERE u.role = 'STUDENT'
    ORDER BY s.academic_rank ASC, u.user_id ASC
  `);

  const formattedStudents = students.map(s => {
    const rootPassword = s.email ? s.email.split('@')[0] : '';
    return {
      user_id: s.user_id,
      name: s.name,
      email: s.email,
      role: s.role,
      is_active: Boolean(s.is_active),
      created_at: s.created_at,
      student_profile: {
        reg_no: s.reg_no,
        academic_rank: s.academic_rank,
        cgpa: s.cgpa ? parseFloat(s.cgpa) : null,
        gender: s.gender,
        department: s.department,
        year: s.year,
        phone: s.phone,
        allocation_status: s.allocation_status
      },
      compatibility_profile: s.sleep_schedule ? {
        sleep_schedule: s.sleep_schedule,
        study_habits: s.study_habits,
        cleanliness: s.cleanliness,
        noise_tolerance: s.noise_tolerance,
        social_preference: s.social_preference,
        temperature_preference: s.temperature_preference,
        guest_preference: s.guest_preference
      } : null,
      counselling_slot: s.slot_id ? {
        slot_id: s.slot_id,
        session_id: s.session_id,
        start_time: s.slot_start_time,
        end_time: s.slot_end_time,
        status: s.slot_status,
        is_active: Boolean(s.slot_is_active)
      } : null,
      allocation: s.allocation_id ? {
        allocation_id: s.allocation_id,
        allocation_type: s.allocation_type,
        status: s.allocation_status_record,
        allocated_at: s.allocated_at,
        confirmed_at: s.confirmed_at,
        locked_at: s.locked_at,
        hostel: s.allocated_hostel_name,
        room_number: s.room_number,
        floor: s.room_floor,
        room_type: s.room_type_name,
        has_ac: Boolean(s.room_has_ac)
      } : null,
      login_credentials: {
        email: s.email,
        password: rootPassword,
        note: 'Password is set to root part of email'
      }
    };
  });

  const exportData = {
    exported_at: new Date().toISOString(),
    database: process.env.DB_NAME,
    summary: {
      total_admins: formattedAdmins.length,
      total_wardens: formattedWardens.length,
      total_students: formattedStudents.length,
      total_users: formattedAdmins.length + formattedWardens.length + formattedStudents.length
    },
    default_passwords_summary: {
      admin: 'DemoPassword123!',
      warden: 'DemoPassword123!',
      students: 'root part of their email (e.g. for student@vitstudent.ac.in -> "student", for aarav.sharma24@vitstudent.ac.in -> "aarav.sharma24")'
    },
    admins: formattedAdmins,
    wardens: formattedWardens,
    students: formattedStudents
  };

  // Paths to save
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const backendDbDir = path.resolve(__dirname, '../database');

  const jsonFilename = 'ihcas_database_users.json';
  const mdFilename = 'ihcas_database_users.md';

  // Write JSON
  const jsonContent = JSON.stringify(exportData, null, 2);
  fs.writeFileSync(path.join(workspaceRoot, jsonFilename), jsonContent);
  fs.writeFileSync(path.join(backendDbDir, jsonFilename), jsonContent);
  console.log(`Saved JSON export to:\n  - ${path.join(workspaceRoot, jsonFilename)}\n  - ${path.join(backendDbDir, jsonFilename)}`);

  // Generate Markdown
  let md = `# IHCAS Database Users & Credentials Export\n\n`;
  md += `**Export Date:** ${exportData.exported_at}  \n`;
  md += `**Database:** \`${exportData.database}\`  \n\n`;
  md += `## Summary\n`;
  md += `- **Total Users:** ${exportData.summary.total_users}\n`;
  md += `- **Admins:** ${exportData.summary.total_admins}\n`;
  md += `- **Wardens:** ${exportData.summary.total_wardens}\n`;
  md += `- **Students:** ${exportData.summary.total_students}\n\n`;

  md += `## Authentication Rules\n`;
  md += `> [!IMPORTANT]\n`;
  md += `> - **Admin Password:** \`DemoPassword123!\`\n`;
  md += `> - **Warden Password:** \`DemoPassword123!\`\n`;
  md += `> - **Student Password:** Exactly the **root part of their email** (i.e. the portion before the \`@\`).\n`;
  md += `>   - Example: \`aarav.sharma24@vitstudent.ac.in\` -> password: \`aarav.sharma24\`\n`;
  md += `>   - Example: \`student@vitstudent.ac.in\` -> password: \`student\`\n\n`;

  md += `## 1. Administrators\n\n`;
  md += `| User ID | Name | Email | Password | Employee ID | Designation | Phone |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (const a of formattedAdmins) {
    md += `| ${a.user_id} | ${a.name} | \`${a.email}\` | \`${a.login_credentials.password}\` | ${a.employee_id} | ${a.designation} | ${a.phone} |\n`;
  }
  md += `\n`;

  md += `## 2. Wardens\n\n`;
  md += `| User ID | Name | Email | Password | Employee ID | Assigned Hostel | Location | Phone |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  for (const w of formattedWardens) {
    md += `| ${w.user_id} | ${w.name} | \`${w.email}\` | \`${w.login_credentials.password}\` | ${w.employee_id} | ${w.hostel_name || 'N/A'} (${w.hostel_gender || ''}) | ${w.hostel_location || 'N/A'} | ${w.phone} |\n`;
  }
  md += `\n`;

  md += `## 3. Students (All 101 Accounts)\n\n`;
  md += `| Rank | Reg No | Name | Email (Login ID) | Password (Root) | Gender | Dept | CGPA | Phone | Status | Assigned Room |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const s of formattedStudents) {
    const p = s.student_profile;
    const roomStr = s.allocation ? `${s.allocation.hostel} ${s.allocation.room_number}` : 'None';
    md += `| ${p.academic_rank ?? '-'} | ${p.reg_no ?? '-'} | ${s.name} | \`${s.email}\` | \`${s.login_credentials.password}\` | ${p.gender ?? '-'} | ${p.department ?? '-'} | ${p.cgpa ?? '-'} | ${p.phone ?? '-'} | ${p.allocation_status ?? '-'} | ${roomStr} |\n`;
  }
  md += `\n`;

  fs.writeFileSync(path.join(workspaceRoot, mdFilename), md);
  fs.writeFileSync(path.join(backendDbDir, mdFilename), md);
  console.log(`Saved Markdown export to:\n  - ${path.join(workspaceRoot, mdFilename)}\n  - ${path.join(backendDbDir, mdFilename)}`);

  await conn.end();
}

exportDatabaseUsers().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
