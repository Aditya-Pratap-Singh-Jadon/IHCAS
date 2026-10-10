const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');

const app = express();

// Security and reliability middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Restrictive CORS
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Body parsing with reasonable limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Basic Request Logging (Structured but avoiding sensitive paths/bodies for now)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      ip: req.ip
    }));
  }
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// 404 Handler
app.use((req, res, next) => {
  const err = new Error('Resource not found');
  err.statusCode = 404;
  next(err);
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
