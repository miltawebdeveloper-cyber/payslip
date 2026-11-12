import { Box } from '@mui/material';
import { PAYROLL_TYPE_LABELS } from '../utils/constants.js';
import { BRAND } from '../theme.js';

// Tones step down the logo palette: full deductions in forest green, PF-only
// in lime, no deductions in neutral grey.
const TONES = {
  PF_ESI: { color: BRAND.greenDark, bg: BRAND.greenSoft, dot: BRAND.green },
  PF_ONLY: { color: '#46590F', bg: BRAND.limeSoft, dot: BRAND.lime },
  NO_DEDUCTION: { color: BRAND.inkSoft, bg: '#F0F2EF', dot: '#A6AFA8' },
};

export default function PayrollTypeChip({ type, sx }) {
  const tone = TONES[type] || TONES.NO_DEDUCTION;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.625,
        px: 0.875, py: 0.125, borderRadius: 99,
        fontSize: '0.6875rem', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'nowrap',
        color: tone.color, backgroundColor: tone.bg,
        ...sx,
      }}
    >
      <Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: tone.dot, flexShrink: 0 }} />
      {PAYROLL_TYPE_LABELS[type] || type}
    </Box>
  );
}
