const { MONTH_NAMES } = require('../config/constants');

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/**
 * Produces the "1 Apr 2026 to 30 Apr 2026" style duration string used on
 * the payslip header, derived purely from the selected month/year.
 */
function getPayrollDuration(month, year) {
  const lastDay = daysInMonth(month, year);
  const monthShort = MONTH_NAMES[month - 1].slice(0, 3);
  return `1 ${monthShort} ${year} to ${lastDay} ${monthShort} ${year}`;
}

function getMonthLabel(month, year) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

module.exports = { daysInMonth, getPayrollDuration, getMonthLabel };
