const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define(
  'Employee',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    employee_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date_of_joining: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bank_account_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pan: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    esic_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uan_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'employees',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Employee;
