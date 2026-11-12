const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { PAYROLL_TYPES } = require('../config/constants');

const SalaryData = sequelize.define(
  'SalaryData',
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
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    month_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    paid_days: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 30,
    },
    payroll_type: {
      type: DataTypes.ENUM(...Object.values(PAYROLL_TYPES)),
      allowNull: false,
      defaultValue: PAYROLL_TYPES.PF_ESI,
    },
    basic: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    hra: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    conveyance_allowances: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    medical_allowances: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    special_allowances: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    night_shift_allowances: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    other_earnings: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    pf_employee: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    esic_employee: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    other_deductions: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'salary_data',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'month', 'year'],
      },
    ],
  }
);

module.exports = SalaryData;
