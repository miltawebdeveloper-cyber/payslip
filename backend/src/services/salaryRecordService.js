const { PAYROLL_TYPES } = require('../config/constants');
const { daysInMonth } = require('./durationService');

class ValidationError extends Error {
  constructor(errors) {
    super(`Validation failed: ${errors.join('; ')}`);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

const TEXT_FIELDS = ['designation', 'bank_name', 'bank_account_number', 'pan', 'esic_no', 'uan_no'];

const AMOUNT_FIELDS = [
  'basic', 'hra', 'conveyance_allowances', 'medical_allowances', 'special_allowances',
  'night_shift_allowances', 'overtime', 'other_allowances', 'other_earnings',
  'pf_employee', 'esic_employee', 'advance', 'other_deductions',
];

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function cleanText(value) {
  return isBlank(value) ? null : String(value).trim();
}

/** Number from a number or a string like "1,500.50"; null if blank, NaN if not a number. */
function toNumber(value) {
  if (isBlank(value)) return null;
  if (typeof value === 'number') return value;
  return Number(String(value).replace(/,/g, '').trim());
}

/** Accepts "PF + ESI", "PF Only", "No Deduction" and the PF_ESI-style codes, in any case. */
function parsePayrollType(raw) {
  const norm = String(raw || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (['pfesi', 'pfandesi'].includes(norm)) return PAYROLL_TYPES.PF_ESI;
  if (norm === 'pfonly') return PAYROLL_TYPES.PF_ONLY;
  if (['nodeduction', 'nodeductions', 'none'].includes(norm)) return PAYROLL_TYPES.NO_DEDUCTION;
  return null;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function validDateParts(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Normalizes a date to "YYYY-MM-DD", or returns null if it can't be read.
 * Takes Date objects, "2025-04-01" (with or without a time part), Indian
 * day-first "01/04/2025", "01-04-2025" or "01.04.2025", and text like
 * "1 Apr 2025".
 */
function toDateOnly(value) {
  if (isBlank(value)) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  const s = String(value).trim();
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (match) {
    const [y, m, d] = match.slice(1).map(Number);
    return validDateParts(y, m, d) ? `${y}-${pad2(m)}-${pad2(d)}` : null;
  }
  match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (match) {
    const [d, m, y] = match.slice(1).map(Number);
    return validDateParts(y, m, d) ? `${y}-${pad2(m)}-${pad2(d)}` : null;
  }
  if (/[a-z]/i.test(s)) {
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) return toDateOnly(parsed);
  }
  return null;
}

/**
 * Validates an Add/Edit payload from the app and returns the clean record
 * that gets saved to the Google Sheet. Throws a 400 ValidationError that
 * lists every problem at once.
 */
function normalizeSalaryPayload(input = {}) {
  const errors = [];

  const employeeId = cleanText(input.employee_id) || '';
  if (!employeeId) errors.push('Employee ID is required');
  else if (employeeId.includes('~')) errors.push('Employee ID cannot contain "~"');

  const employeeName = cleanText(input.employee_name) || '';
  if (!employeeName) errors.push('Employee Name is required');

  const month = Number(input.month);
  const monthOk = Number.isInteger(month) && month >= 1 && month <= 12;
  if (!monthOk) errors.push('Month must be between 1 and 12');

  const year = Number(input.year);
  const yearOk = Number.isInteger(year) && year >= 1900 && year <= 2200;
  if (!yearOk) errors.push('Year must be a valid year');

  const payrollType = parsePayrollType(input.payroll_type);
  if (!payrollType) errors.push('Payroll Type must be one of "PF + ESI", "PF Only" or "No Deduction"');

  let monthDays = toNumber(input.month_days);
  if (monthDays === null) {
    monthDays = monthOk && yearOk ? daysInMonth(month, year) : null;
  } else if (!Number.isInteger(monthDays) || monthDays < 1 || monthDays > 31) {
    errors.push('Month Days must be a whole number from 1 to 31');
  }

  let paidDays = toNumber(input.paid_days);
  if (paidDays === null) {
    paidDays = monthDays;
  } else if (!Number.isFinite(paidDays) || paidDays < 0) {
    errors.push('Paid Days must be a number of 0 or more');
  }

  const amounts = {};
  AMOUNT_FIELDS.forEach((field) => {
    const value = toNumber(input[field]);
    if (value !== null && !Number.isFinite(value)) {
      errors.push(`${field.replace(/_/g, ' ')} must be a number`);
    }
    amounts[field] = value === null || !Number.isFinite(value) ? 0 : value;
  });

  const dateOfJoining = toDateOnly(input.date_of_joining);
  if (!isBlank(input.date_of_joining) && !dateOfJoining) {
    errors.push('Date of Joining must be a date such as 2025-04-01');
  }

  if (errors.length) throw new ValidationError(errors);

  const text = {};
  TEXT_FIELDS.forEach((field) => {
    text[field] = cleanText(input[field]);
  });

  return {
    employee_id: employeeId,
    employee_name: employeeName,
    date_of_joining: dateOfJoining,
    ...text,
    month,
    year,
    month_days: monthDays,
    paid_days: paidDays,
    payroll_type: payrollType,
    ...amounts,
  };
}

module.exports = {
  ValidationError,
  AMOUNT_FIELDS,
  TEXT_FIELDS,
  isBlank,
  cleanText,
  toNumber,
  toDateOnly,
  parsePayrollType,
  normalizeSalaryPayload,
};
