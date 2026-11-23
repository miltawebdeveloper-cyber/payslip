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
const cellSx = { px: 1.5, py: 0.875, fontSize: 12, minWidth: 0, overflowWrap: 'anywhere' };
const labelSx = { ...cellSx, color: C.inkSoft };
const valueSx = { ...cellSx, fontWeight: 600, borderLeft: LINE };
const amountSx = { textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

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
                <Box sx={{ ...labelSx, borderLeft: i ? LINE : 'none' }}>{field.label}</Box>
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

function PayLine({ label, amount, sx }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, px: 1.5, py: 0.875, fontSize: 12, ...sx }}>
      <Box sx={{ minWidth: 0 }}>{label}</Box>
      <Box sx={amountSx}>{amount}</Box>
    </Box>
  );
}

function PaySections({ sections }) {
  if (!sections.length) return null;
  const twoUp = sections.length === 2;
  return (
    <Box sx={{ ...blockSx, display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: twoUp ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)' } }}>
      {sections.map((section, idx) => (
        <Box
          key={section.key}
          sx={{
            display: 'flex', flexDirection: 'column', minWidth: 0,
            ...(idx > 0 && { borderTop: { xs: FRAME, sm: 'none' }, borderLeft: { xs: 'none', sm: FRAME } }),
          }}
        >
          <PayLine
            label={section.title}
            amount="Amount"
            sx={{
              backgroundColor: C.band, color: C.inkSoft, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: LINE,
            }}
          />
          {section.items.map((item, i) => (
            <PayLine key={item.key} label={item.label} amount={formatCurrency(item.amount)} sx={{ borderTop: i ? LINE : 'none' }} />
          ))}
          <PayLine
            label={section.total.label}
            amount={formatCurrency(section.total.amount)}
            sx={{ mt: 'auto', backgroundColor: C.bandStrong, fontWeight: 700, borderTop: LINE }}
          />
        </Box>
      ))}
    </Box>
  );
}

function NetPay({ netPay, twoUp }) {
  return (
    <Box sx={{ ...blockSx, display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: twoUp ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.25, fontWeight: 700, fontSize: 12.5 }}>
        <Box>{netPay.label}</Box>
        <Box sx={{ ...amountSx, fontSize: 15 }}>{formatCurrency(netPay.amount)}</Box>
      </Box>
      {netPay.inWords && (
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right',
            px: 1.5, py: 1.25, fontWeight: 600, fontSize: 11.5, color: C.inkSoft,
            borderTop: { xs: LINE, sm: twoUp ? 'none' : LINE },
            borderLeft: { xs: 'none', sm: twoUp ? LINE : 'none' },
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
        <NetPay netPay={netPay} twoUp={paySections.length === 2} />
      </Box>

      <Box sx={{ textAlign: 'center', fontSize: 11, fontStyle: 'italic', color: C.inkMuted, px: 1.5, pb: 1.75 }}>
        Note: This is a system generated payslip and does not require signature
      </Box>
    </Paper>
  );
}
