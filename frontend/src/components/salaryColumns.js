// Column definitions for the salary data table. `group` drives the grouped
// heading row; Employee ID and Name are pinned and always shown.
export const COLUMN_GROUPS = [
  { key: 'employee', label: 'Employee' },
  { key: 'details', label: 'Personal & bank details' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'deductions', label: 'Deductions' },
];

export const COLUMNS = [
  { key: 'employee_id', label: 'Employee ID', group: 'employee', sticky: true, width: 110, minWidth: 90, maxWidth: 260, type: 'readonly' },
  { key: 'employee_name', label: 'Employee Name', group: 'employee', sticky: true, width: 160, minWidth: 110, maxWidth: 320, type: 'text' },
  { key: 'designation', label: 'Designation', group: 'details', width: 140, minWidth: 90, maxWidth: 280, type: 'text' },
  { key: 'date_of_joining', label: 'Date of Joining', group: 'details', width: 120, minWidth: 100, maxWidth: 200, type: 'date' },
  { key: 'bank_name', label: 'Bank Name', group: 'details', width: 125, minWidth: 90, maxWidth: 280, type: 'text' },
  { key: 'bank_account_number', label: 'Bank Account No', group: 'details', width: 140, minWidth: 110, maxWidth: 260, type: 'text' },
  { key: 'pan', label: 'PAN', group: 'details', width: 105, minWidth: 80, maxWidth: 180, type: 'text' },
  { key: 'esic_no', label: 'ESIC No', group: 'details', width: 105, minWidth: 80, maxWidth: 200, type: 'text' },
  { key: 'uan_no', label: 'UAN No', group: 'details', width: 128, minWidth: 90, maxWidth: 220, type: 'text' },
  { key: 'month', label: 'Month', group: 'payroll', width: 132, minWidth: 90, maxWidth: 180, type: 'month' },
  { key: 'month_days', label: 'Month Days', group: 'payroll', align: 'right', width: 95, minWidth: 80, maxWidth: 160, type: 'number' },
  { key: 'paid_days', label: 'Paid Days', group: 'payroll', align: 'right', width: 85, minWidth: 75, maxWidth: 160, type: 'number' },
  { key: 'payroll_type', label: 'Payroll Type', group: 'payroll', width: 118, minWidth: 110, maxWidth: 200, type: 'select' },
  { key: 'basic', label: 'Basic', group: 'earnings', align: 'right', width: 100, minWidth: 80, maxWidth: 180, type: 'number' },
  { key: 'hra', label: 'HRA', group: 'earnings', align: 'right', width: 92, minWidth: 75, maxWidth: 160, type: 'number' },
  { key: 'conveyance_allowances', label: 'Conveyance', group: 'earnings', align: 'right', width: 105, minWidth: 85, maxWidth: 200, type: 'number' },
  { key: 'medical_allowances', label: 'Medical', group: 'earnings', align: 'right', width: 95, minWidth: 80, maxWidth: 180, type: 'number' },
  { key: 'special_allowances', label: 'Special', group: 'earnings', align: 'right', width: 95, minWidth: 80, maxWidth: 180, type: 'number' },
  { key: 'night_shift_allowances', label: 'Night Shift', group: 'earnings', align: 'right', width: 100, minWidth: 85, maxWidth: 200, type: 'number' },
  { key: 'other_earnings', label: 'Other Earnings', group: 'earnings', align: 'right', width: 118, minWidth: 95, maxWidth: 220, type: 'number' },
  { key: 'pf_employee', label: 'PF', group: 'deductions', align: 'right', width: 90, minWidth: 70, maxWidth: 160, type: 'number' },
  { key: 'esic_employee', label: 'ESIC', group: 'deductions', align: 'right', width: 90, minWidth: 70, maxWidth: 160, type: 'number' },
  { key: 'other_deductions', label: 'Other Deductions', group: 'deductions', align: 'right', width: 130, minWidth: 95, maxWidth: 240, type: 'number' },
];

export const HIDEABLE_COLUMNS = COLUMNS.filter((col) => !col.sticky);
