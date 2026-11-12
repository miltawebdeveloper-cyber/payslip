const sequelize = require('../config/database');
const Employee = require('./Employee');
const SalaryData = require('./SalaryData');
const Payslip = require('./Payslip');

Employee.hasMany(SalaryData, { foreignKey: 'employee_id', as: 'salaryRecords', onDelete: 'CASCADE' });
SalaryData.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Employee.hasMany(Payslip, { foreignKey: 'employee_id', as: 'payslips', onDelete: 'CASCADE' });
Payslip.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

SalaryData.hasMany(Payslip, { foreignKey: 'salary_data_id', as: 'payslips', onDelete: 'CASCADE' });
Payslip.belongsTo(SalaryData, { foreignKey: 'salary_data_id', as: 'salaryData' });

module.exports = { sequelize, Employee, SalaryData, Payslip };
