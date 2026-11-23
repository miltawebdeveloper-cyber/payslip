const path = require('path');
const fs = require('fs/promises');
const catchAsync = require('../middleware/catchAsync');
const { listRecords } = require('../services/salaryStore');
const { buildPayslipData, buildPayslipHtml } = require('../services/payslipService');
const { renderHtmlToPdf } = require('../services/pdfService');
const { createZip } = require('../services/zipService');
const { getMonthLabel } = require('../services/durationService');
const { uploadPayslipPdf } = require('../services/googleDriveService');
const { MONTH_NAMES } = require('../config/constants');
const company = require('../config/company');

function byName(a, b) {
  return String(a.employee_name).localeCompare(String(b.employee_name), 'en', { sensitivity: 'base' });
}

const listMonths = catchAsync(async (req, res) => {
  const periods = new Map();
  (await listRecords()).forEach((r) => periods.set(`${r.year}-${r.month}`, { month: r.month, year: r.year }));

  const months = [...periods.values()]
    .sort((a, b) => (b.year - a.year) || (b.month - a.month))
    .map((p) => ({ ...p, label: `${MONTH_NAMES[p.month - 1]} ${p.year}` }));

  res.json(months);
});

const listEmployeesForMonth = catchAsync(async (req, res) => {
  const month = parseInt(req.query.month, 10);
  const year = parseInt(req.query.year, 10);
  if (!month || !year) {
    return res.status(400).json({ message: 'month and year query parameters are required' });
  }

  const rows = (await listRecords())
    .filter((r) => r.month === month && r.year === year)
    .sort(byName);

  res.json(
    rows.map((r) => ({
      employee_id: r.employee_id,
      employee_name: r.employee_name,
      designation: r.designation,
    }))
  );
});

const preview = catchAsync(async (req, res) => {
  const { employeeId, month, year } = req.query;
  const data = await buildPayslipData(employeeId, parseInt(month, 10), parseInt(year, 10));

  res.json({
    company,
    employee: data.employee,
    salaryData: data.salaryData,
    calc: data.calc,
    monthLabel: data.monthLabel,
    payrollDuration: data.payrollDuration,
    amountInWords: data.amountInWords,
    layout: data.layout,
  });
});

/**
 * The exact HTML the PDF is rendered from, set up for the browser's own
 * print dialog. Nothing is saved: printing is just the preview on paper.
 */
const printView = catchAsync(async (req, res) => {
  const { employeeId, month, year } = req.query;
  const data = await buildPayslipData(employeeId, parseInt(month, 10), parseInt(year, 10));
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(buildPayslipHtml(data, { browserPrint: true }));
});

/**
 * Renders one employee's payslip PDF, keeps a local copy in generated-pdfs
 * when the disk is writable, and saves it to Google Drive (Payslips /
 * <Month Year>), which is the record of generated payslips. Shared by
 * single and bulk generation.
 */
async function generatePayslipPdf(employeeId, monthNum, yearNum, options) {
  const data = await buildPayslipData(employeeId, monthNum, yearNum, options);
  const html = buildPayslipHtml(data);
  const pdfBuffer = await renderHtmlToPdf(html);

  const fileName = `Payslip_${data.employee.employee_id}_${MONTH_NAMES[monthNum - 1]}_${yearNum}.pdf`;

  // Serverless environments like Vercel have a read-only disk; skip the local copy there.
  try {
    const pdfDir = path.join(__dirname, '..', '..', 'generated-pdfs');
    await fs.mkdir(pdfDir, { recursive: true });
    await fs.writeFile(path.join(pdfDir, fileName), pdfBuffer);
  } catch (fsErr) {
    // eslint-disable-next-line no-console
    console.warn('Local PDF copy skipped (normal on a read-only disk):', fsErr.message);
  }

  let driveFile = null;
  try {
    driveFile = await uploadPayslipPdf({
      employee: data.employee,
      month: monthNum,
      year: yearNum,
      pdfBuffer,
      fileName,
    });
  } catch (driveErr) {
    // eslint-disable-next-line no-console
    console.warn('Google Drive payslip upload error:', driveErr.message);
  }

  return { fileName, pdfBuffer, driveFile };
}

const generate = catchAsync(async (req, res) => {
  const { employeeId, month, year } = req.body;
  const { fileName, pdfBuffer } = await generatePayslipPdf(employeeId, parseInt(month, 10), parseInt(year, 10));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(pdfBuffer);
});

const generateAll = catchAsync(async (req, res) => {
  const monthNum = parseInt(req.body.month, 10);
  const yearNum = parseInt(req.body.year, 10);
  if (!monthNum || !yearNum) {
    return res.status(400).json({ message: 'month and year are required' });
  }

  const records = await listRecords();
  const rows = records.filter((r) => r.month === monthNum && r.year === yearNum).sort(byName);
  if (rows.length === 0) {
    return res.status(404).json({ message: `No salary data found for ${getMonthLabel(monthNum, yearNum)}` });
  }

  // One at a time on purpose: each render opens a Chromium tab, and running
  // them sequentially keeps memory flat however many employees there are.
  const files = [];
  for (const row of rows) {
    const { fileName, pdfBuffer } = await generatePayslipPdf(row.employee_id, monthNum, yearNum, { records });
    files.push({ name: fileName, data: pdfBuffer });
  }

  const zipName = `Payslips_${MONTH_NAMES[monthNum - 1]}_${yearNum}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
  res.send(createZip(files));
});

module.exports = { listMonths, listEmployeesForMonth, preview, printView, generate, generateAll };
