const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const counsellingRoutes = require('./modules/counselling/counselling.routes');
const allocationRoutes = require('./modules/allocation/allocation.routes');
const requestsRoutes = require('./modules/requests/requests.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const app = express();

// Security and reliability middleware
app.use(helmet()); // Set standard security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Restrictive CORS
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Limit each IP to 200 requests per `window`
  standardHeaders: true, 
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Body parsing with reasonable limits (lowered to 1mb for production safety)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
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
app.use('/api/inventory', inventoryRoutes);
app.use('/api/counselling', counsellingRoutes);
app.use('/api/allocation', allocationRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler
app.use((req, res, next) => {
  const err = new Error('Resource not found');
  err.statusCode = 404;
  next(err);
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
