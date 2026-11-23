import { Fragment } from 'react';
import { Box, Paper } from '@mui/material';
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
const FONT = "'Helvetica Neue', Arial, sans-serif";

const blockSx = { border: FRAME };
// A whole-pixel line height keeps every row the same height, like the PDF.
const cellSx = { px: 1.5, py: '7px', fontSize: 12, lineHeight: '17px', minWidth: 0, overflowWrap: 'anywhere' };
const labelSx = { ...cellSx, color: C.inkSoft };
const valueSx = { ...cellSx, fontWeight: 600, borderLeft: LINE };
const amountSx = { textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

// Same column widths as PAY_COLUMNS in the PDF template: description |
// amount (| description | amount), split at 50% like the details table.
const PAY_COLUMNS = { 1: '60fr 40fr', 2: '30fr 20fr 30fr 20fr' };
const payHeadSx = {
  backgroundColor: C.band, color: C.inkSoft, fontSize: 11, fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase',
};
const payTotalSx = { backgroundColor: C.bandStrong, fontWeight: 700, borderTop: LINE };

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
            sx={{ display: 'grid', gridTemplateColumns: '22fr 28fr 22fr 28fr', borderTop: idx ? LINE : 'none' }}
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
          <Box key={field.key} sx={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', borderTop: idx ? LINE : 'none' }}>
            <Box sx={labelSx}>{field.label}</Box>
            <Box sx={valueSx}>{field.value}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** One row of the pay table: a description/amount pair per section. */
function PayRow({ pairs, sx }) {
  // Cells take the row's font size, so the header row can set a smaller one.
  const payCellSx = { ...cellSx, fontSize: 'inherit' };
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: PAY_COLUMNS[pairs.length], fontSize: 12, ...sx }}>
      {pairs.map(([label, amount], i) => (
        <Fragment key={i}>
          <Box sx={{ ...payCellSx, borderLeft: i ? FRAME : 'none' }}>{label}</Box>
          <Box sx={{ ...payCellSx, ...amountSx }}>{amount}</Box>
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
        <PayRow pairs={sections.map(headPair)} sx={payHeadSx} />
        {Array.from({ length: rowCount }, (_, row) => (
          <PayRow key={row} pairs={sections.map((section) => itemPair(section.items[row]))} sx={{ borderTop: LINE }} />
        ))}
        <PayRow pairs={sections.map(totalPair)} sx={payTotalSx} />
      </Box>
      <Box sx={{ ...blockSx, display: { xs: 'block', sm: 'none' } }}>
        {sections.map((section, idx) => (
          <Box key={section.key} sx={{ borderTop: idx ? FRAME : 'none' }}>
            <PayRow pairs={[headPair(section)]} sx={payHeadSx} />
            {section.items.map((item) => (
              <PayRow key={item.key} pairs={[itemPair(item)]} sx={{ borderTop: LINE }} />
            ))}
            <PayRow pairs={[totalPair(section)]} sx={payTotalSx} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Net pay on the pay table's columns: the amount lines up with the Earnings
 * amounts and the words sit in the right half of the same row (below it on
 * a phone, or when there is only one section).
 */
function NetPay({ netPay, sectionCount }) {
  const twoUp = sectionCount === 2;
  const netCellSx = { ...cellSx, py: '9px' };
  return (
    <Box sx={{ ...blockSx, display: 'grid', gridTemplateColumns: { xs: PAY_COLUMNS[1], sm: PAY_COLUMNS[twoUp ? 2 : 1] } }}>
      <Box sx={{ ...netCellSx, fontWeight: 700 }}>{netPay.label}</Box>
      <Box sx={{ ...netCellSx, ...amountSx, fontWeight: 700, fontSize: 15 }}>{formatCurrency(netPay.amount)}</Box>
      {netPay.inWords && (
        <Box
          sx={{
            ...netCellSx, gridColumn: 'span 2', fontWeight: 600, fontSize: 11.5, color: C.inkSoft,
            borderTop: { xs: LINE, sm: twoUp ? 'none' : LINE },
            borderLeft: { xs: 'none', sm: twoUp ? FRAME : 'none' },
          }}
        >
          {netPay.inWords}
        </Box>
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: { xs: 1.5, sm: 2.25 }, p: { xs: 1.5, sm: 2.25 } }}>
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
          textAlign: 'center', py: 1, px: 1.5, backgroundColor: C.band, color: C.brand, fontWeight: 700,
          fontSize: 13, letterSpacing: '0.03em', borderTop: LINE, borderBottom: LINE,
        }}
      >
        {title}
      </Box>

      <Box sx={{ display: 'grid', gap: 1.75, p: { xs: 1.25, sm: 2 } }}>
        <Details rows={detailRows} />
        <PaySections sections={paySections} />
        <NetPay netPay={netPay} sectionCount={paySections.length} />
      </Box>

      <Box sx={{ textAlign: 'center', fontSize: 11, fontStyle: 'italic', color: C.inkMuted, px: 1.5, pb: 1.75 }}>
        Note: This is a system generated payslip and does not require signature
      </Box>
    </Paper>
  );
}
