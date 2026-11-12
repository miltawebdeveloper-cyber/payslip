const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payslip = sequelize.define(
  'Payslip',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employees', key: 'id' },
    },
    salary_data_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'salary_data', key: 'id' },
    },
    month: { type: DataTypes.INTEGER, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    gross_earnings: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    gross_deductions: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    net_pay: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    pdf_path: { type: DataTypes.STRING, allowNull: true },
    generated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'payslips',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Payslip;
