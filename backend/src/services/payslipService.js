const { listRecords, sameEmployee } = require('./salaryStore');
const { calculatePayslip } = require('./payrollCalculationService');
const { amountToWords } = require('./numberToWordsService');
const { getPayrollDuration, getMonthLabel } = require('./durationService');
const { buildPayslipLayout } = require('./payslipLayoutService');
const { renderPayslipHtml } = require('../templates/payslipTemplate');
const company = require('../config/company');

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

const EMPLOYEE_FIELDS = [
  'employee_id', 'employee_name', 'designation', 'date_of_joining', 'bank_name',
  'bank_account_number', 'pan', 'esic_no', 'uan_no',
];

function splitRecord(record) {
  const employee = {};
  const salaryData = {};
  Object.entries(record).forEach(([field, value]) => {
    if (EMPLOYEE_FIELDS.includes(field)) employee[field] = value;
    else salaryData[field] = value;
  });
  return { employee, salaryData };
}

/**
 * Finds the employee's salary record for the requested month/year in the
 * Google Sheet and combines it into everything a payslip needs: the raw
 * fields, the centrally calculated totals, the payroll duration, the
 * amount in words and the layout (only the fields this employee has data
 * for). Used by the live preview, PDF generation and Print, so they can
 * never disagree with each other.
 *
 * Pass `records` (from listRecords) to skip re-reading the sheet, e.g. when
 * generating every payslip for a month.
 */
async function buildPayslipData(employeeId, month, year, { records } = {}) {
  const all = records || await listRecords();
  const forEmployee = all.filter((r) => sameEmployee(r.employee_id, employeeId));
  if (forEmployee.length === 0) throw new NotFoundError(`Employee "${employeeId}" was not found`);

  const record = forEmployee.find((r) => r.month === month && r.year === year);
  if (!record) {
    throw new NotFoundError(
      `No salary data found for ${forEmployee[0].employee_name} (${employeeId}) for ${getMonthLabel(month, year)}. Import or add it in Salary Data first.`
    );
  }

  const { employee, salaryData } = splitRecord(record);
  const calc = calculatePayslip(record);
  const monthLabel = getMonthLabel(month, year);
  const payrollDuration = getPayrollDuration(month, year);
  const amountInWords = amountToWords(calc.netPay);
  const layout = buildPayslipLayout({
    company, employee, salaryData, calc, monthLabel, payrollDuration, amountInWords,
  });

  return { employee, salaryData, calc, monthLabel, payrollDuration, amountInWords, layout };
}

function buildPayslipHtml(data, options) {
  return renderPayslipHtml(data.layout, options);
}

module.exports = { buildPayslipData, buildPayslipHtml, NotFoundError };
