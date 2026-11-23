const { PAYROLL_TYPES } = require('../config/constants');

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Single source of truth for payslip math. Every place that needs gross
 * earnings, gross deductions or net pay (preview endpoint, PDF generation,
 * payslip persistence) must go through this function so the calculation
 * logic never drifts between call sites.
 */
function calculatePayslip(salaryData) {
  const basic = round2(salaryData.basic);
  const hra = round2(salaryData.hra);
  const conveyanceAllowances = round2(salaryData.conveyance_allowances);
  const medicalAllowances = round2(salaryData.medical_allowances);
  const specialAllowances = round2(salaryData.special_allowances);
  const nightShiftAllowances = round2(salaryData.night_shift_allowances);
  const otherEarnings = round2(salaryData.other_earnings);

  const pfEmployee = round2(salaryData.pf_employee);
  const esicEmployee = round2(salaryData.esic_employee);
  const otherDeductions = round2(salaryData.other_deductions);

  const grossEarnings = round2(
    basic + hra + conveyanceAllowances + medicalAllowances + specialAllowances
      + nightShiftAllowances + otherEarnings
  );

  let grossDeductions;
  switch (salaryData.payroll_type) {
    case PAYROLL_TYPES.PF_ESI:
    case 'PF + ESI':
    case 'PF_ESI':
      grossDeductions = round2(pfEmployee + esicEmployee + otherDeductions);
      break;
    case PAYROLL_TYPES.PF_ONLY:
    case 'PF Only':
    case 'PF ONLY':
    case 'PF_ONLY':
      grossDeductions = round2(pfEmployee + otherDeductions);
      break;
    case PAYROLL_TYPES.NO_DEDUCTION:
    case 'No Deduction':
    case 'NO DEDUCTION':
    case 'NO_DEDUCTION':
      grossDeductions = 0;
      break;
    default:
      grossDeductions = 0;
  }

  const netPay = round2(grossEarnings - grossDeductions);

  return {
    earnings: {
      basic,
      hra,
      conveyanceAllowances,
      medicalAllowances,
      specialAllowances,
      nightShiftAllowances,
      otherEarnings,
    },
    deductions: {
      pfEmployee,
      esicEmployee,
      otherDeductions,
    },
    grossEarnings,
    grossDeductions,
    netPay,
  };
}

module.exports = { calculatePayslip, round2 };
