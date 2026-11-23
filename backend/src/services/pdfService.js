const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.SERVERLESS
);

let browserPromise = null;

async function getBrowser() {
  if (browserPromise) return browserPromise;

  if (isServerless) {
    try {
      const chromium = require('@sparticuz/chromium');
      const puppeteerCore = require('puppeteer-core');

      // Optional: allow remote font loading if needed
      chromium.setGraphicsMode = false;

      browserPromise = puppeteerCore.launch({
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });

      return browserPromise;
    } catch (serverlessErr) {
      // eslint-disable-next-line no-console
      console.warn('Could not launch serverless Chromium, falling back to standard Puppeteer:', serverlessErr.message);
    }
  }

  const puppeteer = require('puppeteer');
  browserPromise = puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

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
    try {
      const browser = await browserPromise;
      await browser.close();
    } catch (err) {
      // ignore
    }
    browserPromise = null;
  }
}

module.exports = { renderHtmlToPdf, closeBrowser };
