const pool = require('../config/db');

const createNotification = async (userId, title, message, type, conn = pool) => {
  await conn.query(
    'INSERT INTO NOTIFICATION (user_id, title, message, type) VALUES (?, ?, ?, ?)',
    [userId, title, message, type]
  );
};

module.exports = {
  createNotification
};
