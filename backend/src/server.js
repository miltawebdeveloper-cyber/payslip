require('dotenv').config();
const app = require('./app');
const { closeBrowser } = require('./services/pdfService');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Payslip Generator API listening on port ${PORT}`);
  if (!process.env.GOOGLE_APPS_SCRIPT_URL) {
    // eslint-disable-next-line no-console
    console.warn('GOOGLE_APPS_SCRIPT_URL is not set: salary records cannot be read or saved.');
  }
});

const shutdown = async () => {
  server.close();
  await closeBrowser();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
