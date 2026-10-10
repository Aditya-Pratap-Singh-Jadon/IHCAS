const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Application is responsive',
    timestamp: new Date().toISOString()
  });
});

router.get('/db', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT 1 as val');
    if (rows && rows.length > 0 && rows[0].val === 1) {
      res.status(200).json({
        success: true,
        message: 'Database is reachable',
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Database query did not return expected result');
    }
  } catch (error) {
    const err = new Error('Database connection failed');
    err.statusCode = 503;
    // We intentionally don't pass the real DB error to prevent leaking details
    next(err);
  }
});

module.exports = router;
