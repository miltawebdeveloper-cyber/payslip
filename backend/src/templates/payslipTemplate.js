function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHeader(company) {
  const meta = [
    company.address && `<p class="company-meta">${escapeHtml(company.address)}</p>`,
    company.phone && `<p class="company-meta">Phone No: ${escapeHtml(company.phone)}</p>`,
  ].filter(Boolean).join('');

  return `
    <header class="brand">
      ${company.logoUrl ? `<div class="logo"><img src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.name || '')}" /></div>` : ''}
      <div class="company${company.logoUrl ? ' with-logo' : ''}">
        ${company.name ? `<p class="company-name">${escapeHtml(company.name)}</p>` : ''}
        ${meta}
      </div>
    </header>`;
}

function renderDetails(detailRows) {
  if (!detailRows.length) return '';
  const rows = detailRows
    .map((row) => {
      const cells = row
        .map((field) => `<th>${escapeHtml(field.label)}</th><td${row.length === 1 ? ' colspan="3"' : ''}>${escapeHtml(field.value)}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <table class="block details">
      <colgroup><col style="width:22%" /><col style="width:28%" /><col style="width:22%" /><col style="width:28%" /></colgroup>
      ${rows}
    </table>`;
}

function line(className, label, amount) {
  return `<div class="pay-line ${className}"><span>${escapeHtml(label)}</span><span class="amount">${escapeHtml(amount)}</span></div>`;
}

function renderPaySections(paySections) {
  if (!paySections.length) return '';
  const columns = paySections
    .map((section) => `
      <div class="pay-col">
        ${line('pay-head', section.title, 'Amount')}
        ${section.items.map((item) => line('pay-item', item.label, formatCurrency(item.amount))).join('')}
        ${line('pay-total', section.total.label, formatCurrency(section.total.amount))}
      </div>`)
    .join('');
  return `<div class="block pay${paySections.length === 2 ? ' two-up' : ''}">${columns}</div>`;
}

function renderNetPay(netPay, twoUp) {
  return `
    <div class="block net${twoUp ? ' two-up' : ''}">
      <div class="net-main"><span>${escapeHtml(netPay.label)}</span><span class="amount net-amount">${formatCurrency(netPay.amount)}</span></div>
      ${netPay.inWords ? `<div class="net-words">${escapeHtml(netPay.inWords)}</div>` : ''}
    </div>`;
}

// Browser printing only: a zero page margin stops the browser adding its own
// date/URL headers and footers, and the padding puts back the same margins
// Puppeteer applies to the PDF (pdfService), so both come out identical.
const BROWSER_PRINT_CSS = `
  @page { size: A4; margin: 0; }
  html { padding: 16mm 10mm; }`;

/**
 * Renders a payslip layout (see payslipLayoutService) as a self-contained
 * HTML document. The same output feeds Puppeteer for the PDF download and
 * the browser for Print, so both show exactly the fields in the layout —
 * nothing is added here that the layout left out.
 */
function renderPayslipHtml(layout, { browserPrint = false } = {}) {
  const twoUp = layout.paySections.length === 2;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(layout.documentTitle)}</title>
<style>
  /* Keep in sync with the live preview: frontend/src/components/PayslipPreview.jsx */
  :root {
    --ink: #1F2328;
    --ink-soft: #5B636D;
    --ink-muted: #8B929B;
    --frame: #E3E6EA;
    --line: #EEF0F2;
    --band: #F6F7F9;
    --band-strong: #F1F3F5;
    --brand: #266929;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: var(--ink);
    padding: 24px;
    font-size: 11.5px;
    line-height: 1.45;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  p { margin: 0; }
  .sheet { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid var(--frame); break-inside: avoid; }

  .brand { display: flex; justify-content: center; align-items: center; gap: 18px; padding: 18px 22px; }
  .logo img { display: block; height: 60px; width: auto; max-width: 160px; }
  .company { text-align: left; }
  .company.with-logo { padding-left: 18px; border-left: 1px solid var(--frame); }
  .company-name { font-size: 19px; font-weight: 700; margin-bottom: 3px; letter-spacing: -0.01em; }
  .company-meta { font-size: 10.5px; line-height: 1.6; color: var(--ink-soft); }

  .title {
    text-align: center; font-weight: 700; font-size: 12px; letter-spacing: 0.03em;
    padding: 8px 12px; background: var(--band); color: var(--brand);
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
  }

  .content { padding: 16px 18px 18px; }
  .block { border: 1px solid var(--frame); }
  .block + .block { margin-top: 14px; }

  table.details { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .details th, .details td {
    padding: 7px 12px; text-align: left; vertical-align: top; font-size: 11px;
    border-left: 1px solid var(--line); overflow-wrap: anywhere;
  }
  .details th:first-child { border-left: none; }
  .details tr + tr > * { border-top: 1px solid var(--line); }
  .details th { font-weight: 400; color: var(--ink-soft); }
  .details td { font-weight: 600; }

  .pay, .net { display: grid; grid-template-columns: minmax(0, 1fr); }
  .pay.two-up, .net.two-up { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .pay-col { display: flex; flex-direction: column; }
  .pay-col + .pay-col { border-left: 1px solid var(--frame); }
  .pay-line { display: flex; justify-content: space-between; gap: 12px; padding: 7px 12px; }
  .pay-head {
    background: var(--band); color: var(--ink-soft); font-size: 10.5px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 1px solid var(--line);
  }
  .pay-item + .pay-item { border-top: 1px solid var(--line); }
  .pay-total { margin-top: auto; background: var(--band-strong); font-weight: 700; border-top: 1px solid var(--line); }
  .amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }

  .net-main { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 12px; font-weight: 700; }
  .net-amount { font-size: 14px; }
  .net-words {
    display: flex; align-items: center; justify-content: flex-end; padding: 10px 12px;
    text-align: right; font-weight: 600; font-size: 10.5px; color: var(--ink-soft);
  }
  .net.two-up .net-words { border-left: 1px solid var(--line); }
  .net:not(.two-up) .net-words { border-top: 1px solid var(--line); }

  .note { text-align: center; font-size: 10px; font-style: italic; color: var(--ink-muted); padding: 0 12px 14px; }
  ${browserPrint ? BROWSER_PRINT_CSS : ''}
</style>
</head>
<body>
  <div class="sheet">
    ${renderHeader(layout.company)}
    <div class="title">${escapeHtml(layout.title)}</div>
    <div class="content">
      ${renderDetails(layout.detailRows)}
      ${renderPaySections(layout.paySections)}
      ${renderNetPay(layout.netPay, twoUp)}
    </div>
    <div class="note">Note: This is a system generated payslip and does not require signature</div>
  </div>
</body>
</html>`;
}

module.exports = { renderPayslipHtml, formatCurrency };
