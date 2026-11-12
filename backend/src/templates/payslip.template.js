function formatCurrency(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateOnly(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month} ${d.getFullYear()}`;
}

function cell(value) {
  const n = Number(value);
  if (!value || n === 0) return '-';
  return formatCurrency(n);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Renders the payslip as a self-contained HTML document, styled to match the
 * reference "Milta Accounting Services" payslip PDF. Used both for the live
 * browser preview and as the Puppeteer print source.
 */
function renderPayslipHtml({ company, employee, salaryData, calc, monthYearLabel, duration, amountInWords }) {
  const showEsic = salaryData.payroll_type !== 'PF_ONLY' && salaryData.payroll_type !== 'NO_DEDUCTION';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Payslip</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a;
    margin: 0;
    padding: 24px;
    font-size: 12px;
  }
  .sheet {
    border: 1px solid #333;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border-bottom: 1px solid #333;
  }
  .header img { width: 56px; height: 56px; object-fit: contain; }
  .header .company-name { font-size: 20px; font-weight: 700; text-align: center; }
  .header .company-meta { font-size: 11px; text-align: center; color: #333; margin-top: 2px; }
  .header-text { flex: 1; }
  .title {
    text-align: center;
    font-weight: 700;
    font-size: 13px;
    padding: 8px;
    border-bottom: 1px solid #333;
    background: #f5f5f5;
  }
  table.info { width: 100%; border-collapse: collapse; }
  table.info td {
    border: 1px solid #333;
    padding: 6px 10px;
    width: 25%;
    vertical-align: top;
  }
  table.info td.label { font-weight: 600; color: #333; width: 22%; }
  table.pay { width: 100%; border-collapse: collapse; border-top: 1px solid #333; }
  table.pay th {
    border: 1px solid #333;
    padding: 7px 10px;
    background: #f5f5f5;
    text-align: left;
    font-size: 12px;
  }
  table.pay th.amount, table.pay td.amount { text-align: right; }
  table.pay td {
    border: 1px solid #333;
    padding: 6px 10px;
  }
  table.pay tr.total td { font-weight: 700; background: #f9f9f9; }
  table.pay tr.net td { font-weight: 700; background: #f0f0f0; font-size: 13px; }
  .words { text-align: right; font-style: italic; font-weight: 600; }
  .note {
    padding: 10px 16px;
    font-size: 10.5px;
    color: #555;
    border-top: 1px solid #333;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      ${company.logoUrl ? `<img src="${escapeHtml(company.logoUrl)}" />` : ''}
      <div class="header-text">
        <div class="company-name">${escapeHtml(company.name)}</div>
        <div class="company-meta">${escapeHtml(company.address)}</div>
        <div class="company-meta">Phone No: ${escapeHtml(company.phone)}</div>
      </div>
    </div>

    <div class="title">Salary Slip to ${escapeHtml(monthYearLabel)}</div>

    <table class="info">
      <tr>
        <td class="label">Employee Name</td>
        <td>${escapeHtml(employee.employee_name)}</td>
        <td class="label">Employee ID</td>
        <td>${escapeHtml(employee.employee_id)}</td>
      </tr>
      <tr>
        <td class="label">Designation</td>
        <td>${escapeHtml(employee.designation)}</td>
        <td class="label">Duration</td>
        <td>${escapeHtml(duration)}</td>
      </tr>
      <tr>
        <td class="label">Date of Joining</td>
        <td>${formatDateOnly(employee.date_of_joining)}</td>
        <td class="label">Bank Name</td>
        <td>${escapeHtml(employee.bank_name)}</td>
      </tr>
      <tr>
        <td class="label">PAN</td>
        <td>${escapeHtml(employee.pan)}</td>
        <td class="label">Bank A/c No</td>
        <td>${escapeHtml(employee.bank_account_number)}</td>
      </tr>
      <tr>
        <td class="label">ESIC No</td>
        <td>${escapeHtml(employee.esic_no) || '-'}</td>
        <td class="label">Month Days</td>
        <td>${escapeHtml(salaryData.month_days)}</td>
      </tr>
      <tr>
        <td class="label">UAN No</td>
        <td>${escapeHtml(employee.uan_no)}</td>
        <td class="label">Paid Days</td>
        <td>${escapeHtml(salaryData.paid_days)}</td>
      </tr>
    </table>

    <table class="pay">
      <tr>
        <th style="width:30%">EARNINGS</th>
        <th class="amount" style="width:20%">AMOUNT</th>
        <th style="width:30%">DEDUCTIONS</th>
        <th class="amount" style="width:20%">AMOUNT</th>
      </tr>
      <tr>
        <td>Basic</td>
        <td class="amount">${cell(calc.earnings.basic)}</td>
        <td>Provident Fund (Employee)</td>
        <td class="amount">${cell(calc.deductions.pf_employee)}</td>
      </tr>
      <tr>
        <td>HRA</td>
        <td class="amount">${cell(calc.earnings.hra)}</td>
        <td>${showEsic ? 'ESIC (Employee)' : ''}</td>
        <td class="amount">${showEsic ? cell(calc.deductions.esic_employee) : ''}</td>
      </tr>
      <tr>
        <td>Conveyance Allowances</td>
        <td class="amount">${cell(calc.earnings.conveyance_allowances)}</td>
        <td>Other Deductions</td>
        <td class="amount">${cell(calc.deductions.other_deductions)}</td>
      </tr>
      <tr>
        <td>Medical Allowances</td>
        <td class="amount">${cell(calc.earnings.medical_allowances)}</td>
        <td></td>
        <td class="amount"></td>
      </tr>
      <tr>
        <td>Special Allowances</td>
        <td class="amount">${cell(calc.earnings.special_allowances)}</td>
        <td></td>
        <td class="amount"></td>
      </tr>
      <tr>
        <td>Other Earnings</td>
        <td class="amount">${cell(calc.earnings.other_earnings)}</td>
        <td></td>
        <td class="amount"></td>
      </tr>
      <tr class="total">
        <td>Gross Earnings (A)</td>
        <td class="amount">${formatCurrency(calc.grossEarnings)}</td>
        <td>Gross Deductions (B)</td>
        <td class="amount">${formatCurrency(calc.grossDeductions)}</td>
      </tr>
      <tr class="net">
        <td>Net Pay (A - B)</td>
        <td class="amount">${formatCurrency(calc.netPay)}</td>
        <td colspan="2" class="words">${escapeHtml(amountInWords)}</td>
      </tr>
    </table>

    <div class="note">Note: This is a system generated payslip and does not require signature</div>
  </div>
</body>
</html>`;
}

module.exports = { renderPayslipHtml, formatCurrency };
