import { useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogActions, Button, Box, Typography,
  Alert, LinearProgress, Stack, IconButton, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import DialogHeader from './DialogHeader.jsx';
import { importSalaryExcel, downloadSalaryTemplate } from '../api/salaryDataApi.js';
import { downloadBlob } from '../utils/download.js';
import { BRAND, MARK_GRADIENT } from '../theme.js';

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.xlsm'];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatTile({ label, value, tone }) {
  const tones = {
    neutral: { color: BRAND.ink, bg: '#fff' },
    green: { color: BRAND.greenDark, bg: BRAND.greenWash },
    lime: { color: '#46590F', bg: BRAND.limeSoft },
    error: { color: '#8A1A12', bg: '#FDF0EF' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <Box sx={{ px: 1.25, py: 0.75, borderRadius: '8px', border: `1px solid ${BRAND.line}`, backgroundColor: t.bg }}>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: BRAND.inkSoft }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: t.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function ImportExcelDialog({ open, onClose, onImported }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const reset = () => {
    setFile(null);
    setSummary(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const acceptFile = (selected) => {
    setSummary(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const name = selected.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setFile(null);
      setError('Please choose an Excel workbook (.xlsx, .xls or .xlsm).');
      return;
    }
    setError('');
    setFile(selected);
  };

  const handleFileSelect = (event) => {
    acceptFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await importSalaryExcel(file);
      setSummary(result);
      // Valid rows are saved even when others fail, so refresh whenever any landed.
      if (result.newRecords + result.updatedRecords > 0) {
        onImported?.();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed. Please check the file and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    downloadBlob(await downloadSalaryTemplate(), 'Salary_Data_Template.xlsx');
  };

  return (
    <Dialog open={open} onClose={uploading ? undefined : handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogHeader
        icon={<UploadFileOutlinedIcon />}
        title="Import salary data"
        subtitle="Rows match on Employee ID + Month: new ones are added, existing ones updated."
        onClose={handleClose}
        disabled={uploading}
      />
      <DialogContent dividers sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
        <Stack spacing={1.25}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center', px: 1.25, py: 1, borderRadius: '8px',
              backgroundColor: BRAND.greenWash, border: `1px solid ${BRAND.greenSoft}`,
            }}
          >
            <Typography variant="caption" sx={{ flexGrow: 1, color: 'text.secondary' }}>
              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>First import?</Box>{' '}
              Start from the template so every column lines up.
            </Typography>
            <Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleDownloadTemplate} sx={{ flexShrink: 0 }}>
              Template
            </Button>
          </Stack>

          <input
            ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS.join(',')} hidden
            onChange={handleFileSelect}
          />

          {!summary && (
            <Box
              role="button"
              tabIndex={0}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              sx={{
                cursor: uploading ? 'default' : 'pointer',
                borderRadius: '12px', px: 2, py: { xs: 2.5, sm: 3 }, textAlign: 'center',
                border: `1.5px dashed ${dragging ? BRAND.green : '#C9D2C6'}`,
                backgroundColor: dragging ? BRAND.greenWash : BRAND.canvas,
                transition: 'border-color .18s ease, background-color .18s ease',
                outline: 'none',
                '&:hover, &:focus-visible': { borderColor: BRAND.green, backgroundColor: BRAND.greenWash },
              }}
            >
              <Box
                sx={{
                  width: 38, height: 38, mx: 'auto', mb: 1, borderRadius: '10px', display: 'grid', placeItems: 'center',
                  color: '#fff', background: MARK_GRADIENT, boxShadow: `0 8px 18px -8px ${BRAND.green}`,
                }}
              >
                <CloudUploadOutlinedIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle2">
                {dragging ? 'Drop the workbook to select it' : 'Drag & drop your workbook here'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                or <Box component="span" sx={{ color: BRAND.green, fontWeight: 600 }}>browse files</Box> · .xlsx, .xls, .xlsm
              </Typography>
            </Box>
          )}

          {file && (
            <Stack
              direction="row" spacing={1}
              sx={{ alignItems: 'center', px: 1.25, py: 0.75, borderRadius: '8px', border: `1px solid ${BRAND.line}`, backgroundColor: '#fff' }}
            >
              <Box
                sx={{
                  width: 28, height: 28, borderRadius: '7px', display: 'grid', placeItems: 'center', flexShrink: 0,
                  color: BRAND.green, backgroundColor: BRAND.greenSoft,
                }}
              >
                <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography noWrap variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">{formatFileSize(file.size)}</Typography>
              </Box>
              {!uploading && !summary && (
                <IconButton size="small" aria-label="Remove file" onClick={reset}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          )}

          {uploading && (
            <Box>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                Importing rows — this can take a moment for large files…
              </Typography>
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          {summary && (
            <Box>
              <Alert severity={summary.failedRecords > 0 ? 'warning' : 'success'} sx={{ mb: 1.25 }}>
                {summary.failedRecords > 0
                  ? 'Import completed with some rows skipped. Valid rows were saved.'
                  : 'Import completed. All rows were saved.'}
              </Alert>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
                <StatTile label="Total rows" value={summary.totalRows} tone="neutral" />
                <StatTile label="New" value={summary.newRecords} tone="green" />
                <StatTile label="Updated" value={summary.updatedRecords} tone="lime" />
                <StatTile label="Failed" value={summary.failedRecords} tone={summary.failedRecords ? 'error' : 'neutral'} />
              </Box>
              {summary.errors?.length > 0 && (
                <Box sx={{ mt: 1.25 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.75, fontSize: '0.75rem' }}>Rows that need attention</Typography>
                  <Box sx={{ maxHeight: 200, overflowY: 'auto', borderRadius: '8px', border: `1px solid ${BRAND.line}` }}>
                    {summary.errors.map((e, idx) => (
                      <Stack
                        key={idx}
                        direction="row"
                        spacing={1}
                        sx={{ px: 1.25, py: 0.75, alignItems: 'flex-start', '& + &': { borderTop: `1px solid ${BRAND.lineSoft}` } }}
                      >
                        <ErrorOutlineRoundedIcon sx={{ fontSize: 16, color: 'error.main', mt: 0.25 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                            Row {e.row}{e.employeeId ? ` · ${e.employeeId}` : ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{e.message}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25, gap: 1 }}>
        <Button variant="outlined" onClick={handleClose} disabled={uploading}>{summary ? 'Close' : 'Cancel'}</Button>
        <Box sx={{ flexGrow: 1 }} />
        {summary?.failedRecords > 0 && (
          <Button variant="outlined" onClick={reset}>Try another file</Button>
        )}
        {!summary && (
          <Button variant="contained" disabled={!file || uploading} onClick={handleUpload} startIcon={<UploadFileOutlinedIcon />}>
            Upload &amp; import
          </Button>
        )}
        {summary && summary.failedRecords === 0 && (
          <Button variant="contained" onClick={handleClose}>Done</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
