import { useLayoutEffect, useRef, useState } from 'react';
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  IconButton, TablePagination, Box, CircularProgress, Typography, Tooltip, TextField, MenuItem,
  Skeleton, Button, Stack, Checkbox, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PayrollTypeChip from './PayrollTypeChip.jsx';
import { COLUMNS, COLUMN_GROUPS } from './salaryColumns.js';
import { MONTH_NAMES, MONTH_OPTIONS, PAYROLL_TYPE_OPTIONS } from '../utils/constants.js';
import { formatCurrency, formatDate, formatDays, toDateInputValue } from '../utils/format.js';
import { BRAND } from '../theme.js';

const HEAD_BG = '#F4F7F1';
const ROW_HOVER_BG = '#F7FAF4';

const STICKY_LEFT_SX = {
  position: 'sticky', left: 0, zIndex: 2,
  boxShadow: `inset -1px 0 0 ${BRAND.line}, 6px 0 12px -10px rgba(15, 46, 18, 0.35)`,
};
const STICKY_RIGHT_SX = {
  position: 'sticky', right: 0, zIndex: 2,
  boxShadow: `inset 1px 0 0 ${BRAND.line}, -6px 0 12px -10px rgba(15, 46, 18, 0.35)`,
};

// The select checkbox, Employee ID and Name stay pinned on the left. The name
// column sits after the checkbox and ID columns, so its offset tracks the ID
// column's (resizable) width through a CSS variable on the table.
const SELECT_WIDTH = 40;
const SELECTED_BG = '#EEF5EA';

const SELECT_CELL_SX = {
  position: 'sticky', left: 0, zIndex: 2, p: 0, textAlign: 'center',
};
function pinnedSx(col) {
  if (!col.sticky) return null;
  if (col.key === 'employee_id') return { position: 'sticky', left: SELECT_WIDTH, zIndex: 2 };
  return { ...STICKY_LEFT_SX, left: 'var(--pin-offset)' };
}

const ACTIONS_WIDTH = 76;
const SKELETON_ROWS = 10;

// A colour cue per heading group, drawn from the logo's shades.
const GROUP_ACCENTS = {
  employee: BRAND.inkMuted,
  details: '#C9D0C6',
  payroll: BRAND.lime,
  earnings: BRAND.green,
  deductions: BRAND.limeDark,
};

const GROUP_DIVIDER = `1px solid ${BRAND.line}`;

const GROUP_CELL_SX = {
  backgroundColor: '#ECF2E9',
  color: BRAND.inkSoft,
  fontSize: '0.6875rem',
  fontWeight: 700,
  lineHeight: 1.5,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  // The theme gives head cells 8px vertical padding; the group row is slimmer.
  '&.MuiTableCell-head': { py: 0.5 },
};

// Splits the visible columns into contiguous heading groups, and marks where
// each group after the pinned columns starts so it can get a divider line.
function buildGroups(columns) {
  const groups = [];
  const groupStarts = new Set();
  columns.forEach((col, idx) => {
    const prev = columns[idx - 1];
    if (prev && prev.group === col.group) {
      groups[groups.length - 1].span += 1;
      return;
    }
    if (prev && !prev.sticky) groupStarts.add(col.key);
    groups.push({ key: col.group, span: 1, sticky: col.sticky, firstKey: col.key });
  });
  return { groups, groupStarts };
}

function Amount({ value }) {
  const isZero = !Number(value);
  return (
    <Box component="span" sx={isZero ? { color: BRAND.inkMuted } : undefined}>
      {formatCurrency(value)}
    </Box>
  );
}

function renderCell(row, key) {
  switch (key) {
    case 'employee_id':
      return <Box component="span" sx={{ fontWeight: 600, color: BRAND.greenDark }}>{row.employee_id}</Box>;
    case 'employee_name':
      return <Box component="span" sx={{ fontWeight: 500, color: BRAND.ink }}>{row.employee_name || '-'}</Box>;
    case 'date_of_joining':
      return formatDate(row.date_of_joining);
    case 'month':
      return `${MONTH_NAMES[row.month - 1]} ${row.year}`;
    case 'month_days':
    case 'paid_days':
      return formatDays(row[key]);
    case 'payroll_type':
      return <PayrollTypeChip type={row.payroll_type} />;
    case 'basic':
    case 'hra':
    case 'conveyance_allowances':
    case 'medical_allowances':
    case 'special_allowances':
    case 'night_shift_allowances':
    case 'other_earnings':
    case 'pf_employee':
    case 'esic_employee':
    case 'other_deductions':
      return <Amount value={row[key]} />;
    default:
      return row[key] || <Box component="span" sx={{ color: BRAND.inkMuted }}>-</Box>;
  }
}

function getClientX(e) {
  return e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
}

const CELL_CLIP_SX = { overflow: 'hidden', textOverflow: 'ellipsis' };

function EmptyState({ hasFilters, onClearFilters, onImport, onAdd }) {
  return (
    <Box sx={{ py: { xs: 4, md: 6 }, px: 2, textAlign: 'center' }}>
      <Box
        sx={{
          width: 44, height: 44, mx: 'auto', mb: 1.5, borderRadius: '12px',
          display: 'grid', placeItems: 'center',
          color: BRAND.green, backgroundColor: BRAND.greenWash, border: `1px solid ${BRAND.greenSoft}`,
        }}
      >
        {hasFilters ? <SearchOffRoundedIcon fontSize="small" /> : <InboxOutlinedIcon fontSize="small" />}
      </Box>
      <Typography variant="h6">{hasFilters ? 'No matching records' : 'No salary data yet'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 380, mx: 'auto', fontSize: '0.78125rem' }}>
        {hasFilters
          ? 'Nothing matches the current search and filters. Try different terms or clear the filters.'
          : 'Import your monthly salary workbook, or add a record by hand to get started.'}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', mt: 2 }}>
        {hasFilters ? (
          <Button variant="outlined" onClick={onClearFilters}>Clear filters</Button>
        ) : (
          <>
            <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={onImport}>Import Excel</Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onAdd}>Add Record</Button>
          </>
        )}
      </Stack>
    </Box>
  );
}

function MobileCard({ row, selected, onToggle, onEdit, onDelete }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        pl: 0.75, pr: 1.5, py: 1.25, borderBottom: `1px solid ${BRAND.lineSoft}`, alignItems: 'flex-start',
        backgroundColor: selected ? SELECTED_BG : 'transparent',
      }}
    >
      <Checkbox
        size="small"
        checked={selected}
        onChange={onToggle}
        slotProps={{ input: { 'aria-label': `Select ${row.employee_name}` } }}
        sx={{ p: 0.5, mt: 0.25 }}
      />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.8125rem', minWidth: 0 }}>{row.employee_name}</Typography>
          <PayrollTypeChip type={row.payroll_type} sx={{ flexShrink: 0 }} />
        </Stack>
        <Typography noWrap variant="caption" component="div" sx={{ color: 'text.secondary' }}>
          <Box component="span" sx={{ fontWeight: 600, color: BRAND.greenDark }}>{row.employee_id}</Box>
          {row.designation ? ` · ${row.designation}` : ''}
        </Typography>
        <Typography noWrap variant="caption" component="div" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {MONTH_NAMES[row.month - 1].slice(0, 3)} {row.year}
          {' · '}{formatDays(row.paid_days)}/{formatDays(row.month_days)} days
          {' · '}Basic <Box component="span" sx={{ fontWeight: 600, color: BRAND.ink }}>{formatCurrency(row.basic)}</Box>
        </Typography>
      </Box>
      <Stack direction="row" sx={{ flexShrink: 0, mr: -0.5 }}>
        <IconButton size="small" aria-label={`Edit ${row.employee_name}`} onClick={() => onEdit(row)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label={`Delete ${row.employee_name}`} onClick={() => onDelete(row)} sx={{ '&:hover': { color: 'error.main' } }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}

export default function SalaryDataTable({
  rows, loading, page, limit, total, hasFilters, hiddenColumns = [], onClearFilters, onImport, onAdd,
  onPageChange, onLimitChange, onEdit, onDelete, onCellEdit,
  selectedIds, allMatching, onToggleRow, onTogglePage,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [widths, setWidths] = useState(() => Object.fromEntries(COLUMNS.map((c) => [c.key, c.width])));
  const colRefs = useRef({});
  const colRefCallbacks = useRef({});
  const dragRef = useRef(null);
  const tableRef = useRef(null);
  const groupRowRef = useRef(null);

  const visibleColumns = COLUMNS.filter((col) => !hiddenColumns.includes(col.key));
  const { groups, groupStarts } = buildGroups(visibleColumns);

  const isSelected = (row) => allMatching || selectedIds.has(row.id);
  const selectedOnPage = rows.filter(isSelected).length;
  const allOnPage = rows.length > 0 && selectedOnPage === rows.length;
  const someOnPage = selectedOnPage > 0 && !allOnPage;

  // The column-heading row sticks just below the group row, so it needs the
  // group row's rendered height as its `top` offset.
  useLayoutEffect(() => {
    const height = groupRowRef.current?.getBoundingClientRect().height;
    if (height) tableRef.current?.style.setProperty('--group-row-h', `${height}px`);
  });

  const [editingCell, setEditingCell] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savingCell, setSavingCell] = useState(null);
  const commitLock = useRef(false);
  // Mirrors `draft` synchronously so commitEdit reads the latest value even when a
  // MUI Select fires onChange + onClose in the same tick, before React re-renders.
  const draftRef = useRef(null);

  const updateDraft = (value) => {
    draftRef.current = value;
    setDraft(value);
  };

  const draftFor = (row, col) => {
    if (col.type === 'month') return { month: row.month, year: row.year };
    if (col.type === 'date') return toDateInputValue(row.date_of_joining);
    return row[col.key] ?? '';
  };

  const startEdit = (row, col) => {
    if (col.type === 'readonly') return;
    commitLock.current = false;
    const initial = draftFor(row, col);
    draftRef.current = initial;
    setDraft(initial);
    setEditingCell({ rowId: row.id, key: col.key });
  };

  const cancelEdit = () => {
    commitLock.current = true;
    setEditingCell(null);
  };

  const commitEdit = async (row, col) => {
    if (commitLock.current) return;
    if (!editingCell || editingCell.rowId !== row.id || editingCell.key !== col.key) return;
    commitLock.current = true;

    const value = draftRef.current;
    let patch;
    if (col.type === 'month') {
      const month = Number(value.month);
      const year = Number(value.year);
      if (!month || !year) { setEditingCell(null); return; }
      patch = { month, year };
      if (patch.month === row.month && patch.year === row.year) { setEditingCell(null); return; }
    } else if (col.type === 'number') {
      patch = { [col.key]: Number(value) || 0 };
      if (String(patch[col.key]) === String(Number(row[col.key]) || 0)) { setEditingCell(null); return; }
    } else if (col.type === 'date') {
      patch = { [col.key]: value || null };
      if ((patch[col.key] || '') === toDateInputValue(row[col.key])) { setEditingCell(null); return; }
    } else {
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (col.key === 'employee_name' && !trimmed) { setEditingCell(null); return; }
      patch = { [col.key]: trimmed };
      if ((patch[col.key] || '') === (row[col.key] || '')) { setEditingCell(null); return; }
    }

    setEditingCell(null);
    setSavingCell({ rowId: row.id, key: col.key });
    try {
      await onCellEdit?.(row, patch);
    } finally {
      setSavingCell(null);
    }
  };

  const handleEditorKeyDown = (row, col) => (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(row, col); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  const getColRef = (key) => {
    if (!colRefCallbacks.current[key]) {
      colRefCallbacks.current[key] = (el) => { colRefs.current[key] = el; };
    }
    return colRefCallbacks.current[key];
  };

  const clamp = (drag, clientX) => {
    const delta = clientX - drag.startX;
    return Math.min(drag.max, Math.max(drag.min, drag.startWidth + delta));
  };

  const handleDragMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    const next = clamp(drag, getClientX(e));
    if (colRefs.current[drag.key]) colRefs.current[drag.key].style.width = `${next}px`;
    if (drag.key === 'employee_id') tableRef.current?.style.setProperty('--pin-offset', `${SELECT_WIDTH + next}px`);
  };

  const handleDragEnd = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const next = clamp(drag, getClientX(e));
    setWidths((w) => ({ ...w, [drag.key]: next }));
    dragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('touchend', handleDragEnd);
  };

  const handleDragStart = (col) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      key: col.key,
      startX: getClientX(e),
      startWidth: widths[col.key],
      min: col.minWidth,
      max: col.maxWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  };

  const renderEditor = (row, col) => {
    const onKeyDown = handleEditorKeyDown(row, col);

    if (col.type === 'select') {
      // The menu opens in a portal, so opening it fires a native blur on the
      // trigger — committing on that blur would close the editor before the
      // user can pick anything. Only `onClose` (menu actually dismissed) commits.
      return (
        <TextField
          select size="small" variant="standard" autoFocus fullWidth value={draft}
          onChange={(e) => updateDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onClick={(e) => e.stopPropagation()}
          slotProps={{ select: { open: true, onClose: () => commitEdit(row, col) } }}
        >
          {PAYROLL_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
      );
    }

    if (col.type === 'date') {
      return (
        <TextField
          type="date" size="small" variant="standard" autoFocus fullWidth value={draft}
          onChange={(e) => updateDraft(e.target.value)}
          onBlur={() => commitEdit(row, col)}
          onKeyDown={onKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    if (col.type === 'month') {
      return (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <TextField
            select size="small" variant="standard" autoFocus value={draft.month} sx={{ minWidth: 60 }}
            onChange={(e) => updateDraft({ ...draftRef.current, month: e.target.value })}
            onKeyDown={onKeyDown}
            slotProps={{ select: { onClose: () => commitEdit(row, col) } }}
          >
            {MONTH_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label.slice(0, 3)}</MenuItem>
            ))}
          </TextField>
          <TextField
            type="number" size="small" variant="standard" value={draft.year} sx={{ width: 56 }}
            onChange={(e) => updateDraft({ ...draftRef.current, year: e.target.value })}
            onBlur={() => commitEdit(row, col)}
            onKeyDown={onKeyDown}
          />
        </Box>
      );
    }

    return (
      <TextField
        type={col.type === 'number' ? 'number' : 'text'}
        size="small" variant="standard" autoFocus fullWidth value={draft}
        onChange={(e) => updateDraft(e.target.value)}
        onBlur={() => commitEdit(row, col)}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        slotProps={col.align === 'right' ? { htmlInput: { style: { textAlign: 'right' } } } : undefined}
      />
    );
  };

  const pagination = (
    <TablePagination
      component="div"
      count={total}
      page={page - 1}
      onPageChange={(e, newPage) => onPageChange(newPage + 1)}
      rowsPerPage={limit}
      onRowsPerPageChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
      rowsPerPageOptions={[10, 20, 50, 100]}
      labelRowsPerPage={isMobile ? 'Rows' : 'Rows per page'}
      sx={{
        borderTop: `1px solid ${BRAND.line}`,
        '& .MuiTablePagination-toolbar': { px: { xs: 1, sm: 1.5 } },
        '& .MuiTablePagination-actions': { ml: { xs: 0.5, sm: 1.5 } },
        '& .MuiTablePagination-input': { mr: { xs: 1, sm: 2.5 } },
        '& .MuiTablePagination-actions .MuiIconButton-root': { padding: '4px' },
      }}
    />
  );

  const isEmpty = !loading && rows.length === 0;
  const emptyState = (
    <EmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} onImport={onImport} onAdd={onAdd} />
  );

  if (isMobile) {
    if (isEmpty) return emptyState;
    return (
      <Box>
        {!loading && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', pl: 0.75, py: 0.25, borderBottom: `1px solid ${BRAND.lineSoft}`, backgroundColor: HEAD_BG }}>
            <Checkbox
              size="small"
              checked={allOnPage}
              indeterminate={someOnPage}
              onChange={(e) => onTogglePage(e.target.checked)}
              slotProps={{ input: { 'aria-label': 'Select all records on this page' } }}
              sx={{ p: 0.5 }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, color: BRAND.inkSoft }}>Select all on this page</Typography>
          </Stack>
        )}
        {loading
          ? Array.from({ length: 6 }, (_, idx) => (
            <Stack key={idx} direction="row" spacing={1.25} sx={{ px: 1.5, py: 1.25, borderBottom: `1px solid ${BRAND.lineSoft}` }}>
              <Skeleton variant="rounded" width={18} height={18} sx={{ m: 0.5, borderRadius: '4px' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton width="50%" />
                <Skeleton width="40%" />
                <Skeleton width="75%" />
              </Box>
            </Stack>
          ))
          : rows.map((row) => (
            <MobileCard
              key={row.id}
              row={row}
              selected={isSelected(row)}
              onToggle={() => onToggleRow(row.id)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        {pagination}
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer sx={{ maxHeight: 'max(320px, calc(100vh - 278px))', WebkitOverflowScrolling: 'touch' }}>
        <Table
          ref={tableRef}
          stickyHeader
          size="small"
          sx={{ tableLayout: 'fixed' }}
          style={{ '--pin-offset': `${SELECT_WIDTH + widths.employee_id}px` }}
        >
          <colgroup>
            <col style={{ width: SELECT_WIDTH }} />
            {visibleColumns.map((col) => (
              <col key={col.key} ref={getColRef(col.key)} style={{ width: widths[col.key] }} />
            ))}
            <col style={{ width: ACTIONS_WIDTH }} />
          </colgroup>
          <TableHead>
            <TableRow ref={groupRowRef}>
              <TableCell rowSpan={2} sx={{ ...SELECT_CELL_SX, zIndex: 6, backgroundColor: HEAD_BG, verticalAlign: 'middle' }}>
                <Checkbox
                  size="small"
                  checked={allOnPage}
                  indeterminate={someOnPage}
                  disabled={rows.length === 0}
                  onChange={(e) => onTogglePage(e.target.checked)}
                  slotProps={{ input: { 'aria-label': 'Select all records on this page' } }}
                  sx={{ p: 0.5 }}
                />
              </TableCell>
              {groups.map((group) => {
                const accent = `inset 0 2px 0 ${GROUP_ACCENTS[group.key]}`;
                return (
                  <TableCell
                    key={group.firstKey}
                    colSpan={group.span}
                    sx={{
                      ...GROUP_CELL_SX,
                      boxShadow: accent,
                      ...(groupStarts.has(group.firstKey) ? { borderLeft: GROUP_DIVIDER } : null),
                      ...(group.sticky ? { left: SELECT_WIDTH, zIndex: 5, boxShadow: `${accent}, ${STICKY_LEFT_SX.boxShadow}` } : null),
                    }}
                  >
                    {COLUMN_GROUPS.find((g) => g.key === group.key)?.label}
                  </TableCell>
                );
              })}
              <TableCell
                rowSpan={2}
                align="center"
                sx={{ ...STICKY_RIGHT_SX, zIndex: 5, backgroundColor: HEAD_BG, verticalAlign: 'middle' }}
              >
                Actions
              </TableCell>
            </TableRow>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align || 'left'}
                  sx={{
                    // Sticky (from stickyHeader) also anchors the absolutely
                    // positioned resize handle, so no `position: relative` here.
                    top: 'var(--group-row-h, 26px)',
                    ...CELL_CLIP_SX,
                    ...(groupStarts.has(col.key) ? { borderLeft: GROUP_DIVIDER } : null),
                    ...(col.sticky ? { ...pinnedSx(col), zIndex: 4, backgroundColor: HEAD_BG } : null),
                    '&:hover .col-resizer::after': { backgroundColor: '#C7D0C4' },
                  }}
                >
                  {col.label}
                  <Box
                    className="col-resizer"
                    onMouseDown={handleDragStart(col)}
                    onTouchStart={handleDragStart(col)}
                    sx={{
                      position: 'absolute', top: 0, right: -4, height: '100%', width: 9,
                      cursor: 'col-resize', zIndex: 3, touchAction: 'none',
                      '&::after': {
                        content: '""', position: 'absolute', top: '28%', bottom: '28%', left: 4, width: '1px',
                        backgroundColor: 'transparent', transition: 'background-color .15s ease',
                      },
                      '&:hover::after, &:active::after': { top: 0, bottom: 0, width: '2px', left: 3.5, backgroundColor: BRAND.green },
                    }}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && Array.from({ length: SKELETON_ROWS }, (_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                <TableCell sx={{ ...SELECT_CELL_SX, backgroundColor: '#fff' }} />
                {visibleColumns.map((col) => (
                  <TableCell
                    key={col.key}
                    sx={{
                      ...(groupStarts.has(col.key) ? { borderLeft: GROUP_DIVIDER } : null),
                      ...(col.sticky ? { ...pinnedSx(col), backgroundColor: '#fff' } : null),
                    }}
                  >
                    <Skeleton width={col.align === 'right' ? '60%' : '75%'} sx={col.align === 'right' ? { ml: 'auto' } : undefined} />
                  </TableCell>
                ))}
                <TableCell sx={{ ...STICKY_RIGHT_SX, backgroundColor: '#fff' }}>
                  <Skeleton width="70%" sx={{ mx: 'auto' }} />
                </TableCell>
              </TableRow>
            ))}
            {!loading && rows.map((row) => {
              const selected = isSelected(row);
              return (
              <TableRow
                key={row.id}
                aria-selected={selected}
                sx={{
                  ...(selected ? { '& > td': { backgroundColor: SELECTED_BG } } : null),
                  '&:hover > td': { backgroundColor: selected ? SELECTED_BG : ROW_HOVER_BG },
                  '&:last-of-type > td': { borderBottom: 0 },
                }}
              >
                <TableCell sx={{ ...SELECT_CELL_SX, backgroundColor: '#fff' }}>
                  <Checkbox
                    size="small"
                    checked={selected}
                    onChange={() => onToggleRow(row.id)}
                    slotProps={{ input: { 'aria-label': `Select ${row.employee_name} ${MONTH_NAMES[row.month - 1]} ${row.year}` } }}
                    sx={{ p: 0.5 }}
                  />
                </TableCell>
                {visibleColumns.map((col) => {
                  const isEditingThis = editingCell?.rowId === row.id && editingCell?.key === col.key;
                  const isSavingThis = savingCell?.rowId === row.id && savingCell?.key === col.key;
                  const editable = col.type !== 'readonly';
                  return (
                    <TableCell
                      key={col.key}
                      align={col.align || 'left'}
                      onClick={() => editable && !isEditingThis && startEdit(row, col)}
                      sx={{
                        ...CELL_CLIP_SX,
                        transition: 'box-shadow .12s ease',
                        ...(groupStarts.has(col.key) ? { borderLeft: GROUP_DIVIDER } : null),
                        ...(col.sticky ? { ...pinnedSx(col), backgroundColor: '#fff' } : null),
                        ...(editable ? {
                          cursor: 'text',
                          '&:hover': { boxShadow: `inset 0 0 0 1px ${BRAND.limeLight}` },
                        } : null),
                        ...(isEditingThis ? { py: 0.25, boxShadow: `inset 0 0 0 2px ${BRAND.green} !important` } : null),
                      }}
                    >
                      {isEditingThis ? renderEditor(row, col) : (
                        <Box
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 0.75,
                            justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
                            ...CELL_CLIP_SX,
                          }}
                        >
                          {isSavingThis && <CircularProgress size={12} />}
                          {renderCell(row, col.key)}
                        </Box>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell align="center" sx={{ ...STICKY_RIGHT_SX, backgroundColor: '#fff', py: 0.25 }}>
                  <Tooltip title="Edit record">
                    <IconButton size="small" onClick={() => onEdit(row)} aria-label={`Edit ${row.employee_name}`} sx={{ '&:hover': { color: 'primary.main' } }}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete record">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(row)}
                      aria-label={`Delete ${row.employee_name}`}
                      sx={{ '&:hover': { color: 'error.main', backgroundColor: 'rgba(180, 35, 24, 0.06)' } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Rendered outside the scrolling table so it stays centred in view while
          the column headings above remain visible. */}
      {isEmpty ? emptyState : pagination}
    </Box>
  );
}
