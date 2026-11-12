import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Stack, TextField, MenuItem, Button, Paper, Typography, CircularProgress, Snackbar, Alert,
  Autocomplete, InputAdornment, Avatar, Skeleton, Link,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined';
import PageHeader from '../components/PageHeader.jsx';
import PayslipPreview from '../components/PayslipPreview.jsx';
import BrandMark from '../components/BrandMark.jsx';
import { PAYROLL_TYPE_LABELS } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';
import { downloadBlob } from '../utils/download.js';
import {
  fetchAvailableMonths, fetchEmployeesForMonth, fetchPayslipPreview, generatePayslipPdf,
  generateAllPayslips, getErrorMessage,
} from '../api/payslipApi.js';
import { BRAND, HERO_GRADIENT, HEADING_FONT, MARK_GRADIENT } from '../theme.js';

// The two-column layout depends on how wide the content area actually is
// (the sidebar can be collapsed), so it is driven by a container query rather
// than a viewport breakpoint.
const WIDE = '@container payslip (min-width: 900px)';
const MEDIUM = '@container payslip (min-width: 620px)';

function initialsOf(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function StepDot({ number, done }) {
  return (
    <Box
      sx={{
        width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
        fontSize: '0.625rem', fontWeight: 700,
        ...(done
          ? { background: MARK_GRADIENT, color: '#fff' }
          : { backgroundColor: BRAND.greenSoft, color: BRAND.greenDark }),
      }}
    >
      {done ? <CheckRoundedIcon sx={{ fontSize: 12 }} /> : number}
    </Box>
  );
}

function StepLabel({ number, label, done }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
      <StepDot number={number} done={done} />
      <Typography variant="subtitle2" sx={{ fontSize: '0.75rem' }}>{label}</Typography>
    </Stack>
  );
}

function NetPayCard({ preview, periodLabel }) {
  if (!preview) {
    return (
      <Box sx={{ borderRadius: '12px', px: 1.75, py: 1.5, border: `1px dashed ${BRAND.line}`, backgroundColor: '#fff' }}>
        <Typography variant="overline" sx={{ color: BRAND.inkMuted }}>Net pay</Typography>
        <Typography sx={{ fontFamily: HEADING_FONT, fontSize: '1.375rem', fontWeight: 800, color: '#C9D0C6', lineHeight: 1.2 }}>
          ₹ —
        </Typography>
        <Typography variant="caption" sx={{ color: BRAND.inkMuted }}>
          Appears once a pay period and employee are selected.
        </Typography>
      </Box>
    );
  }

  const { employee, calc, amountInWords, salaryData } = preview;

  return (
    <Box
      sx={{
        borderRadius: '12px', px: 1.75, py: 1.5, position: 'relative', overflow: 'hidden',
        background: HERO_GRADIENT, color: '#fff', boxShadow: 4,
      }}
    >
      <BrandMark size={140} ink="#fff" sx={{ position: 'absolute', right: -36, top: -30, opacity: 0.1 }} />

      <Box sx={{ position: 'relative' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="overline" noWrap sx={{ opacity: 0.8 }}>Net pay · {periodLabel}</Typography>
          <Box
            component="span"
            sx={{
              px: 0.75, borderRadius: 99, fontSize: '0.625rem', fontWeight: 700, lineHeight: 1.7,
              backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap',
            }}
          >
            {PAYROLL_TYPE_LABELS[salaryData.payroll_type] || salaryData.payroll_type}
          </Box>
        </Stack>

        <Typography
          sx={{
            fontFamily: HEADING_FONT, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15,
            fontSize: '1.625rem', fontVariantNumeric: 'tabular-nums',
          }}
        >
          <Box component="span" sx={{ fontSize: '0.6em', opacity: 0.75, mr: 0.5, verticalAlign: '0.3em' }}>₹</Box>
          {formatCurrency(calc.netPay)}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', opacity: 0.78, lineHeight: 1.4, fontSize: '0.6875rem' }}>
          {amountInWords}
        </Typography>

        <Box
          sx={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.25, pt: 1,
            borderTop: '1px solid rgba(255,255,255,0.16)',
          }}
        >
          {[
            { label: 'Gross earnings', value: calc.grossEarnings },
            { label: 'Gross deductions', value: calc.grossDeductions },
          ].map((item) => (
            <Box key={item.label}>
              <Typography sx={{ fontSize: '0.625rem', opacity: 0.72, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {item.label}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                ₹ {formatCurrency(item.value)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Stack
          direction="row" spacing={1}
          sx={{ alignItems: 'center', mt: 1.25, px: 1, py: 0.75, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <Avatar sx={{ width: 26, height: 26, fontSize: '0.625rem', backgroundColor: BRAND.lime, color: BRAND.greenDeep }}>
            {initialsOf(employee.employee_name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.35 }}>{employee.employee_name}</Typography>
            <Typography noWrap sx={{ fontSize: '0.6875rem', opacity: 0.72, lineHeight: 1.35 }}>
              {employee.employee_id}{employee.designation ? ` · ${employee.designation}` : ''}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

function PreviewPlaceholder({ hasMonth, hasEmployee }) {
  const steps = [
    { label: 'Select the pay period', done: hasMonth },
    { label: 'Choose an employee', done: hasEmployee },
    { label: 'Review and download the PDF', done: false },
  ];

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, px: 2, textAlign: 'center' }}>
      <Box
        sx={{
          width: 60, height: 60, mx: 'auto', mb: 1.5, borderRadius: '50%', display: 'grid', placeItems: 'center',
          backgroundColor: '#fff', border: `1px solid ${BRAND.line}`, boxShadow: 2,
        }}
      >
        <BrandMark size={36} />
      </Box>
      <Typography variant="h6">Your payslip preview appears here</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, maxWidth: 380, mx: 'auto', fontSize: '0.78125rem' }}>
        It renders exactly as the downloaded PDF will print.
      </Typography>
      <Stack spacing={0.75} sx={{ mt: 2, mx: 'auto', maxWidth: 260, textAlign: 'left' }}>
        {steps.map((step, idx) => (
          <Stack
            key={step.label}
            direction="row" spacing={1}
            sx={{
              alignItems: 'center', px: 1.25, py: 0.75, borderRadius: '8px',
              backgroundColor: '#fff', border: `1px solid ${step.done ? BRAND.greenSoft : BRAND.line}`,
            }}
          >
            <StepDot number={idx + 1} done={step.done} />
            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem', color: step.done ? BRAND.greenDark : 'text.secondary' }}>
              {step.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

function PreviewSkeleton() {
  return (
    <Paper sx={{ maxWidth: 820, mx: 'auto', p: 2, borderRadius: 0, boxShadow: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <Skeleton variant="circular" width={44} height={44} />
        <Box sx={{ width: '45%' }}>
          <Skeleton height={24} />
          <Skeleton width="80%" />
        </Box>
      </Stack>
      {Array.from({ length: 6 }, (_, idx) => <Skeleton key={idx} height={26} />)}
      <Skeleton variant="rectangular" height={160} sx={{ mt: 1.5 }} />
    </Paper>
  );
}

export default function PayslipGeneratorPage() {
  const [months, setMonths] = useState([]);
  const [monthsLoaded, setMonthsLoaded] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState('');

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const notify = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const selectedMonth = months.find((m) => `${m.month}-${m.year}` === selectedMonthKey);
  const selectedEmployee = employees.find((emp) => emp.employee_id === selectedEmployeeId) || null;
  const employeeIndex = employees.findIndex((emp) => emp.employee_id === selectedEmployeeId);

  // Steps through the month's employees in list order; "Next" with nobody
  // selected starts from the first employee.
  const stepEmployee = (delta) => {
    const nextIndex = employeeIndex === -1 ? 0 : employeeIndex + delta;
    if (employees[nextIndex]) setSelectedEmployeeId(employees[nextIndex].employee_id);
  };

  useEffect(() => {
    fetchAvailableMonths()
      .then(setMonths)
      .catch(() => notify('Failed to load available months', 'error'))
      .finally(() => setMonthsLoaded(true));
  }, []);

  useEffect(() => {
    setSelectedEmployeeId('');
    setPreview(null);
    if (!selectedMonthKey) {
      setEmployees([]);
      return;
    }
    const [month, year] = selectedMonthKey.split('-').map(Number);
    setLoadingEmployees(true);
    fetchEmployeesForMonth(month, year)
      .then(setEmployees)
      .catch(() => notify('Failed to load employees for the selected month', 'error'))
      .finally(() => setLoadingEmployees(false));
  }, [selectedMonthKey]);

  useEffect(() => {
    if (!selectedMonthKey || !selectedEmployeeId) {
      setPreview(null);
      return;
    }
    const [month, year] = selectedMonthKey.split('-').map(Number);
    setLoadingPreview(true);
    fetchPayslipPreview(selectedEmployeeId, month, year)
      .then(setPreview)
      .catch((err) => {
        setPreview(null);
        notify(err.response?.data?.message || 'Failed to load payslip data', 'error');
      })
      .finally(() => setLoadingPreview(false));
  }, [selectedMonthKey, selectedEmployeeId]);

  const handleGenerate = async () => {
    if (!selectedMonthKey || !selectedEmployeeId) return;
    const [month, year] = selectedMonthKey.split('-').map(Number);
    setGenerating(true);
    try {
      const { blob, filename } = await generatePayslipPdf(selectedEmployeeId, month, year);
      downloadBlob(blob, filename);
      notify('Payslip generated successfully');
    } catch (err) {
      notify(await getErrorMessage(err, 'Failed to generate payslip PDF'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!selectedMonthKey || employees.length === 0) return;
    const [month, year] = selectedMonthKey.split('-').map(Number);
    setGeneratingAll(true);
    try {
      const { blob, filename } = await generateAllPayslips(month, year);
      downloadBlob(blob, filename);
      notify(`${employees.length} payslips downloaded as ${filename}`);
    } catch (err) {
      notify(await getErrorMessage(err, 'Failed to generate the payslips'), 'error');
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Payslip Generator"
        subtitle="Pick a pay period and an employee, check the preview, then download the PDF."
      />

      <Box sx={{ containerType: 'inline-size', containerName: 'payslip' }}>
        <Box
          sx={{
            display: 'grid', gap: { xs: 1.5, sm: 2 }, gridTemplateColumns: 'minmax(0, 1fr)', alignItems: 'start',
            [WIDE]: { gridTemplateColumns: '280px minmax(0, 1fr)' },
          }}
        >
          <Box
            sx={{
              display: 'grid', gap: 1.5, gridTemplateColumns: 'minmax(0, 1fr)',
              [MEDIUM]: { gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)' },
              [WIDE]: { gridTemplateColumns: 'minmax(0, 1fr)', position: 'sticky', top: 68 },
            }}
          >
            <Paper variant="outlined" sx={{ p: 1.5, boxShadow: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 1.25 }}>Payslip details</Typography>

              {monthsLoaded && months.length === 0 && (
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  No salary data yet.{' '}
                  <Link component={RouterLink} to="/salary-data" sx={{ fontWeight: 600, color: 'inherit' }}>
                    Import a workbook
                  </Link>{' '}
                  to start.
                </Alert>
              )}

              <StepLabel number={1} label="Pay period" done={Boolean(selectedMonthKey)} />
              <TextField
                select fullWidth size="small" value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                slotProps={{
                  htmlInput: { 'aria-label': 'Pay period' },
                  select: {
                    displayEmpty: true,
                    renderValue: (value) => (value
                      ? months.find((m) => `${m.month}-${m.year}` === value)?.label
                      : <Box component="span" sx={{ color: BRAND.inkMuted }}>Select month</Box>),
                  },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start"><CalendarMonthOutlinedIcon /></InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 1.5 }}
              >
                {months.length === 0 && <MenuItem value="" disabled>No salary data imported yet</MenuItem>}
                {months.map((m) => (
                  <MenuItem key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>{m.label}</MenuItem>
                ))}
              </TextField>

              <StepLabel number={2} label="Employee" done={Boolean(selectedEmployeeId)} />
              <Autocomplete
                size="small"
                options={employees}
                value={selectedEmployee}
                onChange={(e, option) => setSelectedEmployeeId(option ? option.employee_id : '')}
                getOptionLabel={(option) => `${option.employee_name} (${option.employee_id})`}
                isOptionEqualToValue={(option, value) => option.employee_id === value.employee_id}
                disabled={!selectedMonthKey}
                loading={loadingEmployees}
                noOptionsText={selectedMonthKey ? 'No employees for this month' : 'Select a pay period first'}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box component="li" key={key} {...optionProps} sx={{ gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.625rem', backgroundColor: BRAND.greenSoft, color: BRAND.greenDark }}>
                        {initialsOf(option.employee_name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.35 }}>{option.employee_name}</Typography>
                        <Typography noWrap sx={{ fontSize: '0.6875rem', color: 'text.secondary', lineHeight: 1.35 }}>
                          {option.employee_id}{option.designation ? ` · ${option.designation}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={selectedMonthKey ? 'Search by name or ID' : 'Select a pay period first'}
                    slotProps={{
                      ...params.slotProps,
                      htmlInput: { ...params.slotProps.htmlInput, 'aria-label': 'Employee' },
                      input: {
                        ...params.slotProps.input,
                        startAdornment: (
                          <InputAdornment position="start" sx={{ ml: 0.25 }}>
                            <PersonSearchOutlinedIcon />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}
              />

              {employees.length > 0 && (
                <Stack direction="row" sx={{ alignItems: 'center', mt: 1, mx: -0.5 }}>
                  <Button
                    size="small"
                    startIcon={<ChevronLeftRoundedIcon />}
                    onClick={() => stepEmployee(-1)}
                    disabled={employeeIndex <= 0}
                    sx={{ color: 'text.secondary' }}
                  >
                    Previous
                  </Button>
                  <Typography variant="caption" sx={{ flexGrow: 1, textAlign: 'center', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                    {employeeIndex === -1
                      ? `${employees.length} ${employees.length === 1 ? 'employee' : 'employees'}`
                      : `${employeeIndex + 1} of ${employees.length}`}
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ChevronRightRoundedIcon />}
                    onClick={() => stepEmployee(1)}
                    disabled={employeeIndex === employees.length - 1}
                    sx={{ color: 'text.secondary' }}
                  >
                    Next
                  </Button>
                </Stack>
              )}
            </Paper>

            <Stack spacing={1}>
              <NetPayCard preview={loadingPreview ? null : preview} periodLabel={selectedMonth?.label} />
              <Button
                variant="contained" size="large" fullWidth
                startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <FileDownloadOutlinedIcon />}
                disabled={!preview || generating || loadingPreview}
                onClick={handleGenerate}
              >
                {generating ? 'Generating PDF…' : 'Download payslip PDF'}
              </Button>
              <Button
                variant="outlined" fullWidth
                startIcon={generatingAll ? <CircularProgress size={14} color="inherit" /> : <FolderZipOutlinedIcon />}
                disabled={!selectedMonthKey || employees.length === 0 || generatingAll}
                onClick={handleGenerateAll}
              >
                {generatingAll
                  ? `Generating ${employees.length} payslips…`
                  : `Download all${employees.length ? ` ${employees.length}` : ''} as ZIP`}
              </Button>
            </Stack>
          </Box>

          <Paper variant="outlined" sx={{ overflow: 'hidden', boxShadow: 1, minWidth: 0 }}>
            <Stack
              direction="row" spacing={1}
              sx={{ alignItems: 'center', px: 1.5, py: 1, borderBottom: `1px solid ${BRAND.line}` }}
            >
              <Box
                sx={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: preview ? BRAND.lime : '#C9D0C6',
                  boxShadow: preview ? `0 0 0 3px ${BRAND.limeSoft}` : 'none',
                }}
              />
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>Live preview</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>
                Matches the downloaded PDF
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              {preview && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: BRAND.green }}>
                  <VerifiedOutlinedIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Ready</Typography>
                </Stack>
              )}
              <Box
                component="span"
                sx={{
                  px: 0.75, borderRadius: '5px', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.8,
                  color: BRAND.inkSoft, border: `1px solid ${BRAND.line}`, whiteSpace: 'nowrap',
                }}
              >
                A4 · PDF
              </Box>
            </Stack>

            <Box
              sx={{
                p: { xs: 1, sm: 1.5, md: 2 },
                minHeight: { md: 460 },
                backgroundColor: BRAND.canvas,
                backgroundImage: `radial-gradient(${BRAND.line} 1px, transparent 1px)`,
                backgroundSize: '16px 16px',
              }}
            >
              {loadingPreview && <PreviewSkeleton />}
              {!loadingPreview && !preview && (
                <PreviewPlaceholder hasMonth={Boolean(selectedMonthKey)} hasEmployee={Boolean(selectedEmployeeId)} />
              )}
              {!loadingPreview && preview && <PayslipPreview data={preview} />}
            </Box>
          </Paper>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
