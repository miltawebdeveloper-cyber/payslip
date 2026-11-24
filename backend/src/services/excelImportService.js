const XLSX = require('xlsx');
const { MONTH_NAMES } = require('../config/constants');
const { daysInMonth } = require('./durationService');
const { AMOUNT_FIELDS, parsePayrollType } = require('./salaryRecordService');
const { upsertRecords } = require('./salaryStore');

// Maps a normalized column header to the internal field key it feeds.
const FIELD_ALIASES = {
  employee_id: ['employee id', 'emp id', 'empid', 'employee code'],
  employee_name: ['employee name', 'name', 'emp name'],
  designation: ['designation'],
  date_of_joining: ['date of joining', 'doj'],
  bank_name: ['bank name'],
  bank_account_number: [
    'bank account number', 'bank account no', 'bank acc no', 'bank ac no', 'bank a c no',
  ],
  pan: ['pan', 'pan no'],
  esic_no: ['esic no', 'esic number'],
  uan_no: ['uan no', 'uan', 'uan number'],
  month_label: ['month'],
  year: ['year'],
  month_days: ['month days', 'month day', 'total days of month'],
  paid_days: ['paid days', 'paid day'],
  payroll_type: ['payroll type'],
  basic: ['basic', 'basic salary'],
  hra: ['hra'],
  conveyance_allowances: ['conveyance allowances', 'conveyance allowance'],
  medical_allowances: ['medical allowances', 'medical allowance'],
  special_allowances: ['special allowances', 'special allowance', 'special'],
  night_shift_allowances: ['night shift allowances', 'night shift allowance', 'night shift'],
  overtime: ['overtime', 'over time', 'ot'],
  other_allowances: ['other allowances', 'other allowance'],
  other_earnings: ['other earnings'],
  pf_employee: ['provident fund employee', 'pf employee', 'pf'],
  esic_employee: ['esic employee', 'esic'],
  advance: ['advance', 'advances', 'salary advance'],
  other_deductions: ['other deductions'],
};

const REQUIRED_FIELDS = ['employee_id', 'employee_name', 'month_label', 'payroll_type', 'basic'];

const TEMPLATE_HEADERS = [
  'Employee ID', 'Employee Name', 'Designation', 'Date of Joining', 'Bank Name',
  'Bank Account Number', 'PAN', 'ESIC No', 'UAN No', 'Month', 'Month Days', 'Paid Days',
  'Payroll Type', 'Basic', 'HRA', 'Conveyance Allowances', 'Medical Allowances',
  'Special Allowances', 'Night Shift Allowances', 'Overtime', 'Other Allowances', 'Other Earnings',
  'Provident Fund (Employee)', 'ESIC (Employee)', 'Advance', 'Other Deductions',
];

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildAliasLookup() {
  const lookup = {};
  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    aliases.forEach((alias) => {
      lookup[alias] = field;
    });
  });
  return lookup;
}

const ALIAS_LOOKUP = buildAliasLookup();

function buildFieldMap(headerRow) {
  const map = {};
  headerRow.forEach((header, idx) => {
    const field = ALIAS_LOOKUP[normalizeHeader(header)];
    if (field) map[idx] = field;
  });
  return map;
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function parseNumber(raw) {
  if (isBlank(raw)) return { value: 0, error: null };
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/,/g, '').trim());
  if (Number.isNaN(num)) return { value: null, error: 'must be a number' };
  return { value: num, error: null };
}

function parseMonthYear(monthRaw, yearRaw) {
  if (monthRaw instanceof Date) {
    return { month: monthRaw.getMonth() + 1, year: monthRaw.getFullYear() };
  }

  let monthStr = String(monthRaw || '').trim();
  let year = !isBlank(yearRaw) ? parseInt(yearRaw, 10) : null;
  if (!monthStr) return null;

  let match = monthStr.match(/^([A-Za-z]+)[\s\-/]+(\d{4})$/);
  if (match) {
    monthStr = match[1];
    year = parseInt(match[2], 10);
  } else {
    match = monthStr.match(/^(\d{4})[\s\-/]+([A-Za-z0-9]+)$/);
    if (match) {
      year = parseInt(match[1], 10);
      monthStr = match[2];
    } else {
      match = monthStr.match(/^(\d{1,2})[\s\-/](\d{4})$/);
      if (match) {
        return { month: parseInt(match[1], 10), year: parseInt(match[2], 10) };
      }
    }
  }

  const lower = monthStr.toLowerCase();
  const fullNames = MONTH_NAMES.map((m) => m.toLowerCase());
  const shortNames = MONTH_NAMES.map((m) => m.slice(0, 3).toLowerCase());

  let monthNum = null;
  let idx = fullNames.indexOf(lower);
  if (idx === -1) idx = shortNames.indexOf(lower);
  if (idx !== -1) monthNum = idx + 1;
  else if (/^\d{1,2}$/.test(monthStr)) monthNum = parseInt(monthStr, 10);

  if (!monthNum || monthNum < 1 || monthNum > 12 || !year) return null;
  return { month: monthNum, year };
}

function parseDateValue(raw) {
  if (isBlank(raw)) return null;
  if (raw instanceof Date) return raw;
  const parsed = new Date(String(raw).trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateOnlyString(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses one data row (already mapped by header) into a validated payload,
 * or a list of human readable error messages if it can't be imported.
 */
function parseRow(record) {
  const errors = [];

  const employeeId = String(record.employee_id || '').trim();
  if (!employeeId) errors.push('Employee ID is required');
  else if (employeeId.includes('~')) errors.push('Employee ID cannot contain "~"');

  const employeeName = String(record.employee_name || '').trim();
  if (!employeeName) errors.push('Employee Name is required');

  const monthYear = parseMonthYear(record.month_label, record.year);
  if (!monthYear) errors.push('Month is missing or not in a recognizable format (e.g. "April-2026")');

  const payrollType = parsePayrollType(record.payroll_type);
  if (!payrollType) {
    errors.push('Payroll Type must be one of "PF + ESI", "PF Only" or "No Deduction"');
  }

  const numericValues = {};
  AMOUNT_FIELDS.forEach((field) => {
    const { value, error } = parseNumber(record[field]);
    if (error) errors.push(`${field.replace(/_/g, ' ')} ${error}`);
    numericValues[field] = value ?? 0;
  });

  if (isBlank(record.basic)) errors.push('Basic is required');

  let monthDays = null;
  let paidDays = null;
  if (monthYear) {
    const { value: monthDaysValue, error: monthDaysError } = parseNumber(record.month_days);
    if (monthDaysError) errors.push(`Month Days ${monthDaysError}`);
    monthDays = monthDaysValue || daysInMonth(monthYear.month, monthYear.year);

    const { value: paidDaysValue, error: paidDaysError } = parseNumber(record.paid_days);
    if (paidDaysError) errors.push(`Paid Days ${paidDaysError}`);
    paidDays = paidDaysValue || monthDays;
  }

  const dateOfJoining = toDateOnlyString(parseDateValue(record.date_of_joining));

  if (errors.length) return { errors };

  return {
    errors: [],
    payload: {
      employee_id: employeeId,
      employee_name: employeeName,
      designation: record.designation ? String(record.designation).trim() : null,
      date_of_joining: dateOfJoining,
      bank_name: record.bank_name ? String(record.bank_name).trim() : null,
      bank_account_number: record.bank_account_number
        ? String(record.bank_account_number).trim()
        : null,
      pan: record.pan ? String(record.pan).trim() : null,
      esic_no: record.esic_no ? String(record.esic_no).trim() : null,
      uan_no: record.uan_no ? String(record.uan_no).trim() : null,
      month: monthYear.month,
      year: monthYear.year,
      month_days: monthDays,
      paid_days: paidDays,
      payroll_type: payrollType,
      ...numericValues,
    },
  };
}

async function importSalaryDataFromExcel(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

  if (rows.length < 1) {
    return {
      totalRows: 0, newRecords: 0, updatedRecords: 0, failedRecords: 0,
      errors: [{ row: 0, employeeId: '', message: 'The uploaded file is empty.' }],
    };
  }

  const fieldMap = buildFieldMap(rows[0]);
  const mappedFields = new Set(Object.values(fieldMap));
  const missingRequired = REQUIRED_FIELDS.filter((f) => !mappedFields.has(f));
  if (missingRequired.length) {
    return {
      totalRows: 0, newRecords: 0, updatedRecords: 0, failedRecords: 0,
      errors: [{
        row: 0,
        employeeId: '',
        message: `Missing required column(s): ${missingRequired.join(', ')}. Download the template to see the expected columns.`,
      }],
    };
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim() !== ''));

  let newRecords = 0;
  let updatedRecords = 0;
  let failedRecords = 0;
  const errors = [];
  const valid = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const rowNumber = i + 2; // +1 for header row, +1 for 1-based spreadsheet rows
    const rawRow = dataRows[i];
    const record = {};
    Object.entries(fieldMap).forEach(([idx, field]) => {
      record[field] = rawRow[Number(idx)];
    });

    const { errors: rowErrors, payload } = parseRow(record);
    if (rowErrors.length) {
      failedRecords += 1;
      errors.push({ row: rowNumber, employeeId: record.employee_id || '', message: rowErrors.join('; ') });
      continue;
    }

    valid.push({ rowNumber, payload });
  }

  // Valid rows are saved to the Google Sheet in one call. A later row for
  // the same employee and month overwrites an earlier one, as before.
  if (valid.length > 0) {
    try {
      const results = await upsertRecords(valid.map((v) => v.payload));
      results.forEach((result, idx) => {
        if (result.status === 'inserted') newRecords += 1;
        else if (result.status === 'updated') updatedRecords += 1;
        else {
          failedRecords += 1;
          errors.push({
            row: valid[idx].rowNumber,
            employeeId: valid[idx].payload.employee_id,
            message: result.error || `Not saved (${result.status})`,
          });
        }
      });
    } catch (err) {
      failedRecords += valid.length;
      errors.push({ row: 0, employeeId: '', message: `No rows were saved to the Google Sheet: ${err.message}` });
    }
  }

  return {
    totalRows: dataRows.length,
    newRecords,
    updatedRecords,
    failedRecords,
    errors,
  };
}

function generateTemplateWorkbook() {
  const exampleRow = [
    'MAS21058', 'Karthikayani. G', 'Executive FED', '2025-10-13', 'IDFC FIRST BANK',
    '10250931449', 'BNLPH1126B', '5611440181', '102260097818', 'April-2026', 30, 30,
    'PF + ESI', 9019, 3608, 1600, 1250, 2561, 600, 0, 0, 0, 1732, 136, 0, 0,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Data');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { importSalaryDataFromExcel, generateTemplateWorkbook, TEMPLATE_HEADERS };
