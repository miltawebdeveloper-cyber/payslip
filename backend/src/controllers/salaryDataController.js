const catchAsync = require('../middleware/catchAsync');
const { normalizeSalaryPayload } = require('../services/salaryRecordService');
const store = require('../services/salaryStore');
const { importSalaryDataFromExcel, generateTemplateWorkbook } = require('../services/excelImportService');
const { calculatePayslip, round2 } = require('../services/payrollCalculationService');

/**
 * The table's search and filters. Shared by the list endpoint and the "all
 * matching records" bulk selection, so selecting everything always means
 * exactly the rows the table would page through.
 */
function matchesFilters(record, { search, month, year, payrollType } = {}) {
  if (month && record.month !== parseInt(month, 10)) return false;
  if (year && record.year !== parseInt(year, 10)) return false;
  if (payrollType && record.payroll_type !== payrollType) return false;
  if (search) {
    const needle = String(search).trim().toLowerCase();
    const haystack = [record.employee_name, record.employee_id, record.designation];
    if (!haystack.some((value) => String(value || '').toLowerCase().includes(needle))) return false;
  }
  return true;
}

/** Newest month first, then employee name A-Z. */
function byPeriodThenName(a, b) {
  return (b.year - a.year)
    || (b.month - a.month)
    || String(a.employee_name).localeCompare(String(b.employee_name), 'en', { sensitivity: 'base' });
}

/**
 * Resolves a bulk-action selection from the request body: either explicit
 * row `ids`, or `allMatching: true` plus the table's current `filters` (so
 * "select all" also covers rows on other pages). Returns null when the body
 * selects nothing.
 */
async function findSelectedRows(body = {}) {
  if (body.allMatching === true) {
    const records = await store.listRecords();
    return records.filter((record) => matchesFilters(record, body.filters));
  }
  const ids = Array.isArray(body.ids)
    ? new Set(body.ids.map((id) => String(id).toLowerCase()))
    : new Set();
  if (ids.size === 0) return null;
  const records = await store.listRecords();
  return records.filter((record) => ids.has(record.id.toLowerCase()));
}

function requireKey(id) {
  const key = store.parseRecordId(id);
  if (!key) {
    const err = new Error('Salary data record not found');
    err.statusCode = 404;
    throw err;
  }
  return key;
}

const list = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);

  const records = (await store.listRecords())
    .filter((record) => matchesFilters(record, req.query))
    .sort(byPeriodThenName);

  res.json({
    data: records.slice((page - 1) * limit, page * limit),
    total: records.length,
    page,
    limit,
    totalPages: Math.max(Math.ceil(records.length / limit), 1),
  });
});

/** The employee's details from their latest month, to pre-fill a new row. */
const lookupEmployee = catchAsync(async (req, res) => {
  const latest = (await store.listRecords())
    .filter((record) => store.sameEmployee(record.employee_id, req.params.employeeId))
    .sort(byPeriodThenName)[0];
  if (!latest) return res.status(404).json({ message: 'No existing employee with this ID' });
  res.json({
    employee_id: latest.employee_id,
    employee_name: latest.employee_name,
    designation: latest.designation,
    date_of_joining: latest.date_of_joining,
    bank_name: latest.bank_name,
    bank_account_number: latest.bank_account_number,
    pan: latest.pan,
    esic_no: latest.esic_no,
    uan_no: latest.uan_no,
  });
});

const create = catchAsync(async (req, res) => {
  const payload = normalizeSalaryPayload(req.body);
  res.status(201).json(await store.createRecord(payload));
});

const update = catchAsync(async (req, res) => {
  const key = requireKey(req.params.id);
  // The Employee ID can't be changed on edit; the month and year can.
  const payload = normalizeSalaryPayload({ ...req.body, employee_id: key.employeeId });
  res.json(await store.updateRecord(key, payload));
});

const remove = catchAsync(async (req, res) => {
  const key = requireKey(req.params.id);
  const deleted = await store.deleteRecords([key]);
  if (deleted === 0) return res.status(404).json({ message: 'Salary data record not found' });
  res.status(204).send();
});

const selectionSummary = catchAsync(async (req, res) => {
  const rows = await findSelectedRows(req.body);
  if (!rows) return res.status(400).json({ message: 'Select at least one record' });

  const totals = { grossEarnings: 0, grossDeductions: 0, netPay: 0 };
  rows.forEach((row) => {
    const calc = calculatePayslip(row);
    totals.grossEarnings += calc.grossEarnings;
    totals.grossDeductions += calc.grossDeductions;
    totals.netPay += calc.netPay;
  });

  res.json({
    count: rows.length,
    employees: new Set(rows.map((row) => row.employee_id.toLowerCase())).size,
    grossEarnings: round2(totals.grossEarnings),
    grossDeductions: round2(totals.grossDeductions),
    netPay: round2(totals.netPay),
  });
});

const bulkRemove = catchAsync(async (req, res) => {
  const rows = await findSelectedRows(req.body);
  if (!rows) return res.status(400).json({ message: 'Select at least one record to delete' });
  const deleted = await store.deleteRecords(rows.map(store.keyOf));
  res.json({ deleted });
});

const importExcel = catchAsync(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file was uploaded' });
  res.json(await importSalaryDataFromExcel(req.file.buffer));
});

const downloadTemplate = catchAsync(async (req, res) => {
  const buffer = generateTemplateWorkbook();
  res.setHeader('Content-Disposition', 'attachment; filename="Salary_Data_Template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = {
  list, create, update, remove, selectionSummary, bulkRemove, importExcel, downloadTemplate, lookupEmployee,
};
