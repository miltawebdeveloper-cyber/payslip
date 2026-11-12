import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogActions, Button, Grid, TextField,
  MenuItem, Typography, Box, Alert, InputAdornment, CircularProgress, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import DialogHeader from './DialogHeader.jsx';
import { MONTH_OPTIONS, PAYROLL_TYPE_OPTIONS } from '../utils/constants.js';
import { toDateInputValue } from '../utils/format.js';
import { lookupEmployeeById } from '../api/salaryDataApi.js';
import { BRAND } from '../theme.js';

const EMPTY_FORM = {
  employee_id: '',
  employee_name: '',
  designation: '',
  date_of_joining: '',
  bank_name: '',
  bank_account_number: '',
  pan: '',
  esic_no: '',
  uan_no: '',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  month_days: 30,
  paid_days: 30,
  payroll_type: 'PF_ESI',
  basic: 0,
  hra: 0,
  conveyance_allowances: 0,
  medical_allowances: 0,
  special_allowances: 0,
  night_shift_allowances: 0,
  other_earnings: 0,
  pf_employee: 0,
  esic_employee: 0,
  other_deductions: 0,
};

const NUMERIC_FIELDS = [
  'year', 'month_days', 'paid_days', 'basic', 'hra', 'conveyance_allowances',
  'medical_allowances', 'special_allowances', 'night_shift_allowances', 'other_earnings',
  'pf_employee', 'esic_employee', 'other_deductions',
];

// Short labels: the section titles already say Earnings / Deductions, and they
// match the column headers in the salary table.
const EARNING_FIELDS = [
  { key: 'basic', label: 'Basic' },
  { key: 'hra', label: 'HRA' },
  { key: 'conveyance_allowances', label: 'Conveyance' },
  { key: 'medical_allowances', label: 'Medical' },
  { key: 'special_allowances', label: 'Special' },
  { key: 'night_shift_allowances', label: 'Night Shift' },
  { key: 'other_earnings', label: 'Other Earnings' },
];

const DEDUCTION_FIELDS = [
  { key: 'pf_employee', label: 'PF (Employee)' },
  { key: 'esic_employee', label: 'ESIC (Employee)' },
  { key: 'other_deductions', label: 'Other Deductions' },
];

const AMOUNT_GRID = { xs: 6, sm: 4, md: 3 };

const RUPEE_SLOT_PROPS = {
  input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
  htmlInput: { min: 0, step: '0.01', style: { fontVariantNumeric: 'tabular-nums' } },
};

function Section({ icon, title, children }) {
  return (
    <Box
      sx={{
        border: `1px solid ${BRAND.line}`, borderRadius: '10px', p: { xs: 1.25, sm: 1.5 }, backgroundColor: '#fff',
        '& + &': { mt: 1.25 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
        <Box
          sx={{
            width: 22, height: 22, borderRadius: '6px', display: 'grid', placeItems: 'center',
            color: BRAND.green, backgroundColor: BRAND.greenWash, flexShrink: 0,
            '& .MuiSvgIcon-root': { fontSize: 14 },
          }}
        >
          {icon}
        </Box>
        <Typography variant="subtitle2" sx={{ fontSize: '0.75rem' }}>{title}</Typography>
      </Box>
      <Grid container spacing={1.5}>{children}</Grid>
    </Box>
  );
}

export default function SalaryRowDialog({ open, onClose, onSubmit, initialValues, submitting }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [existingEmployeeNote, setExistingEmployeeNote] = useState('');
  const isEdit = Boolean(initialValues);

  useEffect(() => {
    if (open) {
      setError('');
      setExistingEmployeeNote('');
      if (initialValues) {
        setForm({
          ...EMPTY_FORM,
          ...initialValues,
          date_of_joining: toDateInputValue(initialValues.date_of_joining),
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, initialValues]);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmployeeIdBlur = async () => {
    if (isEdit) return;
    const employeeId = form.employee_id.trim();
    if (!employeeId) {
      setExistingEmployeeNote('');
      return;
    }
    const existing = await lookupEmployeeById(employeeId);
    if (existing) {
      setForm((prev) => ({
        ...prev,
        employee_name: existing.employee_name || prev.employee_name,
        designation: existing.designation || prev.designation,
        date_of_joining: toDateInputValue(existing.date_of_joining) || prev.date_of_joining,
        bank_name: existing.bank_name || prev.bank_name,
        bank_account_number: existing.bank_account_number || prev.bank_account_number,
        pan: existing.pan || prev.pan,
        esic_no: existing.esic_no || prev.esic_no,
        uan_no: existing.uan_no || prev.uan_no,
      }));
      setExistingEmployeeNote(`Existing employee found — their saved details have been filled in. You're adding a new month's salary record for them.`);
    } else {
      setExistingEmployeeNote('');
    }
  };

  const handleSubmit = () => {
    if (!form.employee_id.trim() || !form.employee_name.trim()) {
      setError('Employee ID and Employee Name are required.');
      return;
    }
    if (!form.month || !form.year) {
      setError('Month and Year are required.');
      return;
    }

    const payload = { ...form };
    NUMERIC_FIELDS.concat(['month']).forEach((field) => {
      payload[field] = Number(payload[field]) || 0;
    });
    if (!payload.date_of_joining) payload.date_of_joining = null;

    setError('');
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogHeader
        icon={isEdit ? <EditNoteOutlinedIcon /> : <PersonAddAltOutlinedIcon />}
        title={isEdit ? 'Edit salary record' : 'Add salary record'}
        subtitle={isEdit
          ? `${initialValues.employee_name} · ${MONTH_OPTIONS[initialValues.month - 1]?.label} ${initialValues.year}`
          : 'One employee, one month. Amounts are monthly figures in rupees.'}
        onClose={onClose}
        disabled={submitting}
      />
      <DialogContent dividers sx={{ backgroundColor: BRAND.canvas, px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
        {error && <Alert severity="error" sx={{ mb: 1.25 }}>{error}</Alert>}
        {existingEmployeeNote && <Alert severity="info" sx={{ mb: 1.25 }}>{existingEmployeeNote}</Alert>}

        <Section icon={<BadgeOutlinedIcon />} title="Employee details">
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              label="Employee ID" fullWidth required size="small"
              value={form.employee_id} onChange={handleChange('employee_id')}
              onBlur={handleEmployeeIdBlur}
              disabled={isEdit}
              helperText={isEdit ? 'Can’t be changed' : 'Existing IDs auto-fill details'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              label="Employee Name" fullWidth required size="small"
              value={form.employee_name} onChange={handleChange('employee_name')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              label="Designation" fullWidth size="small"
              value={form.designation} onChange={handleChange('designation')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              label="Date of Joining" type="date" fullWidth size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.date_of_joining} onChange={handleChange('date_of_joining')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              label="Bank Name" fullWidth size="small"
              value={form.bank_name} onChange={handleChange('bank_name')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              label="Bank Account Number" fullWidth size="small"
              value={form.bank_account_number} onChange={handleChange('bank_account_number')}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              label="PAN" fullWidth size="small"
              value={form.pan} onChange={handleChange('pan')}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              label="ESIC No" fullWidth size="small"
              value={form.esic_no} onChange={handleChange('esic_no')}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              label="UAN No" fullWidth size="small"
              value={form.uan_no} onChange={handleChange('uan_no')}
            />
          </Grid>
        </Section>

        <Section icon={<EventNoteOutlinedIcon />} title="Payroll period">
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <TextField
              select label="Month" fullWidth required size="small"
              value={form.month} onChange={handleChange('month')}
            >
              {MONTH_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              label="Year" type="number" fullWidth required size="small"
              value={form.year} onChange={handleChange('year')}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              label="Month Days" type="number" fullWidth size="small"
              value={form.month_days} onChange={handleChange('month_days')}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              label="Paid Days" type="number" fullWidth size="small"
              value={form.paid_days} onChange={handleChange('paid_days')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8, md: 3 }}>
            <TextField
              select label="Payroll Type" fullWidth required size="small"
              value={form.payroll_type} onChange={handleChange('payroll_type')}
            >
              {PAYROLL_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Section>

        <Section icon={<TrendingUpRoundedIcon />} title="Earnings">
          {EARNING_FIELDS.map((field) => (
            <Grid key={field.key} size={AMOUNT_GRID}>
              <TextField
                label={field.label} type="number" fullWidth size="small"
                value={form[field.key]} onChange={handleChange(field.key)}
                slotProps={RUPEE_SLOT_PROPS}
              />
            </Grid>
          ))}
        </Section>

        <Section icon={<TrendingDownRoundedIcon />} title="Deductions">
          {DEDUCTION_FIELDS.map((field) => (
            <Grid key={field.key} size={AMOUNT_GRID}>
              <TextField
                label={field.label} type="number" fullWidth size="small"
                value={form[field.key]} onChange={handleChange(field.key)}
                slotProps={RUPEE_SLOT_PROPS}
              />
            </Grid>
          ))}
        </Section>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained" onClick={handleSubmit} disabled={submitting}
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ minWidth: 120 }}
        >
          {isEdit ? 'Save changes' : 'Add record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
