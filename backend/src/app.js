const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const salaryDataRoutes = require('./routes/salaryDataRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/salary-data', salaryDataRoutes);
app.use('/api/payslip', payslipRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
