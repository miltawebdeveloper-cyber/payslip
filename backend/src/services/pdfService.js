const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.SERVERLESS
);

let browserPromise = null;

// puppeteer, puppeteer-core and @sparticuz/chromium are ES modules only, so
// they're loaded with import(): require() of an ES module fails on Node
// versions before 22.12.

/** Serverless (Vercel): the slim Chromium build from @sparticuz/chromium. */
async function launchServerlessChromium() {
  const { default: chromium } = await import('@sparticuz/chromium');
  const { default: puppeteerCore } = await import('puppeteer-core');

  // No WebGL needed for payslips; also skips extracting the graphics stack.
  chromium.setGraphicsMode = false;

  return puppeteerCore.launch({
    args: await puppeteerCore.defaultArgs({ args: chromium.args, headless: 'shell' }),
    defaultViewport: { width: 1240, height: 1754, deviceScaleFactor: 1 },
    executablePath: await chromium.executablePath(),
    headless: 'shell',
  });
}

/** Local development: the Chrome that the full puppeteer package downloads. */
async function launchLocalPuppeteer() {
  const { default: puppeteer } = await import('puppeteer');
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

function getBrowser() {
  if (!browserPromise) {
    browserPromise = (isServerless ? launchServerlessChromium() : launchLocalPuppeteer())
      .catch((err) => {
        // Don't cache a failed launch: let the next request try again.
        browserPromise = null;
        throw new Error(`Could not start the PDF browser: ${err.message}`);
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
