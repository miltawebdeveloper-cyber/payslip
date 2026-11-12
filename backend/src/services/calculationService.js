const { PAYROLL_TYPES } = require('../models/SalaryData');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Single source of truth for payslip math. Both the live preview endpoint and
 * the PDF generation endpoint call this so the numbers can never drift apart.
 *
 * Gross Earnings (A) = Basic + HRA + Conveyance + Medical + Special + Other Earnings
 * Gross Deductions (B) depends on payroll_type:
 *   PF_ESI        -> PF + ESIC + Other Deductions
 *   PF_ONLY       -> PF + Other Deductions (ESIC excluded)
 *   NO_DEDUCTION  -> 0
 * Net Pay = A - B
 */
function calculatePayslip(salaryData) {
  if (!salaryData) {
    throw new Error('salaryData is required for calculation');
  }
  if (!PAYROLL_TYPES.includes(salaryData.payroll_type)) {
    throw new Error(`Unknown payroll type: ${salaryData.payroll_type}`);
  }

  const earnings = {
    basic: toNumber(salaryData.basic),
    hra: toNumber(salaryData.hra),
    conveyance_allowances: toNumber(salaryData.conveyance_allowances),
    medical_allowances: toNumber(salaryData.medical_allowances),
    special_allowances: toNumber(salaryData.special_allowances),
    other_earnings: toNumber(salaryData.other_earnings),
  };

  const grossEarnings =
    earnings.basic +
    earnings.hra +
    earnings.conveyance_allowances +
    earnings.medical_allowances +
    earnings.special_allowances +
    earnings.other_earnings;

  const pf = toNumber(salaryData.pf_employee);
  const esic = toNumber(salaryData.esic_employee);
  const otherDeductions = toNumber(salaryData.other_deductions);

  const deductions = {
    pf_employee: 0,
    esic_employee: 0,
    other_deductions: 0,
  };

  let grossDeductions = 0;

  switch (salaryData.payroll_type) {
    case 'PF_ESI':
      deductions.pf_employee = pf;
      deductions.esic_employee = esic;
      deductions.other_deductions = otherDeductions;
      grossDeductions = pf + esic + otherDeductions;
      break;
    case 'PF_ONLY':
      deductions.pf_employee = pf;
      deductions.other_deductions = otherDeductions;
      grossDeductions = pf + otherDeductions;
      break;
    case 'NO_DEDUCTION':
      grossDeductions = 0;
      break;
    default:
      throw new Error(`Unknown payroll type: ${salaryData.payroll_type}`);
  }

  const netPay = grossEarnings - grossDeductions;

  return {
    earnings,
    deductions,
    grossEarnings: round2(grossEarnings),
    grossDeductions: round2(grossDeductions),
    netPay: round2(netPay),
  };
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

module.exports = { calculatePayslip, toNumber, round2 };
