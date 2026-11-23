const path = require('path');
const fs = require('fs/promises');
const { sequelize, Employee, SalaryData, Payslip } = require('../models');
const catchAsync = require('../middleware/catchAsync');
const { buildPayslipData, buildPayslipHtml } = require('../services/payslipService');
const { renderHtmlToPdf } = require('../services/pdfService');
const { createZip } = require('../services/zipService');
const { getMonthLabel } = require('../services/durationService');
const { uploadPayslipPdf } = require('../services/googleDriveService');
const { MONTH_NAMES } = require('../config/constants');
const company = require('../config/company');

const listMonths = catchAsync(async (req, res) => {
  const rows = await SalaryData.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('month')), 'month'],
      'year',
    ],
    group: ['month', 'year'],
    order: [
      ['year', 'DESC'],
      ['month', 'DESC'],
    ],
    raw: true,
  });

  const months = rows.map((r) => ({
    month: r.month,
    year: r.year,
    label: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
  }));

  res.json(months);
});

const listEmployeesForMonth = catchAsync(async (req, res) => {
  const month = parseInt(req.query.month, 10);
  const year = parseInt(req.query.year, 10);
  if (!month || !year) {
    return res.status(400).json({ message: 'month and year query parameters are required' });
  }

  const rows = await SalaryData.findAll({
    where: { month, year },
    include: [{ model: Employee, as: 'employee', required: true }],
    order: [[{ model: Employee, as: 'employee' }, 'employee_name', 'ASC']],
  });

  res.json(
    rows.map((r) => ({
      employee_id: r.employee.employee_id,
      employee_name: r.employee.employee_name,
      designation: r.employee.designation,
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
 * Renders one employee's payslip PDF, keeps a copy in generated-pdfs and
 * records it in the payslips table. Shared by single and bulk generation so
 * both leave the same audit trail.
 */
async function generatePayslipPdf(employeeId, monthNum, yearNum) {
  const data = await buildPayslipData(employeeId, monthNum, yearNum);
  const html = buildPayslipHtml(data);
  const pdfBuffer = await renderHtmlToPdf(html);

  const fileName = `Payslip_${data.employee.employee_id}_${MONTH_NAMES[monthNum - 1]}_${yearNum}.pdf`;

  // Safely write local copy if disk is writable (serverless environments like Vercel have read-only root)
  try {
    const pdfDir = path.join(__dirname, '..', '..', 'generated-pdfs');
    await fs.mkdir(pdfDir, { recursive: true });
    const filePath = path.join(pdfDir, fileName);
    await fs.writeFile(filePath, pdfBuffer);
  } catch (fsErr) {
    // eslint-disable-next-line no-console
    console.warn('Local PDF caching skipped (normal in serverless/read-only environment):', fsErr.message);
  }

  // Automatically store and maintain payslip PDF in Google Drive
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

  await Payslip.create({
    employee_id: data.employee.id,
    salary_data_id: data.salaryData.id,
    month: monthNum,
    year: yearNum,
    gross_earnings: data.calc.grossEarnings,
    gross_deductions: data.calc.grossDeductions,
    net_pay: data.calc.netPay,
    pdf_path: fileName,
  });

  return { fileName, pdfBuffer, driveFile };
}

const generate = catchAsync(async (req, res) => {
  const { employeeId, month, year } = req.body;
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  const { fileName, pdfBuffer } = await generatePayslipPdf(employeeId, monthNum, yearNum);

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

  const rows = await SalaryData.findAll({
    where: { month: monthNum, year: yearNum },
    include: [{ model: Employee, as: 'employee', required: true }],
    order: [[{ model: Employee, as: 'employee' }, 'employee_name', 'ASC']],
  });
  if (rows.length === 0) {
    return res.status(404).json({ message: `No salary data found for ${getMonthLabel(monthNum, yearNum)}` });
  }

  // One at a time on purpose: each render opens a Chromium tab, and running
  // them sequentially keeps memory flat however many employees there are.
  const files = [];
  for (const row of rows) {
    const { fileName, pdfBuffer } = await generatePayslipPdf(row.employee.employee_id, monthNum, yearNum);
    files.push({ name: fileName, data: pdfBuffer });
  }

  const zipName = `Payslips_${MONTH_NAMES[monthNum - 1]}_${yearNum}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
  res.send(createZip(files));
});

module.exports = { listMonths, listEmployeesForMonth, preview, printView, generate, generateAll };
