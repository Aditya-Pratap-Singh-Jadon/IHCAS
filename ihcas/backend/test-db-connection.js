require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [rows] = await connection.query(
      'SELECT DATABASE() AS db, VERSION() AS version'
    );

    console.log('Connected to MySQL successfully!');
    console.log('Database:', rows[0].db);
    console.log('MySQL version:', rows[0].version);
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

testConnection();
