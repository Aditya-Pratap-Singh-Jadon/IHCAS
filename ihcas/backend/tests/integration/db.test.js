require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');

let connection;
const dbName = process.env.TEST_DB_NAME || 'ihcas_test_db';

beforeAll(async () => {
  try {
    const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD'];

    for (const key of requiredEnv) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    // Connect to the dedicated test database.
    // It must already exist, and the configured user must have
    // permissions on it. Do not create or drop databases here.
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: dbName,
      multipleStatements: true,
    });

    console.log(`Connected to test database ${dbName}.`);

    // Ensure a clean slate by dropping existing tables
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await connection.query('SHOW TABLES');
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const schemaPath = path.join(
      __dirname, '..', '..', 'database', 'schema.sql'
    );
    const schemaSql = await fs.readFile(schemaPath, 'utf8');

    await connection.query(schemaSql);
  } catch (error) {
    console.error('Failed to set up test database:', error.message);
    throw error;
  }
});

afterAll(async () => {
  if (connection) {
    await connection.end();
  }
});

describe('Database Integration Tests', () => {
  it('should have created the necessary tables', async () => {
    const [rows] = await connection.query('SHOW TABLES');
    expect(rows.length).toBeGreaterThan(0);
    const tables = rows.map(r => Object.values(r)[0].toLowerCase());
    expect(tables).toContain('student');
    expect(tables).toContain('room');
    expect(tables).toContain('allocation');
  });

  it('should enforce unique registration number for STUDENT', async () => {
    await connection.query(`INSERT INTO USER (name, email, password_hash, role) VALUES ('Test Student 1', 'test1@test.com', 'hash', 'STUDENT')`);
    const [user] = await connection.query(`SELECT LAST_INSERT_ID() as id`);
    const userId1 = user[0].id;
    await connection.query(`INSERT INTO STUDENT (student_id, reg_no) VALUES (?, 'REG123')`, [userId1]);

    await connection.query(`INSERT INTO USER (name, email, password_hash, role) VALUES ('Test Student 2', 'test2@test.com', 'hash', 'STUDENT')`);
    const [user2] = await connection.query(`SELECT LAST_INSERT_ID() as id`);
    const userId2 = user2[0].id;
    
    await expect(
      connection.query(`INSERT INTO STUDENT (student_id, reg_no) VALUES (?, 'REG123')`, [userId2])
    ).rejects.toThrow(/Duplicate entry/);
  });

  it('should reject invalid foreign key reference', async () => {
    await expect(
      connection.query(`INSERT INTO ROOM (hostel_id, room_number, room_type_id, capacity) VALUES (9999, '101', 9999, 2)`)
    ).rejects.toThrow(/foreign key constraint fails/i);
  });

  it('should apply seed data successfully', async () => {
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');
    const seedSql = await fs.readFile(seedPath, 'utf8');
    await connection.query(seedSql);
    
    const [rows] = await connection.query(`SELECT * FROM HOSTEL`);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should rollback transaction on error', async () => {
    await connection.beginTransaction();
    await connection.query(`INSERT INTO USER (name, email, password_hash, role) VALUES ('Rollback User', 'rb@test.com', 'hash', 'STUDENT')`);
    await connection.rollback();
    
    const [rows] = await connection.query(`SELECT * FROM USER WHERE email = 'rb@test.com'`);
    expect(rows.length).toBe(0);
  });
});
