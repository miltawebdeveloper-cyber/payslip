const { PAYSLIP_FONT_CSS, PAYSLIP_FONT_FAMILY } = require('./payslipFonts');

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

// One column grid for every table (widths in %): label | value | label |
// value, so each divider lines up from the details table down to net pay.
// Tables with a single label/value pair per row use the first label column
// and let the value run to the right edge.
const GRID = {
  2: [26, 24, 26, 24],
  1: [26, 74],
};

function colgroup(widths) {
  return `<colgroup>${widths.map((w) => `<col style="width:${w}%" />`).join('')}</colgroup>`;
}

// The right half of a two-pair table starts with a stronger divider.
function splitAttr(index) {
  return index > 0 ? ' class="split"' : '';
}

// Every table: <th> is a label, <td> the value it labels.
function renderDetails(detailRows) {
  if (!detailRows.length) return '';
  const rows = detailRows
    .map((row) => {
      const cells = row
        .map((field, i) => `<th${splitAttr(i)}>${escapeHtml(field.label)}</th><td${row.length === 1 ? ' colspan="3"' : ''}>${escapeHtml(field.value)}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <table class="block grid details">
      ${colgroup(GRID[2])}
      ${rows}
    </table>`;
}

function payCells(sectionIndex, label, amount) {
  return `<th${splitAttr(sectionIndex)}>${escapeHtml(label)}</th><td>${escapeHtml(amount)}</td>`;
}

/**
 * Earnings and Deductions share one table: row N holds the Nth earning and
 * the Nth deduction, so both sides always have the same row heights and
 * lines. The shorter side gets empty cells, and the totals share the last row.
 */
function renderPaySections(paySections) {
  if (!paySections.length) return '';
  const rowCount = Math.max(...paySections.map((section) => section.items.length));

  const head = paySections
    .map((section, i) => `<th${splitAttr(i)}>${escapeHtml(section.title)}</th><th class="value">Amount</th>`)
    .join('');
  const items = Array.from({ length: rowCount }, (_, row) => {
    const cells = paySections
      .map((section, i) => {
        const item = section.items[row];
        return item ? payCells(i, item.label, formatCurrency(item.amount)) : payCells(i, '', '');
      })
      .join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  const totals = paySections
    .map((section, i) => payCells(i, section.total.label, formatCurrency(section.total.amount)))
    .join('');

  return `
    <table class="block grid pay">
      ${colgroup(GRID[paySections.length])}
      <tr class="pay-head">${head}</tr>
      ${items}
      <tr class="pay-total">${totals}</tr>
    </table>`;
}

/**
 * Net pay as two label/value rows: the amount, then the amount in words,
 * with the values in line with the values of the tables above.
 */
function renderNetPay(netPay) {
  const words = netPay.inWords
    ? `<tr><th>Net Pay in Words</th><td class="net-words">${escapeHtml(netPay.inWords)}</td></tr>`
    : '';

  return `
    <table class="block grid net">
      ${colgroup(GRID[1])}
      <tr><th>${escapeHtml(netPay.label)}</th><td class="net-amount">${formatCurrency(netPay.amount)}</td></tr>
      ${words}
    </table>`;
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
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(layout.documentTitle)}</title>
<style>
  /* Keep in sync with the live preview: frontend/src/components/PayslipPreview.jsx */
  ${PAYSLIP_FONT_CSS}
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
  /* No body padding: the PDF page margins (pdfService) and the print
     margins (BROWSER_PRINT_CSS) already frame the sheet. */
  body {
    font-family: ${PAYSLIP_FONT_FAMILY};
    color: var(--ink);
    padding: 0;
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

  .content { padding: 16px; }
  .block { border: 1px solid var(--frame); }
  .block + .block { margin-top: 14px; }

  /* One cell style for every table, with a whole-pixel line height, so each
     row is exactly the same height and every row line lands on a pixel.
     Labels (<th>) are larger and bolder than their values (<td>), and every
     value sits left-aligned after a divider. */
  table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .grid th, .grid td {
    padding: 7px 10px; line-height: 16px; color: var(--ink);
    text-align: left; vertical-align: middle; overflow-wrap: anywhere;
  }
  .grid th { font-size: 11.5px; font-weight: 600; }
  .grid td { font-size: 11px; font-weight: 400; border-left: 1px solid var(--line); }
  .grid tr + tr > * { border-top: 1px solid var(--line); }
  .grid .split { border-left: 1px solid var(--frame); }
  .grid .value { border-left: 1px solid var(--line); }
  .pay td { white-space: nowrap; font-variant-numeric: tabular-nums; }

  .grid .pay-head > * {
    background: var(--band); font-size: 11.5px; font-weight: 700;
    letter-spacing: 0.05em; text-transform: uppercase;
  }
  .grid .pay-total > * { background: var(--band-strong); font-weight: 700; }

  .net th, .net td { padding-top: 9px; padding-bottom: 9px; }
  .net th { font-size: 12.5px; font-weight: 700; }
  .net td { font-size: 12px; font-weight: 700; }
  .net .net-amount { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .net .net-words { font-weight: 600; }

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
      ${renderNetPay(layout.netPay)}
    </div>
    <div class="note">Note: This is a system generated payslip and does not require signature</div>
  </div>
</body>
</html>`;
}

module.exports = { renderPayslipHtml, formatCurrency };
