import { Fragment } from 'react';
import { Box, Paper } from '@mui/material';
// The payslip's own font, the same one the PDF embeds (payslipFonts.js), so
// the preview lays out exactly like the downloaded payslip.
import '@fontsource/arimo/latin-400.css';
import '@fontsource/arimo/latin-600.css';
import '@fontsource/arimo/latin-700.css';
import '@fontsource/arimo/latin-400-italic.css';
import { formatCurrency } from '../utils/format.js';

// Mirrors the PDF stylesheet in backend/src/templates/payslipTemplate.js so
// the preview looks like the downloaded / printed payslip. Keep in sync.
const C = {
  ink: '#1F2328',
  inkSoft: '#5B636D',
  inkMuted: '#8B929B',
  frame: '#E3E6EA',
  line: '#EEF0F2',
  band: '#F6F7F9',
  bandStrong: '#F1F3F5',
  brand: '#266929',
};
const FRAME = `1px solid ${C.frame}`;
const LINE = `1px solid ${C.line}`;
const FONT = "'Arimo', Arial, 'Helvetica Neue', sans-serif";

// Like --table-space in the PDF template: space around and between the
// tables, and the left/right padding of every part of the payslip.
// 30px on tablet / desktop, 10px on a phone.
const TABLE_SPACE = { xs: 1.25, sm: '30px' };
// Like --gap: top/bottom padding of the header, and the space below the note.
const GAP = { xs: 1.25, sm: 2 };

const blockSx = { border: FRAME };
// One cell style for every table, with a whole-pixel line height so every
// row is the same height. Labels are larger and bolder than their values,
// and each value sits left-aligned after a divider.
const cellSx = { px: 1.25, py: '7px', lineHeight: '17px', minWidth: 0, overflowWrap: 'anywhere', color: C.ink };
const labelSx = { ...cellSx, fontSize: 12, fontWeight: 600 };
const valueSx = { ...cellSx, fontSize: 11.5, fontWeight: 400, borderLeft: LINE };
const amountSx = { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
const headCellSx = { ...cellSx, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' };

// The same column grid as GRID in the PDF template, for every table:
// label | value | label | value, so the dividers line up from the details
// down to net pay. Single-pair rows use the first label column.
const GRID = { 1: '26fr 74fr', 2: '26fr 24fr 26fr 24fr' };
// Phones are too narrow for a 26% label column.
const PHONE_COLUMNS = '55fr 45fr';

// Pay table rows: header band, line items, and the totals band.
const PAY_ROW = {
  head: { row: { backgroundColor: C.band }, label: headCellSx, value: { ...headCellSx, borderLeft: LINE } },
  item: { row: { borderTop: LINE }, label: labelSx, value: { ...valueSx, ...amountSx } },
  total: {
    row: { backgroundColor: C.bandStrong, borderTop: LINE },
    label: { ...labelSx, fontWeight: 700 },
    value: { ...valueSx, ...amountSx, fontWeight: 700 },
  },
};

/**
 * The payslip only ever shows what the server's layout contains — the fields
 * this employee actually has data for — so preview, PDF and Print match.
 */
function Details({ rows }) {
  if (!rows.length) return null;
  return (
    <Box sx={blockSx}>
      {/* Tablet / desktop: two label/value pairs per row, like the PDF */}
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        {rows.map((row, idx) => (
          <Box
            key={row[0].key}
            sx={{ display: 'grid', gridTemplateColumns: GRID[2], borderTop: idx ? LINE : 'none' }}
          >
            {row.map((field, i) => (
              <Fragment key={field.key}>
                <Box sx={{ ...labelSx, borderLeft: i ? FRAME : 'none' }}>{field.label}</Box>
                <Box sx={{ ...valueSx, gridColumn: row.length === 1 ? 'span 3' : undefined }}>{field.value}</Box>
              </Fragment>
            ))}
          </Box>
        ))}
      </Box>
      {/* Mobile: one pair per line */}
      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        {rows.flat().map((field, idx) => (
          <Box key={field.key} sx={{ display: 'grid', gridTemplateColumns: PHONE_COLUMNS, borderTop: idx ? LINE : 'none' }}>
            <Box sx={labelSx}>{field.label}</Box>
            <Box sx={valueSx}>{field.value}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** One row of the pay table: a description/amount pair per section. */
function PayRow({ pairs, columns, variant }) {
  const style = PAY_ROW[variant];
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: columns || GRID[pairs.length], ...style.row }}>
      {pairs.map(([label, amount], i) => (
        <Fragment key={i}>
          <Box sx={{ ...style.label, borderLeft: i ? FRAME : 'none' }}>{label}</Box>
          <Box sx={style.value}>{amount}</Box>
        </Fragment>
      ))}
    </Box>
  );
}

const headPair = (section) => [section.title, 'Amount'];
const itemPair = (item) => (item ? [item.label, formatCurrency(item.amount)] : ['', '']);
const totalPair = (section) => [section.total.label, formatCurrency(section.total.amount)];

/**
 * Like the PDF, row N holds the Nth earning and the Nth deduction, so both
 * sides share row heights and lines; the totals share the last row. On a
 * phone the sections stack instead.
 */
function PaySections({ sections }) {
  if (!sections.length) return null;
  const rowCount = Math.max(...sections.map((section) => section.items.length));
  return (
    <Box>
      <Box sx={{ ...blockSx, display: { xs: 'none', sm: 'block' } }}>
        <PayRow pairs={sections.map(headPair)} variant="head" />
        {Array.from({ length: rowCount }, (_, row) => (
          <PayRow key={row} pairs={sections.map((section) => itemPair(section.items[row]))} variant="item" />
        ))}
        <PayRow pairs={sections.map(totalPair)} variant="total" />
      </Box>
      <Box sx={{ ...blockSx, display: { xs: 'block', sm: 'none' } }}>
        {sections.map((section, idx) => (
          <Box key={section.key} sx={{ borderTop: idx ? FRAME : 'none' }}>
            <PayRow pairs={[headPair(section)]} columns={PHONE_COLUMNS} variant="head" />
            {section.items.map((item) => (
              <PayRow key={item.key} pairs={[itemPair(item)]} columns={PHONE_COLUMNS} variant="item" />
            ))}
            <PayRow pairs={[totalPair(section)]} columns={PHONE_COLUMNS} variant="total" />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Net pay as two label/value rows, like the PDF: the amount, then the
 * amount in words, with the values in line with the tables above.
 */
function NetPay({ netPay }) {
  // Same row padding as every other row.
  const labelCellSx = { ...labelSx, fontSize: 13, fontWeight: 700 };
  const valueCellSx = { ...valueSx, fontSize: 12.5 };
  return (
    <Box sx={{ ...blockSx, display: 'grid', gridTemplateColumns: { xs: '40fr 60fr', sm: GRID[1] } }}>
      <Box sx={labelCellSx}>{netPay.label}</Box>
      <Box sx={{ ...valueCellSx, ...amountSx, fontWeight: 700 }}>{formatCurrency(netPay.amount)}</Box>
      {netPay.inWords && (
        <>
          <Box sx={{ ...labelCellSx, borderTop: LINE }}>Net Pay in Words</Box>
          <Box sx={{ ...valueCellSx, fontWeight: 600, borderTop: LINE }}>{netPay.inWords}</Box>
        </>
      )}
    </Box>
  );
}

export default function PayslipPreview({ data }) {
  const layout = data?.layout;
  if (!layout) return null;
  const { company, title, detailRows, paySections, netPay } = layout;

  return (
    <Paper
      variant="outlined"
      sx={{ maxWidth: 820, mx: 'auto', overflow: 'hidden', borderRadius: 0, borderColor: C.frame, color: C.ink, fontFamily: FONT, boxShadow: 3 }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: { xs: 1.5, sm: 2.25 }, py: GAP, px: TABLE_SPACE }}>
        {company.logoUrl && (
          <Box
            component="img"
            src={company.logoUrl}
            alt={company.name || ''}
            sx={{ display: 'block', height: { xs: 40, sm: 60 }, width: 'auto', maxWidth: { xs: 90, sm: 160 }, flexShrink: 0 }}
          />
        )}
        <Box sx={{ minWidth: 0, ...(company.logoUrl && { pl: { xs: 1.5, sm: 2.25 }, borderLeft: FRAME }) }}>
          {company.name && (
            <Box sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: { xs: '1rem', sm: '1.1875rem' }, letterSpacing: '-0.01em', mb: 0.375 }}>
              {company.name}
            </Box>
          )}
          {company.address && <Box sx={{ fontSize: 11.5, lineHeight: 1.6, color: C.inkSoft }}>{company.address}</Box>}
          {company.phone && <Box sx={{ fontSize: 11.5, lineHeight: 1.6, color: C.inkSoft }}>Phone No: {company.phone}</Box>}
        </Box>
      </Box>

      <Box
        sx={{
          // Same metrics as a table row (cellSx).
          textAlign: 'center', py: '7px', px: TABLE_SPACE, lineHeight: '17px', backgroundColor: C.band, color: C.brand, fontWeight: 700,
          fontSize: 13, letterSpacing: '0.03em', borderTop: LINE, borderBottom: LINE,
        }}
      >
        {title}
      </Box>

      <Box sx={{ display: 'grid', gap: TABLE_SPACE, p: TABLE_SPACE }}>
        <Details rows={detailRows} />
        <PaySections sections={paySections} />
        <NetPay netPay={netPay} />
      </Box>

      {/* Line height close to the text size, so the visible gap above and
          below the note matches the gaps between the tables. */}
      <Box sx={{ textAlign: 'center', fontSize: 11, lineHeight: '13px', fontStyle: 'italic', color: C.inkMuted, px: TABLE_SPACE, pb: GAP }}>
        Note: This is a system generated payslip and does not require signature
      </Box>
    </Paper>
  );
}
