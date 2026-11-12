import { Box, Paper, Typography, Divider } from '@mui/material';
import { formatCurrency, formatDate, formatDays } from '../utils/format.js';
import { MARK_GRADIENT } from '../theme.js';

const GRID = '#000';
const BAND_TINT = '#f2f2f2';
const TOTALS_TINT = '#f2f2f2';

const infoLabelSx = { color: '#000', fontSize: 12.5, py: 0.9, px: 1.5, borderRight: '1px solid', borderColor: GRID };
const infoValueSx = { fontWeight: 600, fontSize: 12.5, py: 0.9, px: 1.5, borderRight: '1px solid', borderColor: GRID, wordBreak: 'break-word' };

function InfoPair({ label, value, borderless }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', borderBottom: borderless ? 'none' : '1px solid', borderColor: GRID }}>
      <Box sx={infoLabelSx}>{label}</Box>
      <Box sx={{ ...infoValueSx, borderRight: 'none' }}>{value || '-'}</Box>
    </Box>
  );
}

function InfoRow({ labelA, valueA, labelB, valueB, last }) {
  return (
    <>
      {/* Desktop / tablet: both pairs on one line */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'grid' },
          gridTemplateColumns: '1fr 1.3fr 1fr 1.3fr',
          borderBottom: last ? 'none' : '1px solid', borderColor: GRID,
        }}
      >
        <Box sx={infoLabelSx}>{labelA}</Box>
        <Box sx={infoValueSx}>{valueA || '-'}</Box>
        <Box sx={infoLabelSx}>{labelB}</Box>
        <Box sx={{ ...infoValueSx, borderRight: 'none' }}>{valueB || '-'}</Box>
      </Box>
      {/* Mobile: each label/value pair stacked on its own line */}
      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        <InfoPair label={labelA} value={valueA} />
        <InfoPair label={labelB} value={valueB} borderless={last} />
      </Box>
    </>
  );
}

function buildLineItems(calc, payrollType) {
  const earnings = [
    { label: 'Basic', amount: calc.earnings.basic },
    { label: 'HRA', amount: calc.earnings.hra },
    { label: 'Conveyance allowances', amount: calc.earnings.conveyanceAllowances },
    { label: 'Medical allowances', amount: calc.earnings.medicalAllowances },
    { label: 'Special Allowances', amount: calc.earnings.specialAllowances },
    { label: 'Night Shift Allowances', amount: calc.earnings.nightShiftAllowances },
  ];
  if (calc.earnings.otherEarnings > 0) earnings.push({ label: 'Other Earnings', amount: calc.earnings.otherEarnings });

  const deductions = [];
  if (payrollType !== 'NO_DEDUCTION') {
    if (payrollType === 'PF_ESI') deductions.push({ label: 'ESIC (Employee)', amount: calc.deductions.esicEmployee });
    deductions.push({ label: 'Provident Fund (Employee)', amount: calc.deductions.pfEmployee });
    if (calc.deductions.otherDeductions > 0) deductions.push({ label: 'Other Deductions', amount: calc.deductions.otherDeductions });
  }

  const rowCount = Math.max(earnings.length, deductions.length);
  while (earnings.length < rowCount) earnings.push({ label: '', amount: null });
  while (deductions.length < rowCount) deductions.push({ label: '', amount: null });

  return { earnings, deductions };
}

function AmountLine({ label, amount }) {
  if (!label) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, fontSize: 12.5, py: 1, px: 1.5, borderBottom: '1px solid', borderColor: GRID }}>
      <Box>{label}</Box>
      <Box sx={{ fontWeight: 600 }}>{amount === null ? '-' : formatCurrency(amount)}</Box>
    </Box>
  );
}

export default function PayslipPreview({ data }) {
  if (!data) return null;
  const { company, employee, salaryData, calc, monthLabel, payrollDuration, amountInWords } = data;
  const { earnings, deductions } = buildLineItems(calc, salaryData.payroll_type);

  return (
    <Paper variant="outlined" sx={{ maxWidth: 820, mx: 'auto', overflow: 'hidden', borderRadius: 0, borderColor: GRID, color: '#000', boxShadow: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: { xs: 1.5, sm: 2.25 }, p: { xs: 1.5, sm: 2.5 }, borderBottom: '1px solid', borderColor: GRID }}>
        {company.logoUrl ? (
          <Box
            component="img"
            src={company.logoUrl}
            alt={company.name}
            sx={{ display: 'block', height: { xs: 40, sm: 62 }, width: 'auto', maxWidth: { xs: 90, sm: 160 }, flexShrink: 0 }}
          />
        ) : (
          <Box
            sx={{
              width: { xs: 44, sm: 60 }, height: { xs: 44, sm: 60 }, borderRadius: '50%', flexShrink: 0,
              display: 'grid', placeItems: 'center', background: MARK_GRADIENT, color: '#fff',
              fontSize: { xs: 18, sm: 26 }, fontWeight: 700, fontFamily: 'Georgia, serif',
            }}
          >
            M
          </Box>
        )}
        <Box sx={{ minWidth: 0, pl: { xs: 1.5, sm: 2.25 }, borderLeft: '1px solid #DADADA' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: { xs: '1rem', sm: '1.25rem' }, color: '#000' }}>{company.name}</Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#333' }}>{company.address}</Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#333', mt: 0.25 }}>Phone No: {company.phone}</Typography>
        </Box>
      </Box>

      <Box sx={{ textAlign: 'center', py: 1, px: 1, backgroundColor: '#F5F9F2', color: '#266929', fontWeight: 700, fontSize: 13, borderBottom: '1px solid', borderColor: GRID }}>
        Salary Slip for {monthLabel}
      </Box>

      <Box>
        <InfoRow labelA="Employee Name" valueA={employee.employee_name} labelB="Employee ID" valueB={employee.employee_id} />
        <InfoRow labelA="Designation" valueA={employee.designation} labelB="Duration" valueB={payrollDuration} />
        <InfoRow labelA="Date of Joining" valueA={formatDate(employee.date_of_joining)} labelB="Bank Name" valueB={employee.bank_name} />
        <InfoRow labelA="PAN" valueA={employee.pan} labelB="Bank A/c No" valueB={employee.bank_account_number} />
        <InfoRow labelA="ESIC No" valueA={employee.esic_no} labelB="Month Day" valueB={formatDays(salaryData.month_days)} />
        <InfoRow labelA="UAN NO" valueA={employee.uan_no} labelB="Paid Day" valueB={formatDays(salaryData.paid_days)} last />
      </Box>

      {/* Desktop / tablet: earnings and deductions side by side */}
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr 1fr', backgroundColor: BAND_TINT, fontWeight: 700, fontSize: 12.5, borderTop: '1px solid', borderBottom: '1px solid', borderColor: GRID }}>
          <Box sx={{ p: 1.2, borderRight: '1px solid', borderColor: GRID }}>EARNINGS</Box>
          <Box sx={{ p: 1.2, textAlign: 'right', borderRight: '1px solid', borderColor: GRID }}>AMOUNT</Box>
          <Box sx={{ p: 1.2, borderRight: '1px solid', borderColor: GRID }}>DEDUCTIONS</Box>
          <Box sx={{ p: 1.2, textAlign: 'right' }}>AMOUNT</Box>
        </Box>

        {earnings.map((e, idx) => (
          <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr 1fr', fontSize: 12.5, borderBottom: '1px solid', borderColor: GRID }}>
            <Box sx={{ p: 1.2, borderRight: '1px solid', borderColor: GRID }}>{e.label}</Box>
            <Box sx={{ p: 1.2, textAlign: 'right', borderRight: '1px solid', borderColor: GRID }}>{e.amount === null ? '-' : formatCurrency(e.amount)}</Box>
            <Box sx={{ p: 1.2, borderRight: '1px solid', borderColor: GRID }}>{deductions[idx].label}</Box>
            <Box sx={{ p: 1.2, textAlign: 'right' }}>{deductions[idx].amount === null ? '-' : formatCurrency(deductions[idx].amount)}</Box>
          </Box>
        ))}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr 1fr', fontWeight: 700, fontSize: 12.5, backgroundColor: TOTALS_TINT, borderTop: '1px solid', borderBottom: '1px solid', borderColor: GRID }}>
          <Box sx={{ p: 1.2, borderRight: '1px solid', borderColor: GRID }}>Gross Earnings (A)</Box>
          <Box sx={{ p: 1.2, textAlign: 'right', borderRight: '1px solid', borderColor: GRID }}>{formatCurrency(calc.grossEarnings)}</Box>
          <Box sx={{ p: 1.2, borderRight: '1px solid', borderColor: GRID }}>Gross Deductions (B)</Box>
          <Box sx={{ p: 1.2, textAlign: 'right' }}>{formatCurrency(calc.grossDeductions)}</Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 2.4fr', fontWeight: 700, backgroundColor: '#fff' }}>
          <Box sx={{ p: 1.5, borderRight: '1px solid', borderColor: GRID }}>Net Pay (A - B)</Box>
          <Box sx={{ p: 1.5, textAlign: 'right', fontSize: 15, color: '#000' }}>{formatCurrency(calc.netPay)}</Box>
          <Box sx={{ p: 1.5, textAlign: 'right' }}>{amountInWords}</Box>
        </Box>
      </Box>

      {/* Mobile: earnings and deductions stacked as separate panels */}
      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        <Box sx={{ backgroundColor: BAND_TINT, fontWeight: 700, fontSize: 12.5, py: 1, px: 1.5, borderTop: '1px solid', borderBottom: '1px solid', borderColor: GRID }}>
          EARNINGS
        </Box>
        {earnings.map((e, idx) => <AmountLine key={`e-${idx}`} label={e.label} amount={e.amount} />)}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12.5, backgroundColor: TOTALS_TINT, py: 1, px: 1.5, borderBottom: '1px solid', borderColor: GRID }}>
          <Box>Gross Earnings (A)</Box>
          <Box>{formatCurrency(calc.grossEarnings)}</Box>
        </Box>

        <Box sx={{ backgroundColor: BAND_TINT, fontWeight: 700, fontSize: 12.5, py: 1, px: 1.5, borderBottom: '1px solid', borderColor: GRID }}>
          DEDUCTIONS
        </Box>
        {deductions.map((d, idx) => <AmountLine key={`d-${idx}`} label={d.label} amount={d.amount} />)}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12.5, backgroundColor: TOTALS_TINT, py: 1, px: 1.5, borderBottom: '1px solid', borderColor: GRID }}>
          <Box>Gross Deductions (B)</Box>
          <Box>{formatCurrency(calc.grossDeductions)}</Box>
        </Box>

        <Box sx={{ fontWeight: 700, backgroundColor: '#fff', p: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
            <Box>Net Pay (A - B)</Box>
            <Box sx={{ color: '#000' }}>{formatCurrency(calc.netPay)}</Box>
          </Box>
          <Box sx={{ mt: 0.5, fontSize: 12, fontWeight: 600, color: '#333' }}>{amountInWords}</Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: GRID }} />
      <Typography variant="caption" align="center" sx={{ display: 'block', py: 1.5, px: 1, fontStyle: 'italic', color: '#333' }}>
        Note: This is a system generated payslip and does not require signature
      </Typography>
    </Paper>
  );
}
