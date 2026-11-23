const { PAYROLL_TYPES, MONTH_NAMES } = require('../config/constants');

/**
 * Decides what actually appears on a payslip. Preview, PDF download and
 * Print all render the model built here, so a field is either shown in all
 * three or in none of them.
 *
 * The lists below are the payslip-capable fields that already exist in the
 * payroll data (Employee + SalaryData), in display order. Listing a field
 * here does not put it on a payslip: each employee's payslip only shows the
 * fields their own record has a value for. Everything else is left out
 * entirely — no label, no "-", no empty row.
 */

// Text that people type into a cell to mean "nothing here".
const PLACEHOLDER_TEXT = new Set(['-', '--', '–', '—', 'na', 'n/a', 'nil', 'null', 'undefined', 'none']);

function providedText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '' || PLACEHOLDER_TEXT.has(text.toLowerCase())) return null;
  return text;
}

// Amount and day columns are NOT NULL with a default of 0 in the database,
// and the Excel import stores a blank cell as 0, so 0 is how "not provided"
// is recorded for numbers.
function providedNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) && num !== 0 ? num : null;
}

function formatDisplayDate(value) {
  if (!providedText(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()].slice(0, 3)} ${date.getUTCFullYear()}`;
}

function formatDays(value) {
  const num = providedNumber(value);
  if (num === null) return null;
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

const DETAIL_FIELDS = [
  { key: 'employee_name', label: 'Employee Name', value: ({ employee }) => providedText(employee.employee_name) },
  { key: 'employee_id', label: 'Employee ID', value: ({ employee }) => providedText(employee.employee_id) },
  { key: 'designation', label: 'Designation', value: ({ employee }) => providedText(employee.designation) },
  { key: 'duration', label: 'Duration', value: ({ payrollDuration }) => providedText(payrollDuration) },
  { key: 'date_of_joining', label: 'Date of Joining', value: ({ employee }) => formatDisplayDate(employee.date_of_joining) },
  { key: 'bank_name', label: 'Bank Name', value: ({ employee }) => providedText(employee.bank_name) },
  { key: 'pan', label: 'PAN', value: ({ employee }) => providedText(employee.pan) },
  { key: 'bank_account_number', label: 'Bank A/c No', value: ({ employee }) => providedText(employee.bank_account_number) },
  { key: 'esic_no', label: 'ESIC No', value: ({ employee }) => providedText(employee.esic_no) },
  { key: 'month_days', label: 'Month Day', value: ({ salaryData }) => formatDays(salaryData.month_days) },
  { key: 'uan_no', label: 'UAN NO', value: ({ employee }) => providedText(employee.uan_no) },
  { key: 'paid_days', label: 'Paid Day', value: ({ salaryData }) => formatDays(salaryData.paid_days) },
];

// Keys refer to the output of payrollCalculationService.calculatePayslip.
const EARNING_FIELDS = [
  { key: 'basic', label: 'Basic' },
  { key: 'hra', label: 'HRA' },
  { key: 'conveyanceAllowances', label: 'Conveyance allowances' },
  { key: 'medicalAllowances', label: 'Medical allowances' },
  { key: 'specialAllowances', label: 'Special Allowances' },
  { key: 'nightShiftAllowances', label: 'Night Shift Allowances' },
  { key: 'otherEarnings', label: 'Other Earnings' },
];

const DEDUCTION_FIELDS = [
  { key: 'esicEmployee', label: 'ESIC (Employee)' },
  { key: 'pfEmployee', label: 'Provident Fund (Employee)' },
  { key: 'otherDeductions', label: 'Other Deductions' },
];

// The deductions that count toward Gross Deductions for each payroll type,
// mirroring calculatePayslip(). A deduction outside this list is never shown,
// even when the record holds a value for it, because it isn't charged.
const DEDUCTIONS_BY_PAYROLL_TYPE = {
  [PAYROLL_TYPES.PF_ESI]: ['esicEmployee', 'pfEmployee', 'otherDeductions'],
  [PAYROLL_TYPES.PF_ONLY]: ['pfEmployee', 'otherDeductions'],
  [PAYROLL_TYPES.NO_DEDUCTION]: [],
};

function pickLineItems(fields, amounts) {
  return fields
    .map(({ key, label }) => ({ key, label, amount: providedNumber(amounts[key]) }))
    .filter((item) => item.amount !== null);
}

// Hidden line items are all zero, so the visible ones must add up to the
// calculated totals. If they don't, the lists above have drifted from
// calculatePayslip() and the payslip would not reconcile — fail loudly.
function assertReconciles(items, expectedTotal, what) {
  const sum = items.reduce((acc, item) => acc + item.amount, 0);
  if (Math.abs(sum - expectedTotal) > 0.005) {
    throw new Error(`Payslip ${what} shown (${sum.toFixed(2)}) do not add up to the calculated total (${expectedTotal.toFixed(2)})`);
  }
}

function toRowsOfTwo(items) {
  const rows = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

/**
 * Builds the display model for one employee's payslip from that employee's
 * own records only. The result is plain JSON: it is sent to the browser for
 * the live preview and rendered to HTML for the PDF and for printing.
 */
function buildPayslipLayout({ company, employee, salaryData, calc, monthLabel, payrollDuration, amountInWords }) {
  const source = { employee, salaryData, payrollDuration };
  const details = DETAIL_FIELDS
    .map(({ key, label, value }) => ({ key, label, value: value(source) }))
    .filter((field) => field.value !== null);

  const earnings = pickLineItems(EARNING_FIELDS, calc.earnings);
  const applicable = DEDUCTIONS_BY_PAYROLL_TYPE[salaryData.payroll_type] || [];
  const deductions = pickLineItems(DEDUCTION_FIELDS.filter(({ key }) => applicable.includes(key)), calc.deductions);

  assertReconciles(earnings, calc.grossEarnings, 'earnings');
  assertReconciles(deductions, calc.grossDeductions, 'deductions');

  const paySections = [];
  if (earnings.length) {
    paySections.push({ key: 'earnings', title: 'Earnings', items: earnings, total: { label: 'Gross Earnings', amount: calc.grossEarnings } });
  }
  if (deductions.length) {
    paySections.push({ key: 'deductions', title: 'Deductions', items: deductions, total: { label: 'Gross Deductions', amount: calc.grossDeductions } });
  }

  // The (A)/(B) references only make sense when both totals are on the page.
  const bothTotals = paySections.length === 2;
  if (bothTotals) {
    paySections[0].total.label += ' (A)';
    paySections[1].total.label += ' (B)';
  }

  return {
    documentTitle: `Payslip - ${employee.employee_id} - ${monthLabel}`,
    title: `Payslip for the month of ${monthLabel}`,
    company: {
      name: providedText(company.name),
      logoUrl: providedText(company.logoUrl),
      address: providedText(company.address),
      phone: providedText(company.phone),
    },
    detailRows: toRowsOfTwo(details),
    paySections,
    netPay: {
      label: bothTotals ? 'Net Pay (A - B)' : 'Net Pay',
      amount: calc.netPay,
      inWords: providedText(amountInWords),
    },
  };
}

module.exports = { buildPayslipLayout };
