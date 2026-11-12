require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const { closeBrowser } = require('./services/pdfService');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    // Simple schema sync is enough for this internal utility; there are
    // no migrations to manage since the schema is small and stable. Only
    // auto-alter existing tables outside production to avoid surprise
    // destructive changes on a live database.
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    // eslint-disable-next-line no-console
    console.log('Database connected and synced.');

    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Payslip Generator API listening on port ${PORT}`);
    });

    const shutdown = async () => {
      server.close();
      await closeBrowser();
      await sequelize.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
