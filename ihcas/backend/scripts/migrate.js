require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');
async function migrate() {const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true
});

const dbName = process.env.DB_NAME;

  try {
    console.log('Connected to MySQL. Setting up database...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    console.log('Connected to MySQL. Checking migrations table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    const [rows] = await connection.query('SELECT migration_name FROM migration_history');
    const appliedMigrations = new Set(rows.map(r => r.migration_name));

    const dbDir = path.join(__dirname, '..', 'database');
    
    // First, schema.sql is our initial migration
    const schemaFile = 'schema.sql';
    if (!appliedMigrations.has(schemaFile)) {
      console.log(`Applying initial schema: ${schemaFile}`);
      const sql = await fs.readFile(path.join(dbDir, schemaFile), 'utf8');
      
      // We start transaction
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.query('INSERT INTO migration_history (migration_name) VALUES (?)', [schemaFile]);
        await connection.commit();
        console.log(`Successfully applied ${schemaFile}`);
      } catch (err) {
        await connection.rollback();
        console.error(`Failed to apply ${schemaFile}`);
        throw err;
      }
    } else {
      console.log(`${schemaFile} already applied.`);
    }

    // Now check for subsequent migrations in database/migrations/
    const migrationsDir = path.join(dbDir, 'migrations');
    try {
      await fs.access(migrationsDir);
      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

      for (const file of sqlFiles) {
        if (!appliedMigrations.has(file)) {
          console.log(`Applying migration: ${file}`);
          const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
          await connection.beginTransaction();
          try {
            await connection.query(sql);
            await connection.query('INSERT INTO migration_history (migration_name) VALUES (?)', [file]);
            await connection.commit();
            appliedMigrations.add(file);
            console.log(`Successfully applied ${file}`);
          } catch (err) {
            await connection.rollback();
            console.error(`Failed to apply ${file}`);
            throw err;
          }
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err; // Ignore if migrations folder doesn't exist yet
    }

    console.log('All migrations applied successfully.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
