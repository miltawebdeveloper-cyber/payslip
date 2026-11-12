const { ValidationError, UniqueConstraintError } = require('sequelize');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ValidationError || err instanceof UniqueConstraintError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.errors.map((e) => e.message),
    });
  }

  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    message: err.message || 'Something went wrong on the server',
  });
}

module.exports = errorHandler;
