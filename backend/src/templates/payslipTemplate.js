const { MONTH_NAMES } = require('../config/constants');

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDays(value) {
  const num = Number(value) || 0;
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function formatDisplayDate(dateOnlyString) {
  if (!dateOnlyString) return '-';
  const date = new Date(dateOnlyString);
  if (Number.isNaN(date.getTime())) return '-';
  const day = date.getUTCDate();
  const month = MONTH_NAMES[date.getUTCMonth()].slice(0, 3);
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildLineItemRows(calc, payrollType) {
  const earningsRows = [
    { label: 'Basic', amount: calc.earnings.basic },
    { label: 'HRA', amount: calc.earnings.hra },
    { label: 'Conveyance allowances', amount: calc.earnings.conveyanceAllowances },
    { label: 'Medical allowances', amount: calc.earnings.medicalAllowances },
    { label: 'Special Allowances', amount: calc.earnings.specialAllowances },
    { label: 'Night Shift Allowances', amount: calc.earnings.nightShiftAllowances },
  ];
  if (calc.earnings.otherEarnings > 0) {
    earningsRows.push({ label: 'Other Earnings', amount: calc.earnings.otherEarnings });
  }

  const deductionRows = [];
  if (payrollType !== 'NO_DEDUCTION') {
    if (payrollType === 'PF_ESI') {
      deductionRows.push({ label: 'ESIC (Employee)', amount: calc.deductions.esicEmployee });
    }
    deductionRows.push({ label: 'Provident Fund (Employee)', amount: calc.deductions.pfEmployee });
    if (calc.deductions.otherDeductions > 0) {
      deductionRows.push({ label: 'Other Deductions', amount: calc.deductions.otherDeductions });
    }
  }

  const rowCount = Math.max(earningsRows.length, deductionRows.length);
  while (earningsRows.length < rowCount) earningsRows.push({ label: '', amount: null });
  while (deductionRows.length < rowCount) deductionRows.push({ label: '', amount: null });

  return { earningsRows, deductionRows };
}

/**
 * Renders the full payslip as a self-contained HTML string, ready to be
 * fed into Puppeteer's page.setContent() for PDF generation. The layout
 * mirrors the reference "Salary Slip" PDF supplied by the company.
 */
function renderPayslipHtml({ company, employee, salaryData, monthLabel, payrollDuration, calc, amountInWords }) {
  const { earningsRows, deductionRows } = buildLineItemRows(calc, salaryData.payroll_type);

  const infoRows = [
    ['Employee Name', employee.employee_name, 'Employee ID', employee.employee_id],
    ['Designation', employee.designation || '-', 'Duration', payrollDuration],
    ['Date of Joining', formatDisplayDate(employee.date_of_joining), 'Bank Name', employee.bank_name || '-'],
    ['PAN', employee.pan || '-', 'Bank A/c No', employee.bank_account_number || '-'],
    ['ESIC No', employee.esic_no || '-', 'Month Day', formatDays(salaryData.month_days)],
    ['UAN NO', employee.uan_no || '-', 'Paid Day', formatDays(salaryData.paid_days)],
  ];

  const infoRowsHtml = infoRows
    .map(
      ([labelA, valueA, labelB, valueB]) => `
        <tr>
          <td class="label-cell">${escapeHtml(labelA)}</td>
          <td class="value-cell">${escapeHtml(valueA)}</td>
          <td class="label-cell">${escapeHtml(labelB)}</td>
          <td class="value-cell">${escapeHtml(valueB)}</td>
        </tr>`
    )
    .join('');

  const lineItemsHtml = earningsRows
    .map((earning, idx) => {
      const deduction = deductionRows[idx];
      return `
        <tr>
          <td class="item-label">${escapeHtml(earning.label)}</td>
          <td class="item-amount">${earning.amount === null ? '-' : formatCurrency(earning.amount)}</td>
          <td class="item-label">${escapeHtml(deduction.label)}</td>
          <td class="item-amount">${deduction.amount === null ? '-' : formatCurrency(deduction.amount)}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payslip - ${escapeHtml(employee.employee_id)} - ${escapeHtml(monthLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #000;
    margin: 0;
    padding: 24px;
    font-size: 11.5px;
    background: #fff;
  }
  .payslip-box {
    max-width: 820px; margin: 0 auto;
    border: 1px solid #000;
    background: #fff;
  }
  table { width: 100%; border-collapse: collapse; }
  .header-cell { border-bottom: 1px solid #000; padding: 14px; text-align: center; }
  .header-inner { width: auto; max-width: 700px; margin: 0 auto; }
  .header-inner td { vertical-align: middle; }
  .logo-cell { width: 1%; white-space: nowrap; text-align: center; padding-right: 18px; }
  .logo-circle {
    width: 60px; height: 60px; border-radius: 50%;
    background: linear-gradient(180deg, #9ABB3B, #266929);
    color: #fff; display: inline-flex; align-items: center; justify-content: center;
    font-size: 26px; font-weight: 700; font-family: Georgia, serif;
  }
  .logo-cell img { display: block; height: 62px; width: auto; max-width: 160px; }
  .company-info { text-align: left; padding-left: 18px; border-left: 1px solid #DADADA; }
  .company-name { font-size: 20px; font-weight: 700; margin: 0 0 4px; color: #000; }
  .company-meta { font-size: 10.5px; margin: 0; line-height: 1.6; color: #333; }
  .title-bar {
    text-align: center; font-weight: 700; font-size: 12.5px;
    padding: 7px 0; border-bottom: 1px solid #000; background: #F5F9F2; color: #266929;
  }
  .info-table td { border-bottom: 1px solid #000; padding: 6px 12px; font-size: 11px; }
  .info-table td:not(:last-child) { border-right: 1px solid #000; }
  .label-cell { width: 22%; color: #000; }
  .value-cell { width: 28%; font-weight: 600; }
  .spacer-row td { border: none; padding: 6px 0; }
  .items-table { table-layout: fixed; }
  .items-table th {
    text-align: left; font-weight: 700; font-size: 11.5px;
    padding: 7px 12px; border-bottom: 1px solid #000; background: #f2f2f2;
  }
  .items-table th:not(:last-child), .items-table td:not(:last-child) { border-right: 1px solid #000; }
  .items-table .amount-head { text-align: right; }
  .item-label { padding: 6px 12px; border-bottom: 1px solid #000; }
  .item-amount { padding: 6px 12px; border-bottom: 1px solid #000; text-align: right; }
  .totals-row td { font-weight: 700; padding: 8px 12px; border-top: 1px solid #000; border-bottom: 1px solid #000; background: #f2f2f2; }
  .totals-row .item-amount { text-align: right; }
  .net-pay-row td { padding: 10px 12px; font-weight: 700; background: #fff; }
  .net-pay-amount { text-align: right; font-size: 13px; color: #000; }
  .amount-words { text-align: right; font-weight: 600; font-size: 10.5px; }
  .footer-note { text-align: center; font-size: 10px; font-style: italic; color: #333; padding: 14px 0 4px; }
</style>
</head>
<body>
  <div class="payslip-box">
    <table class="header-table">
      <tr>
        <td class="header-cell">
          <table class="header-inner">
            <tr>
              <td class="logo-cell">
                ${company.logoUrl
                  ? `<img src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.name)}" />`
                  : `<span class="logo-circle">M</span>`}
              </td>
              <td class="company-info">
                <p class="company-name">${escapeHtml(company.name)}</p>
                <p class="company-meta">${escapeHtml(company.address)}</p>
                <p class="company-meta">Phone No: ${escapeHtml(company.phone)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="title-bar">Salary Slip for ${escapeHtml(monthLabel)}</div>

    <table class="info-table">
      ${infoRowsHtml}
    </table>

    <table class="items-table">
      <colgroup>
        <col style="width: 29.1667%" />
        <col style="width: 20.8333%" />
        <col style="width: 29.1667%" />
        <col style="width: 20.8333%" />
      </colgroup>
      <tr>
        <th>EARNINGS</th>
        <th class="amount-head">AMOUNT</th>
        <th>DEDUCTIONS</th>
        <th class="amount-head">AMOUNT</th>
      </tr>
      ${lineItemsHtml}
      <tr class="totals-row">
        <td>Gross Earnings (A)</td>
        <td class="item-amount">${formatCurrency(calc.grossEarnings)}</td>
        <td>Gross Deductions (B)</td>
        <td class="item-amount">${formatCurrency(calc.grossDeductions)}</td>
      </tr>
      <tr class="net-pay-row">
        <td>Net Pay (A - B)</td>
        <td class="net-pay-amount">${formatCurrency(calc.netPay)}</td>
        <td colspan="2" class="amount-words">${escapeHtml(amountInWords)}</td>
      </tr>
    </table>

    <div class="footer-note">Note: This is a system generated payslip and does not require signature</div>
  </div>
</body>
</html>`;
}

module.exports = { renderPayslipHtml, formatCurrency, formatDisplayDate };
