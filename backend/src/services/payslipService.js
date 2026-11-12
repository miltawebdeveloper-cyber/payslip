const { Employee, SalaryData } = require('../models');
const { calculatePayslip } = require('./payrollCalculationService');
const { amountToWords } = require('./numberToWordsService');
const { getPayrollDuration, getMonthLabel } = require('./durationService');
const { renderPayslipHtml } = require('../templates/payslipTemplate');
const company = require('../config/company');

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

/**
 * Fetches the employee master record + the salary data for the requested
 * month/year and combines them into everything a payslip needs: the raw
 * fields, the centrally calculated totals, the payroll duration and the
 * amount in words. Used by both the live preview endpoint and PDF
 * generation, so they can never disagree with each other.
 */
async function buildPayslipData(employeeId, month, year) {
  const employee = await Employee.findOne({ where: { employee_id: employeeId } });
  if (!employee) throw new NotFoundError(`Employee "${employeeId}" was not found`);

  const salaryData = await SalaryData.findOne({
    where: { employee_id: employee.id, month, year },
  });
  if (!salaryData) {
    throw new NotFoundError(
      `No salary data found for ${employee.employee_name} (${employeeId}) for ${getMonthLabel(month, year)}. Import or add it in Salary Data first.`
    );
  }

  const calc = calculatePayslip(salaryData);
  const monthLabel = getMonthLabel(month, year);
  const payrollDuration = getPayrollDuration(month, year);
  const amountInWords = amountToWords(calc.netPay);

  return { employee, salaryData, calc, monthLabel, payrollDuration, amountInWords };
}

function buildPayslipHtml(data) {
  return renderPayslipHtml({
    company,
    employee: data.employee,
    salaryData: data.salaryData,
    monthLabel: data.monthLabel,
    payrollDuration: data.payrollDuration,
    calc: data.calc,
    amountInWords: data.amountInWords,
  });
}

module.exports = { buildPayslipData, buildPayslipHtml, NotFoundError };
