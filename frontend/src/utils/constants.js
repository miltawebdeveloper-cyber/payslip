export const PAYROLL_TYPES = {
  PF_ESI: 'PF_ESI',
  PF_ONLY: 'PF_ONLY',
  NO_DEDUCTION: 'NO_DEDUCTION',
};

export const PAYROLL_TYPE_LABELS = {
  [PAYROLL_TYPES.PF_ESI]: 'PF + ESI',
  [PAYROLL_TYPES.PF_ONLY]: 'PF Only',
  [PAYROLL_TYPES.NO_DEDUCTION]: 'No Deduction',
};

export const PAYROLL_TYPE_OPTIONS = Object.entries(PAYROLL_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTH_OPTIONS = MONTH_NAMES.map((name, idx) => ({ value: idx + 1, label: name }));
