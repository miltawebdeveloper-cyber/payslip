require('dotenv').config();
const fs = require('fs');
const path = require('path');

// The bundled Milta logo, inlined as a data URI so Puppeteer can render it
// without network access and the preview API can hand over the same image.
const BUNDLED_LOGO_URL = `data:image/svg+xml;base64,${fs
  .readFileSync(path.join(__dirname, '..', 'assets', 'logo.svg'))
  .toString('base64')}`;

module.exports = {
  name: process.env.COMPANY_NAME || 'Milta Accounting Services Pvt.Ltd',
  address:
    process.env.COMPANY_ADDRESS ||
    'No 175, Sri Sai Tower, 3rd floor, Bharathi Colony Rd, Peelamedu, Coimbatore, Tamil Nadu 641004',
  phone: process.env.COMPANY_PHONE || '+91 9600103723',
  logoUrl: process.env.COMPANY_LOGO_URL || BUNDLED_LOGO_URL,
};
