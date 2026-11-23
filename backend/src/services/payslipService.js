const { Employee, SalaryData } = require('../models');
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

/**
 * Fetches the employee master record + the salary data for the requested
 * month/year and combines them into everything a payslip needs: the raw
 * fields, the centrally calculated totals, the payroll duration, the
 * amount in words and the layout (only the fields this employee has data
 * for). Used by the live preview, PDF generation and Print, so they can
 * never disagree with each other.
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
  const layout = buildPayslipLayout({
    company, employee, salaryData, calc, monthLabel, payrollDuration, amountInWords,
  });

  return { employee, salaryData, calc, monthLabel, payrollDuration, amountInWords, layout };
}

function buildPayslipHtml(data, options) {
  return renderPayslipHtml(data.layout, options);
}

module.exports = { buildPayslipData, buildPayslipHtml, NotFoundError };
