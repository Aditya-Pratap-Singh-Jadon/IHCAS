const { ZodError } = require('zod');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error && error.name === 'ZodError') {
        const err = new Error('Validation failed');
        err.statusCode = 400;
        err.details = error.issues || error.errors || [];
        return next(err);
      }
      next(error);
    }
  };
};

module.exports = validate;
