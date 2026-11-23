/**
 * Salary records live in the "Salary Records" Google Sheet, which is the
 * app's only data store. This module is the one place that reads and
 * writes them, through the Apps Script Web App
 * (backend/google-apps-script/Code.gs).
 *
 * A record is identified by Employee ID + Year + Month. Its `id`, used in
 * API URLs and table selections, is "<employee_id>~<year>~<month>".
 */
const { callAppsScript, sheetParams } = require('./googleAppsScriptService');
const { calculatePayslip } = require('./payrollCalculationService');
const {
  AMOUNT_FIELDS, TEXT_FIELDS, cleanText, toNumber, toDateOnly, parsePayrollType,
} = require('./salaryRecordService');

const ID_SEPARATOR = '~';

class StoreError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'StoreError';
    this.statusCode = statusCode;
  }
}

function recordId(employeeId, year, month) {
  return [employeeId, year, month].join(ID_SEPARATOR);
}

/** "<employee_id>~<year>~<month>" -> { employeeId, year, month }, or null. */
function parseRecordId(id) {
  const s = String(id || '');
  const last = s.lastIndexOf(ID_SEPARATOR);
  const prev = last > 0 ? s.lastIndexOf(ID_SEPARATOR, last - 1) : -1;
  if (prev <= 0) return null;
  const employeeId = s.slice(0, prev);
  const year = Number(s.slice(prev + 1, last));
  const month = Number(s.slice(last + 1));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { employeeId, year, month };
}

function sameEmployee(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function finiteOr(value, fallback) {
  const num = toNumber(value);
  return num !== null && Number.isFinite(num) ? num : fallback;
}

/**
 * Turns a raw sheet row into the record shape the API returns, or null for
 * a row the app can't use (no Employee ID, or an unreadable Month/Year).
 * Tolerates hand edits in the sheet: "1,500" amounts, blank cells, day-first
 * dates and payroll type labels or codes.
 */
function fromSheet(raw) {
  const employeeId = cleanText(raw.employee_id);
  if (!employeeId) return null;
  if (!raw.month || !raw.year) {
    // eslint-disable-next-line no-console
    console.warn(`Salary Records row ${raw._row}: skipped, Month or Year is not readable.`);
    return null;
  }

  const record = {
    id: recordId(employeeId, raw.year, raw.month),
    employee_id: employeeId,
    employee_name: cleanText(raw.employee_name) || '',
    date_of_joining: toDateOnly(raw.date_of_joining) || cleanText(raw.date_of_joining),
    month: raw.month,
    year: raw.year,
    month_days: finiteOr(raw.month_days, null),
    paid_days: finiteOr(raw.paid_days, null),
    payroll_type: parsePayrollType(raw.payroll_type),
    updated_at: cleanText(raw.last_updated),
  };
  TEXT_FIELDS.forEach((field) => {
    record[field] = cleanText(raw[field]);
  });
  AMOUNT_FIELDS.forEach((field) => {
    record[field] = finiteOr(raw[field], 0);
  });

  if (!record.payroll_type) {
    // eslint-disable-next-line no-console
    console.warn(`Salary Records row ${raw._row}: Payroll Type "${raw.payroll_type}" is not recognised.`);
  }
  return record;
}

/** A validated payload plus the calculated totals, as written to the sheet. */
function toSheet(payload) {
  const calc = calculatePayslip(payload);
  return {
    ...payload,
    gross_earnings: calc.grossEarnings,
    gross_deductions: calc.grossDeductions,
    net_pay: calc.netPay,
  };
}

/** What the API returns for a record that was just saved. */
function savedRecord(payload) {
  return {
    id: recordId(payload.employee_id, payload.year, payload.month),
    ...payload,
    updated_at: new Date().toISOString(),
  };
}

/** Every salary record in the sheet. Duplicate rows keep the first one. */
async function listRecords() {
  const res = await callAppsScript({ action: 'listRecords', ...sheetParams() });
  const seen = new Set();
  const records = [];
  (res.records || []).forEach((raw) => {
    const record = fromSheet(raw);
    if (!record) return;
    const key = record.id.toLowerCase();
    if (seen.has(key)) {
      // eslint-disable-next-line no-console
      console.warn(`Salary Records row ${raw._row}: duplicate of ${record.id}, ignored.`);
      return;
    }
    seen.add(key);
    records.push(record);
  });
  return records;
}

async function upsertItems(items) {
  const res = await callAppsScript({
    action: 'upsertRecords',
    ...sheetParams(),
    items: items.map((item) => ({ ...item, record: toSheet(item.record) })),
  });
  const results = res.results || [];
  if (results.length !== items.length) {
    throw new StoreError('Google Sheet returned an unexpected reply while saving.', 502);
  }
  return results;
}

/** Adds a new record. 409 if this employee already has one for that month. */
async function createRecord(payload) {
  const [result] = await upsertItems([{ record: payload, mustNotExist: true }]);
  if (result.status === 'conflict') {
    throw new StoreError(
      'A salary record already exists for this employee and month. Edit it instead of adding a new row.',
      409
    );
  }
  return savedRecord(payload);
}

/**
 * Overwrites the record identified by `key` ({ employeeId, year, month }).
 * If the payload moves it to another month, the same sheet row is reused.
 */
async function updateRecord(key, payload) {
  const [result] = await upsertItems([{ record: payload, matchKey: key, mustExist: true }]);
  if (result.status === 'not_found') throw new StoreError('Salary data record not found', 404);
  if (result.status === 'conflict') {
    throw new StoreError('Another salary record already exists for this employee and month.', 409);
  }
  return savedRecord(payload);
}

/** Inserts or updates many records at once (Excel import). One status per payload. */
async function upsertRecords(payloads) {
  if (payloads.length === 0) return [];
  return upsertItems(payloads.map((record) => ({ record })));
}

/** Deletes records by key ({ employeeId, year, month }). Returns how many rows went. */
async function deleteRecords(keys) {
  if (keys.length === 0) return 0;
  const res = await callAppsScript({ action: 'deleteRecords', ...sheetParams(), keys });
  return res.deleted || 0;
}

function keyOf(record) {
  return { employeeId: record.employee_id, year: record.year, month: record.month };
}

module.exports = {
  StoreError,
  recordId,
  parseRecordId,
  sameEmployee,
  keyOf,
  listRecords,
  createRecord,
  updateRecord,
  upsertRecords,
  deleteRecords,
};
