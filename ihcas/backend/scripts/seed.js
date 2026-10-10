require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');

async function seed() {
  const dbName = process.env.DB_NAME || 'ihcas_db';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    multipleStatements: true
  });

  try {
    console.log(`Connected to MySQL database ${dbName}.`);
    const seedFile = path.join(__dirname, '..', 'database', 'seed.sql');
    console.log(`Applying seed data from ${seedFile}`);
    const sql = await fs.readFile(seedFile, 'utf8');
    
    await connection.query(sql);
    console.log('Seed data inserted successfully.');
  } catch (error) {
    console.error('Failed to seed database:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
