const { sequelize, Employee, SalaryData } = require('../models');

/**
 * Creates or updates the Employee master record and the SalaryData record
 * for the given month/year in one place, so Excel import and the manual
 * Add/Edit Row flows in Module 1 always write data the same way.
 */
async function upsertEmployeeAndSalaryData(payload, { transaction } = {}) {
  const run = async (t) => {
    let employee = await Employee.findOne({
      where: { employee_id: payload.employee_id },
      transaction: t,
    });

    const employeeFields = {
      employee_id: payload.employee_id,
      employee_name: payload.employee_name,
      designation: payload.designation ?? null,
      date_of_joining: payload.date_of_joining ?? null,
      bank_name: payload.bank_name ?? null,
      bank_account_number: payload.bank_account_number ?? null,
      pan: payload.pan ?? null,
      esic_no: payload.esic_no ?? null,
      uan_no: payload.uan_no ?? null,
    };

    let isNewEmployee = false;
    if (!employee) {
      employee = await Employee.create(employeeFields, { transaction: t });
      isNewEmployee = true;
    } else {
      await employee.update(employeeFields, { transaction: t });
    }

    const salaryFields = {
      employee_id: employee.id,
      month: payload.month,
      year: payload.year,
      month_days: payload.month_days,
      paid_days: payload.paid_days,
      payroll_type: payload.payroll_type,
      basic: payload.basic,
      hra: payload.hra,
      conveyance_allowances: payload.conveyance_allowances,
      medical_allowances: payload.medical_allowances,
      special_allowances: payload.special_allowances,
      night_shift_allowances: payload.night_shift_allowances,
      other_earnings: payload.other_earnings,
      pf_employee: payload.pf_employee,
      esic_employee: payload.esic_employee,
      other_deductions: payload.other_deductions,
    };

    let salaryData = await SalaryData.findOne({
      where: { employee_id: employee.id, month: payload.month, year: payload.year },
      transaction: t,
    });

    let isNewSalaryRecord = false;
    if (!salaryData) {
      salaryData = await SalaryData.create(salaryFields, { transaction: t });
      isNewSalaryRecord = true;
    } else {
      await salaryData.update(salaryFields, { transaction: t });
    }

    return { employee, salaryData, isNewEmployee, isNewSalaryRecord };
  };

  if (transaction) return run(transaction);
  return sequelize.transaction(run);
}

module.exports = { upsertEmployeeAndSalaryData };
