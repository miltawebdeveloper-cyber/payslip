import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, TextField, MenuItem, Button, IconButton, Snackbar, Alert, Tooltip,
  InputAdornment, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PageHeader from '../components/PageHeader.jsx';
import SalaryDataTable from '../components/SalaryDataTable.jsx';
import SalaryRowDialog from '../components/SalaryRowDialog.jsx';
import ImportExcelDialog from '../components/ImportExcelDialog.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ColumnVisibilityMenu from '../components/ColumnVisibilityMenu.jsx';
import SelectionBar from '../components/SelectionBar.jsx';
import { HIDEABLE_COLUMNS } from '../components/salaryColumns.js';
import { MONTH_NAMES, MONTH_OPTIONS, PAYROLL_TYPE_OPTIONS } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';
import {
  fetchSalaryData, createSalaryRow, updateSalaryRow, deleteSalaryRow,
  fetchSelectionSummary, bulkDeleteSalaryRows,
} from '../api/salaryDataApi.js';
import { fetchGoogleStatus, syncGoogleSheet } from '../api/googleApi.js';
import { BRAND } from '../theme.js';

const SEARCH_DEBOUNCE_MS = 300;
const HIDDEN_COLUMNS_KEY = 'payslip.hiddenColumns';

function readHiddenColumns() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(HIDDEN_COLUMNS_KEY) || '[]');
    const known = new Set(HIDEABLE_COLUMNS.map((col) => col.key));
    return Array.isArray(saved) ? saved.filter((key) => known.has(key)) : [];
  } catch {
    return [];
  }
}

export default function SalaryDataPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [payrollType, setPayrollType] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState(readHiddenColumns);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Selection is either explicit row ids (which survive paging) or "every
  // record matching the current filters", which also reaches other pages.
  const [selectedIds, setSelectedIds] = useState([]);
  const [allMatching, setAllMatching] = useState(false);
  const [selectionSummary, setSelectionSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [googleStatus, setGoogleStatus] = useState(null);
  const [syncingSheet, setSyncingSheet] = useState(false);

  const notify = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const loadGoogleStatus = useCallback(async () => {
    try {
      const status = await fetchGoogleStatus();
      setGoogleStatus(status);
    } catch {
      // Google integration optional / pending config
    }
  }, []);

  const handleSyncGoogleSheet = async () => {
    setSyncingSheet(true);
    try {
      const res = await syncGoogleSheet();
      notify(res.message || 'Google Sheet synchronized successfully');
      loadGoogleStatus();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to sync Google Sheet', 'error');
    } finally {
      setSyncingSheet(false);
    }
  };

  useEffect(() => {
    loadGoogleStatus();
  }, [loadGoogleStatus]);

  const hasFilters = Boolean(search.trim() || month || year || payrollType);

  // Undefined values are dropped from the request, so only active filters are sent.
  const filters = useMemo(() => ({
    search: search.trim() || undefined,
    month: month || undefined,
    year: year || undefined,
    payrollType: payrollType || undefined,
  }), [search, month, year, payrollType]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasSelection = allMatching || selectedIds.length > 0;
  const selection = useMemo(
    () => (allMatching ? { allMatching: true, filters } : { ids: selectedIds }),
    [allMatching, filters, selectedIds],
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSalaryData({ page, limit, ...filters });
      setRows(data.data);
      setTotal(data.total);
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to load salary data', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clearSelection = () => {
    setSelectedIds([]);
    setAllMatching(false);
  };

  // A new search or filter means a different set of rows, so start afresh.
  useEffect(() => {
    setPage(1);
    clearSelection();
  }, [filters]);

  // Totals for the ticked rows come from the backend so they use the same pay
  // calculation as payslips. Re-fetched when rows reload (e.g. after an edit).
  useEffect(() => {
    if (!hasSelection) {
      setSelectionSummary(null);
      return undefined;
    }
    let cancelled = false;
    setSummaryLoading(true);
    const timer = setTimeout(() => {
      fetchSelectionSummary(selection)
        .then((summary) => { if (!cancelled) setSelectionSummary(summary); })
        .catch(() => { if (!cancelled) setSelectionSummary(null); })
        .finally(() => { if (!cancelled) setSummaryLoading(false); });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasSelection, selection, rows]);

  const handleToggleRow = (id) => {
    if (allMatching) {
      // Unticking one row out of "all matching" narrows back to this page's rows.
      setAllMatching(false);
      setSelectedIds(rows.map((row) => row.id).filter((rowId) => rowId !== id));
      return;
    }
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]));
  };

  const handleTogglePage = (checked) => {
    const pageIds = rows.map((row) => row.id);
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    } else if (allMatching) {
      clearSelection();
    } else {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  // After deleting, step back a page if the current one would now be empty.
  const reloadAfterRemoval = (removed) => {
    const lastPage = Math.max(1, Math.ceil((total - removed) / limit));
    if (page > lastPage) setPage(lastPage);
    else loadData();
  };

  const handleHiddenColumnsChange = (next) => {
    setHiddenColumns(next);
    try {
      window.localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this session.
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setMonth('');
    setYear('');
    setPayrollType('');
  };

  const handleAdd = () => {
    setEditingRow(null);
    setDialogOpen(true);
  };

  const handleEdit = (row) => {
    setEditingRow(row);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editingRow) {
        await updateSalaryRow(editingRow.id, payload);
        notify('Salary record updated');
      } else {
        await createSalaryRow(payload);
        notify('Salary record added');
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not save the record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCellEdit = async (row, patch) => {
    try {
      const updated = await updateSalaryRow(row.id, { ...row, ...patch });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      notify(err.response?.data?.message || 'Could not save the change', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSalaryRow(deleteTarget.id);
      notify('Salary record deleted');
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
      reloadAfterRemoval(1);
    } catch (err) {
      notify(err.response?.data?.message || 'Could not delete the record', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    try {
      const { deleted } = await bulkDeleteSalaryRows(selection);
      notify(`${deleted} salary ${deleted === 1 ? 'record' : 'records'} deleted`);
      setBulkDeleteOpen(false);
      clearSelection();
      reloadAfterRemoval(deleted);
    } catch (err) {
      notify(err.response?.data?.message || 'Could not delete the selected records', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const selectedCount = selectionSummary ? selectionSummary.count : (allMatching ? total : selectedIds.length);
  const bulkDeleteMessage = (() => {
    const records = `${selectedCount.toLocaleString('en-IN')} salary ${selectedCount === 1 ? 'record' : 'records'}`;
    const scope = allMatching && !hasFilters ? ' — every salary record in the system' : '';
    const detail = selectionSummary
      ? ` for ${selectionSummary.employees} ${selectionSummary.employees === 1 ? 'employee' : 'employees'} (net pay ₹ ${formatCurrency(selectionSummary.netPay)})`
      : '';
    return `This will permanently remove ${records}${detail}${scope}. This cannot be undone.`;
  })();

  return (
    <Box>
      <PageHeader
        title="Salary Data"
        subtitle="Import, review and edit monthly salary records. Click any cell to edit it in place."
        actions={(
          <>
            {googleStatus?.sheet?.sheetUrl && (
              <Button
                variant="outlined"
                startIcon={<OpenInNewRoundedIcon />}
                href={googleStatus.sheet.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: '#0F9D58',
                  borderColor: '#0F9D58',
                  '&:hover': { borderColor: '#0B8043', bgcolor: 'rgba(15,157,88,0.06)' },
                }}
              >
                Google Sheet
              </Button>
            )}
            <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => setImportOpen(true)}>
              Import Excel
            </Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleAdd}>
              Add Record
            </Button>
          </>
        )}
      />

      <Paper variant="outlined" sx={{ overflow: 'hidden', boxShadow: 1 }}>
        <Box
          sx={{
            display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center',
            px: { xs: 1, sm: 1.25 }, py: 1.25, borderBottom: `1px solid ${BRAND.line}`,
          }}
        >
          <TextField
            size="small"
            placeholder="Search ID, name or designation"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ flex: { xs: '1 1 100%', md: '1 1 220px' }, maxWidth: { md: 300 } }}
            slotProps={{
              htmlInput: { 'aria-label': 'Search salary records' },
              input: {
                startAdornment: (
                  <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>
                ),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setSearchInput('')}>
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <TextField
            size="small" select label="Month" value={month}
            onChange={(e) => setMonth(e.target.value)}
            sx={{ flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 128px' } }}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">All months</MenuItem>
            {MONTH_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small" label="Year" placeholder="Any" value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            sx={{ flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 80px' } }}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric' } }}
          />
          <TextField
            size="small" select label="Payroll type" value={payrollType}
            onChange={(e) => setPayrollType(e.target.value)}
            sx={{ flex: { xs: '1 1 calc(100% - 128px)', sm: '0 0 136px' } }}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">All types</MenuItem>
            {PAYROLL_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>

          {hasFilters && (
            <Button size="small" startIcon={<FilterAltOffOutlinedIcon />} onClick={clearFilters} sx={{ color: 'text.secondary' }}>
              Clear
            </Button>
          )}

          <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 'auto' }}>
            {/* Phones show cards rather than columns, so the picker only appears from sm up. */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <ColumnVisibilityMenu hidden={hiddenColumns} onChange={handleHiddenColumnsChange} />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                {total.toLocaleString('en-IN')}
              </Box>
              {' '}{total === 1 ? 'record' : 'records'}
            </Typography>
            <Tooltip title="Refresh">
              <IconButton onClick={loadData} aria-label="Refresh" sx={{ border: `1px solid ${BRAND.line}`, width: 32, height: 32 }}>
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {googleStatus?.configured && (
              <Tooltip title={syncingSheet ? 'Syncing to Google Sheet...' : 'Sync PostgreSQL to Google Sheet'}>
                <span>
                  <IconButton
                    onClick={handleSyncGoogleSheet}
                    disabled={syncingSheet}
                    aria-label="Sync with Google Sheet"
                    sx={{
                      border: `1px solid ${BRAND.line}`,
                      width: 32,
                      height: 32,
                      color: '#0F9D58',
                    }}
                  >
                    <SyncRoundedIcon
                      fontSize="small"
                      sx={{
                        animation: syncingSheet ? 'spin 1s linear infinite' : 'none',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' },
                        },
                      }}
                    />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>

        {hasSelection && (
          <SelectionBar
            count={allMatching ? total : selectedIds.length}
            summary={selectionSummary}
            loading={summaryLoading}
            allMatching={allMatching}
            canSelectAllMatching={
              !allMatching && rows.length > 0 && total > rows.length && rows.every((row) => selectedSet.has(row.id))
            }
            pageCount={rows.length}
            total={total}
            onSelectAllMatching={() => setAllMatching(true)}
            onClear={clearSelection}
            onDelete={() => setBulkDeleteOpen(true)}
          />
        )}

        <SalaryDataTable
          rows={rows}
          loading={loading}
          page={page}
          limit={limit}
          total={total}
          hasFilters={hasFilters}
          hiddenColumns={hiddenColumns}
          onClearFilters={clearFilters}
          onImport={() => setImportOpen(true)}
          onAdd={handleAdd}
          onPageChange={setPage}
          onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          onCellEdit={handleCellEdit}
          selectedIds={selectedSet}
          allMatching={allMatching}
          onToggleRow={handleToggleRow}
          onTogglePage={handleTogglePage}
        />
      </Paper>

      <SalaryRowDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        initialValues={editingRow}
        submitting={submitting}
      />

      <ImportExcelDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          loadData();
          loadGoogleStatus();
          notify('Excel imported and Google Sheet updated');
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete salary record?"
        message={deleteTarget
          ? `This will remove ${deleteTarget.employee_name}'s (${deleteTarget.employee_id}) salary record for ${MONTH_NAMES[deleteTarget.month - 1]} ${deleteTarget.year}. This cannot be undone.`
          : ''}
        confirmLabel="Delete record"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedCount.toLocaleString('en-IN')} selected ${selectedCount === 1 ? 'record' : 'records'}?`}
        message={bulkDeleteMessage}
        confirmLabel={`Delete ${selectedCount.toLocaleString('en-IN')}`}
        confirmColor="error"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteOpen(false)}
        loading={bulkDeleting}
      />

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
