
require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [tables] = await connection.query('SHOW TABLES');

    console.log(`Tables in ${process.env.DB_NAME}:`);
    console.table(tables);

    try {
      const [migrations] = await connection.query(
        'SELECT migration_name FROM migration_history'
      );

      console.log('Recorded migrations:');
      console.table(migrations);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('migration_history table does not exist.');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Database check failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

checkDatabase();
