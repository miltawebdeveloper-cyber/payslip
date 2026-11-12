const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthName(month) {
  return MONTH_NAMES[month - 1] || '';
}

function monthNumberFromName(name) {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase();
  const index = MONTH_NAMES.findIndex((m) => m.toLowerCase() === normalized || m.slice(0, 3).toLowerCase() === normalized.slice(0, 3));
  return index === -1 ? null : index + 1;
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function ordinal(day) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  return day + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// Matches the reference payslip format: "1 Apr 2026 to 30 Apr 2026"
function payrollDuration(month, year) {
  const shortMonth = monthName(month).slice(0, 3);
  const lastDay = daysInMonth(month, year);
  return `1 ${shortMonth} ${year} to ${lastDay} ${shortMonth} ${year}`;
}

// Matches the reference payslip format: "Salary Slip to April-2026"
function monthYearLabel(month, year) {
  return `${monthName(month)}-${year}`;
}

module.exports = {
  MONTH_NAMES,
  monthName,
  monthNumberFromName,
  daysInMonth,
  ordinal,
  payrollDuration,
  monthYearLabel,
};
