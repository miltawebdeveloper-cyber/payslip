const { calculatePayslip } = require('./payrollCalculationService');
const { MONTH_NAMES } = require('../config/constants');

function getAppsScriptUrl() {
  return (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
}

function isAppsScriptConfigured() {
  return Boolean(getAppsScriptUrl());
}

async function callAppsScript(payload) {
  const url = getAppsScriptUrl();
  if (!url) {
    throw new Error('GOOGLE_APPS_SCRIPT_URL is not set in environment variables.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apps Script responded with ${response.status}: ${errorText}`);
  }

  return response.json();
}

function formatRecord(record) {
  const calc = calculatePayslip(record);
  const monthNum = parseInt(record.month, 10);
  const monthLabel = monthNum >= 1 && monthNum <= 12
    ? `${MONTH_NAMES[monthNum - 1]} (${monthNum})`
    : String(record.month || '');

  return {
    employee_id: record.employee_id || record.employee?.employee_id || '',
    employee_name: record.employee_name || record.employee?.employee_name || '',
    designation: record.designation || record.employee?.designation || '',
    date_of_joining: record.date_of_joining || record.employee?.date_of_joining || '',
    bank_name: record.bank_name || record.employee?.bank_name || '',
    bank_account_number: record.bank_account_number || record.employee?.bank_account_number || '',
    pan: record.pan || record.employee?.pan || '',
    esic_no: record.esic_no || record.employee?.esic_no || '',
    uan_no: record.uan_no || record.employee?.uan_no || '',
    month: monthLabel,
    monthNum: record.month,
    year: record.year,
    month_days: record.month_days ?? '',
    paid_days: record.paid_days ?? '',
    payroll_type: record.payroll_type || '',
    basic: Number(record.basic || 0),
    hra: Number(record.hra || 0),
    conveyance_allowances: Number(record.conveyance_allowances || 0),
    medical_allowances: Number(record.medical_allowances || 0),
    special_allowances: Number(record.special_allowances || 0),
    night_shift_allowances: Number(record.night_shift_allowances || 0),
    other_earnings: Number(record.other_earnings || 0),
    pf_employee: Number(record.pf_employee || 0),
    esic_employee: Number(record.esic_employee || 0),
    other_deductions: Number(record.other_deductions || 0),
    grossEarnings: calc.grossEarnings,
    grossDeductions: calc.grossDeductions,
    netPay: calc.netPay,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Synchronize all salary records to Google Sheets via Apps Script Web App
 */
async function syncAllRecords(records) {
  const formattedRecords = records.map(formatRecord);
  const folderId = process.env.GOOGLE_DRIVE_MAIN_FOLDER_ID || '1wiDLZP-38rH7Nqtg_BQBYDayOWJ_UTgM';

  const res = await callAppsScript({
    action: 'syncSheet',
    folderId,
    sheetTitle: process.env.GOOGLE_SHEET_TITLE || 'Payslip Generator - Salary Records',
    records: formattedRecords,
  });

  return res;
}

/**
 * Upsert a single salary record in Google Sheet via Apps Script
 */
async function upsertRecord(record) {
  const formattedRecord = formatRecord(record);
  const folderId = process.env.GOOGLE_DRIVE_MAIN_FOLDER_ID || '1wiDLZP-38rH7Nqtg_BQBYDayOWJ_UTgM';

  const res = await callAppsScript({
    action: 'upsertRecord',
    folderId,
    sheetTitle: process.env.GOOGLE_SHEET_TITLE || 'Payslip Generator - Salary Records',
    record: formattedRecord,
  });

  return res;
}

/**
 * Delete a single record from Google Sheet via Apps Script
 */
async function deleteRecord(employeeId, month, year) {
  const folderId = process.env.GOOGLE_DRIVE_MAIN_FOLDER_ID || '1wiDLZP-38rH7Nqtg_BQBYDayOWJ_UTgM';

  const res = await callAppsScript({
    action: 'deleteRecord',
    folderId,
    sheetTitle: process.env.GOOGLE_SHEET_TITLE || 'Payslip Generator - Salary Records',
    employeeId,
    month: parseInt(month, 10),
    year: parseInt(year, 10),
  });

  return res;
}

/**
 * Upload payslip PDF to Google Drive via Apps Script
 */
async function uploadPayslipPdf({ employee, month, year, pdfBuffer, fileName }) {
  const folderId = process.env.GOOGLE_DRIVE_MAIN_FOLDER_ID || '1wiDLZP-38rH7Nqtg_BQBYDayOWJ_UTgM';
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  const res = await callAppsScript({
    action: 'uploadPdf',
    folderId,
    fileName,
    month: monthNum,
    year: yearNum,
    monthName: MONTH_NAMES[monthNum - 1] || `Month-${monthNum}`,
    employeeId: employee.employee_id || employee.employeeId || '',
    employeeName: employee.employee_name || employee.employeeName || '',
    pdfBase64,
  });

  return res;
}

/**
 * Get status of Google Drive folder and Google Sheet via Apps Script
 */
async function getStatus() {
  const folderId = process.env.GOOGLE_DRIVE_MAIN_FOLDER_ID || '1wiDLZP-38rH7Nqtg_BQBYDayOWJ_UTgM';

  try {
    const res = await callAppsScript({
      action: 'getStatus',
      folderId,
      sheetTitle: process.env.GOOGLE_SHEET_TITLE || 'Payslip Generator - Salary Records',
    });
    return res;
  } catch (err) {
    return {
      configured: true,
      error: err.message,
    };
  }
}

module.exports = {
  isAppsScriptConfigured,
  syncAllRecords,
  upsertRecord,
  deleteRecord,
  uploadPayslipPdf,
  getStatus,
};
