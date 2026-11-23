// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const body = { message: err.message || 'Something went wrong on the server' };
  if (Array.isArray(err.errors)) body.errors = err.errors;
  res.status(statusCode).json(body);
}

module.exports = errorHandler;
