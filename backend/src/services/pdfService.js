const puppeteer = require('puppeteer');

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

/**
 * Renders the given payslip HTML into a print-friendly A4 PDF buffer.
 */
async function renderHtmlToPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '10mm', right: '10mm' },
    });
    // Puppeteer returns a Uint8Array; Express's res.send() only recognizes
    // a true Node Buffer as binary, otherwise it silently JSON-serializes
    // the byte array. Convert here so every caller gets real binary data.
    return Buffer.from(pdfData);
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

module.exports = { renderHtmlToPdf, closeBrowser };
