function errorHandler(err, req, res, next) {
  // Log the error in a structured way (could use Winston or Pino, but a simple console logger is okay for this baseline)
  console.error(JSON.stringify({
    message: err.message,
    name: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  }));

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      // Include validation issues if available (e.g. from Zod or custom validator)
      details: err.details || undefined,
    }
  });
}

module.exports = errorHandler;
