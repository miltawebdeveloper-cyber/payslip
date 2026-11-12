const { Op } = require('sequelize');
const { Employee, SalaryData } = require('../models');
const catchAsync = require('../middleware/catchAsync');
const { upsertEmployeeAndSalaryData } = require('../services/salaryRecordService');
const { importSalaryDataFromExcel, generateTemplateWorkbook } = require('../services/excelImportService');
const { calculatePayslip, round2 } = require('../services/payrollCalculationService');

/**
 * Builds the where/include for the table's search and filters. Shared by the
 * list endpoint and the "all matching records" bulk selection, so selecting
 * everything always means exactly the rows the table would page through.
 */
function buildListQuery({ search, month, year, payrollType } = {}) {
  const where = {};
  if (month) where.month = parseInt(month, 10);
  if (year) where.year = parseInt(year, 10);
  if (payrollType) where.payroll_type = payrollType;

  const employeeWhere = {};
  if (search) {
    employeeWhere[Op.or] = [
      { employee_name: { [Op.iLike]: `%${search}%` } },
      { employee_id: { [Op.iLike]: `%${search}%` } },
      { designation: { [Op.iLike]: `%${search}%` } },
    ];
  }

  return { where, include: [{ model: Employee, as: 'employee', where: employeeWhere, required: true }] };
}

/**
 * Resolves a bulk-action selection from the request body: either explicit
 * row `ids`, or `allMatching: true` plus the table's current `filters` (so
 * "select all" also covers rows on other pages). Returns null when the body
 * selects nothing.
 */
async function findSelectedRows(body = {}) {
  if (body.allMatching === true) {
    return SalaryData.findAll(buildListQuery(body.filters));
  }
  const ids = Array.isArray(body.ids)
    ? body.ids.map((id) => parseInt(id, 10)).filter((id) => id > 0)
    : [];
  if (ids.length === 0) return null;
  return SalaryData.findAll({
    where: { id: ids },
    include: [{ model: Employee, as: 'employee', required: true }],
  });
}

function serializeRow(salaryData) {
  const employee = salaryData.employee;
  return {
    id: salaryData.id,
    employee_id: employee.employee_id,
    employee_name: employee.employee_name,
    designation: employee.designation,
    date_of_joining: employee.date_of_joining,
    bank_name: employee.bank_name,
    bank_account_number: employee.bank_account_number,
    pan: employee.pan,
    esic_no: employee.esic_no,
    uan_no: employee.uan_no,
    month: salaryData.month,
    year: salaryData.year,
    month_days: salaryData.month_days,
    paid_days: salaryData.paid_days,
    payroll_type: salaryData.payroll_type,
    basic: salaryData.basic,
    hra: salaryData.hra,
    conveyance_allowances: salaryData.conveyance_allowances,
    medical_allowances: salaryData.medical_allowances,
    special_allowances: salaryData.special_allowances,
    night_shift_allowances: salaryData.night_shift_allowances,
    other_earnings: salaryData.other_earnings,
    pf_employee: salaryData.pf_employee,
    esic_employee: salaryData.esic_employee,
    other_deductions: salaryData.other_deductions,
    created_at: salaryData.created_at,
    updated_at: salaryData.updated_at,
  };
}

const list = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);

  const { rows, count } = await SalaryData.findAndCountAll({
    ...buildListQuery(req.query),
    order: [
      ['year', 'DESC'],
      ['month', 'DESC'],
      [{ model: Employee, as: 'employee' }, 'employee_name', 'ASC'],
    ],
    limit,
    offset: (page - 1) * limit,
  });

  res.json({
    data: rows.map(serializeRow),
    total: count,
    page,
    limit,
    totalPages: Math.max(Math.ceil(count / limit), 1),
  });
});

const lookupEmployee = catchAsync(async (req, res) => {
  const employee = await Employee.findOne({ where: { employee_id: req.params.employeeId } });
  if (!employee) return res.status(404).json({ message: 'No existing employee with this ID' });
  res.json({
    employee_id: employee.employee_id,
    employee_name: employee.employee_name,
    designation: employee.designation,
    date_of_joining: employee.date_of_joining,
    bank_name: employee.bank_name,
    bank_account_number: employee.bank_account_number,
    pan: employee.pan,
    esic_no: employee.esic_no,
    uan_no: employee.uan_no,
  });
});

const create = catchAsync(async (req, res) => {
  const payload = req.body;

  const employee = await Employee.findOne({ where: { employee_id: payload.employee_id } });
  if (employee) {
    const existing = await SalaryData.findOne({
      where: { employee_id: employee.id, month: payload.month, year: payload.year },
    });
    if (existing) {
      return res.status(409).json({
        message: 'A salary record already exists for this employee and month. Edit it instead of adding a new row.',
      });
    }
  }

  const { salaryData } = await upsertEmployeeAndSalaryData(payload);
  const created = await SalaryData.findByPk(salaryData.id, { include: [{ model: Employee, as: 'employee' }] });
  res.status(201).json(serializeRow(created));
});

const update = catchAsync(async (req, res) => {
  const existing = await SalaryData.findByPk(req.params.id, { include: [{ model: Employee, as: 'employee' }] });
  if (!existing) return res.status(404).json({ message: 'Salary data record not found' });

  const payload = { ...req.body, employee_id: existing.employee.employee_id };
  const { salaryData } = await upsertEmployeeAndSalaryData(payload);
  const updated = await SalaryData.findByPk(salaryData.id, { include: [{ model: Employee, as: 'employee' }] });
  res.json(serializeRow(updated));
});

const remove = catchAsync(async (req, res) => {
  const existing = await SalaryData.findByPk(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Salary data record not found' });
  await existing.destroy();
  res.status(204).send();
});

const selectionSummary = catchAsync(async (req, res) => {
  const rows = await findSelectedRows(req.body);
  if (!rows) return res.status(400).json({ message: 'Select at least one record' });

  const totals = { grossEarnings: 0, grossDeductions: 0, netPay: 0 };
  rows.forEach((row) => {
    const calc = calculatePayslip(row);
    totals.grossEarnings += calc.grossEarnings;
    totals.grossDeductions += calc.grossDeductions;
    totals.netPay += calc.netPay;
  });

  res.json({
    count: rows.length,
    employees: new Set(rows.map((row) => row.employee_id)).size,
    grossEarnings: round2(totals.grossEarnings),
    grossDeductions: round2(totals.grossDeductions),
    netPay: round2(totals.netPay),
  });
});

const bulkRemove = catchAsync(async (req, res) => {
  const rows = await findSelectedRows(req.body);
  if (!rows) return res.status(400).json({ message: 'Select at least one record to delete' });

  const ids = rows.map((row) => row.id);
  const deleted = ids.length > 0 ? await SalaryData.destroy({ where: { id: ids } }) : 0;
  res.json({ deleted });
});

const importExcel = catchAsync(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file was uploaded' });
  const summary = await importSalaryDataFromExcel(req.file.buffer);
  res.json(summary);
});

const downloadTemplate = catchAsync(async (req, res) => {
  const buffer = generateTemplateWorkbook();
  res.setHeader('Content-Disposition', 'attachment; filename="Salary_Data_Template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = {
  list, create, update, remove, selectionSummary, bulkRemove, importExcel, downloadTemplate, lookupEmployee,
};
