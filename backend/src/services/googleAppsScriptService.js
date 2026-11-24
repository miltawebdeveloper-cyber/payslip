const { MONTH_NAMES } = require('../config/constants');

const DEFAULT_SHEET_TITLE = 'Payslip Generator - Salary Records';
const DEFAULT_FOLDER_ID = '1wiDLZP-38rH7Nqtg_BQBYDayOWJ_UTgM';
const REQUEST_TIMEOUT_MS = 120000;
const DEPLOY_HINT = 'Deploy the latest backend/google-apps-script/Code.gs '
  + '(Deploy > Manage deployments > edit > Version: New version > Deploy).';

class AppsScriptError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'AppsScriptError';
    this.statusCode = statusCode;
  }
}

function getAppsScriptUrl() {
  return (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
}

function isAppsScriptConfigured() {
  return Boolean(getAppsScriptUrl());
}

/** The Drive folder and spreadsheet every call works on. */
function sheetParams() {
  return {
    folderId: process.env.GOOGLE_DRIVE_MAIN_FOLDER_ID || DEFAULT_FOLDER_ID,
    sheetTitle: process.env.GOOGLE_SHEET_TITLE || DEFAULT_SHEET_TITLE,
  };
}

/**
 * Calls the Apps Script Web App and returns its JSON reply. Every failure
 * (not configured, unreachable, not public, old script, script error)
 * becomes an AppsScriptError with a message that says what to fix.
 */
async function callAppsScript(payload) {
  const url = getAppsScriptUrl();
  if (!url) {
    throw new AppsScriptError(
      'Google Sheet storage is not configured. Set GOOGLE_APPS_SCRIPT_URL to the Apps Script Web App URL.',
      503
    );
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, apiKey: process.env.GOOGLE_APPS_SCRIPT_KEY || undefined }),
      redirect: 'follow',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new AppsScriptError(`Could not reach the Google Apps Script: ${err.message}`);
  }

  const text = await response.text();
  if (!response.ok) {
    const hint = response.status === 401 || response.status === 403
      ? ' The Web App must be deployed with "Who has access: Anyone".'
      : '';
    throw new AppsScriptError(`Google Apps Script responded with HTTP ${response.status}.${hint}`);
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new AppsScriptError(`Google Apps Script did not return JSON. ${DEPLOY_HINT}`);
  }

  if (body && body.success === false) {
    const error = body.error || body.message || 'Unknown error';
    let hint = '';
    if (/^Unknown action/.test(error)) hint = ` ${DEPLOY_HINT}`;
    else if (/^Unauthorized/.test(error)) {
      hint = ' Set GOOGLE_APPS_SCRIPT_KEY to the API_KEY value in the Apps Script\'s Script Properties.';
    }
    throw new AppsScriptError(`Google Sheet error: ${error}.${hint}`);
  }
  return body;
}

/**
 * Code.gs replies to a record list or save with the `fields` its sheet
 * stores. A deployment older than one of `required` would silently drop
 * that field's values, so stop with a message that says to redeploy.
 * `saved` says whether the call already wrote rows (a save) or only read.
 */
function assertStoresFields(body, required, { saved = false } = {}) {
  // A script from before `fields` was added doesn't send it at all.
  const stored = Array.isArray(body && body.fields) ? new Set(body.fields) : null;
  const missing = stored ? required.filter((field) => !stored.has(field)) : required;
  if (missing.length === 0) return;
  const subject = stored ? missing.map((field) => field.replace(/_/g, ' ')).join(', ') : 'some amounts';
  const consequence = saved
    ? `so ${subject} were not saved to the Google Sheet. Save again after redeploying.`
    : `so it can't store ${subject}.`;
  throw new AppsScriptError(`The Google Apps Script deployment is older than this app, ${consequence} ${DEPLOY_HINT}`);
}

/** Uploads a payslip PDF to Drive: Payslips / <Month Year> / <fileName>. */
async function uploadPayslipPdf({ employee, month, year, pdfBuffer, fileName }) {
  const monthNum = parseInt(month, 10);
  return callAppsScript({
    action: 'uploadPdf',
    folderId: sheetParams().folderId,
    fileName,
    month: monthNum,
    year: parseInt(year, 10),
    monthName: MONTH_NAMES[monthNum - 1] || `Month-${monthNum}`,
    employeeId: employee.employee_id || '',
    employeeName: employee.employee_name || '',
    pdfBase64: Buffer.from(pdfBuffer).toString('base64'),
  });
}

/** Links to the Drive folder, the Payslips folder and the spreadsheet. */
async function getStatus() {
  return callAppsScript({ action: 'getStatus', ...sheetParams() });
}

module.exports = {
  AppsScriptError,
  isAppsScriptConfigured,
  sheetParams,
  callAppsScript,
  assertStoresFields,
  uploadPayslipPdf,
  getStatus,
};
