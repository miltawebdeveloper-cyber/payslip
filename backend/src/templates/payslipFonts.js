const fs = require('fs');
const path = require('path');

/**
 * The payslip's font, Arimo (SIL Open Font License, see
 * assets/fonts/OFL-LICENSE.txt), inlined as @font-face rules.
 *
 * The PDF is rendered by whatever Chromium the server has, and their fonts
 * differ: Windows has Arial, Vercel's Chromium only has Open Sans, which is
 * wider. Embedding one font makes the payslip lay out identically
 * everywhere, so the column widths fit the same way on every machine. Arimo
 * has the same letter widths as Arial.
 *
 * Each file is read with its own literal path (like the logo in
 * config/company.js) so the deployment tracer includes it.
 */
function readFont(filePath) {
  try {
    return fs.readFileSync(filePath).toString('base64');
  } catch (err) {
    // Without the file the payslip still renders, in a fallback font.
    // eslint-disable-next-line no-console
    console.warn(`Payslip font missing, using a fallback font: ${err.message}`);
    return null;
  }
}

const FACES = [
  { weight: 400, style: 'normal', data: readFont(path.join(__dirname, '..', 'assets', 'fonts', 'arimo-latin-400-normal.woff2')) },
  { weight: 600, style: 'normal', data: readFont(path.join(__dirname, '..', 'assets', 'fonts', 'arimo-latin-600-normal.woff2')) },
  { weight: 700, style: 'normal', data: readFont(path.join(__dirname, '..', 'assets', 'fonts', 'arimo-latin-700-normal.woff2')) },
  { weight: 400, style: 'italic', data: readFont(path.join(__dirname, '..', 'assets', 'fonts', 'arimo-latin-400-italic.woff2')) },
];

const PAYSLIP_FONT_CSS = FACES
  .filter((face) => face.data)
  .map((face) => `@font-face { font-family: 'Arimo'; font-style: ${face.style}; font-weight: ${face.weight}; `
    + `font-display: block; src: url(data:font/woff2;base64,${face.data}) format('woff2'); }`)
  .join('\n');

const PAYSLIP_FONT_FAMILY = "'Arimo', Arial, 'Helvetica Neue', sans-serif";

module.exports = { PAYSLIP_FONT_CSS, PAYSLIP_FONT_FAMILY };
