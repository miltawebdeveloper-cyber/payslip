const PAYROLL_TYPES = {
  PF_ESI: 'PF_ESI',
  PF_ONLY: 'PF_ONLY',
  NO_DEDUCTION: 'NO_DEDUCTION',
};

// Human readable labels used in the UI, Excel import/export and payslip PDF.
const PAYROLL_TYPE_LABELS = {
  [PAYROLL_TYPES.PF_ESI]: 'PF + ESI',
  [PAYROLL_TYPES.PF_ONLY]: 'PF Only',
  [PAYROLL_TYPES.NO_DEDUCTION]: 'No Deduction',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

module.exports = { PAYROLL_TYPES, PAYROLL_TYPE_LABELS, MONTH_NAMES };
