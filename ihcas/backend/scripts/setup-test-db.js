require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupTestDb() {
  const dbName = process.env.TEST_DB_NAME || 'ihcas_test_db';
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Test database ${dbName} is ready.`);
  } catch (error) {
    console.error('Failed to set up test database:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

setupTestDb();
