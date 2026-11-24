const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const salaryDataRoutes = require('./routes/salaryDataRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const googleRoutes = require('./routes/googleRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

// Exposed so a frontend on another origin can still read the download's
// file name and the Google Drive save result (see payslipController).
app.use(cors({
  origin: allowedOrigins,
  exposedHeaders: ['Content-Disposition', 'X-Drive-Saved', 'X-Drive-Total', 'X-Drive-Error'],
}));
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api', (req, res) => res.json({ status: 'ok', name: 'Payslip Generator API' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/salary-data', salaryDataRoutes);
app.use('/api/payslip', payslipRoutes);
app.use('/api/google', googleRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
