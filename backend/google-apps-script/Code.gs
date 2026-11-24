/**
 * Google Apps Script Web App for Payslip Generator
 *
 * The "Salary Records" sheet is the app's only data store: the backend
 * lists, adds, edits and deletes salary records through this script, and
 * saves payslip PDFs to Drive through it. There is no database.
 *
 * Deploy (first time):
 * 1. Go to https://script.google.com/ and click "New project".
 * 2. Replace all code in the editor with this file and save.
 * 3. Deploy > New deployment > gear icon > "Web app".
 * 4. Execute as: "Me". Who has access: "Anyone".
 * 5. Deploy, authorize access, and copy the "Web app URL" into backend/.env:
 *    GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *
 * After changing this file: Deploy > Manage deployments > edit (pencil) >
 * Version: "New version" > Deploy. The URL stays the same.
 *
 * Recommended: anyone with the URL can call it, so protect the salary data
 * with a key. Project Settings > Script Properties > add API_KEY = <a long
 * random value>, and set GOOGLE_APPS_SCRIPT_KEY to the same value in the
 * backend's environment.
 *
 * Sheet layout: row 1 holds the headers below, and every row under it is
 * one employee's salary for one month (Employee ID + Month + Year is
 * unique). Columns are found by their header, not their position, so they
 * can be in any order and your own columns can sit between them; header
 * case and punctuation don't matter. The app owns these columns: don't
 * rename them or put formulas in them. Any other column is left alone.
 * A column marked `added` that the sheet doesn't have yet is inserted,
 * empty, next to the column listed before it the next time the app opens
 * the sheet.
 */

const SHEET_NAME = 'Salary Records';
const DEFAULT_SHEET_TITLE = 'Payslip Generator - Salary Records';
const MONEY_FORMAT = '#,##0.00';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PAYROLL_TYPE_LABELS = {
  PF_ESI: 'PF + ESI',
  PF_ONLY: 'PF Only',
  NO_DEDUCTION: 'No Deduction'
};

// text: stored as plain text so values like "000123" or "2025-04-01" are
// kept exactly as written. format: number format for numeric columns.
// aliases: other headers the column is recognised by. added: the column
// came after the first release, so an older sheet may not have it yet.
const COLUMNS = [
  { header: 'Employee ID', field: 'employee_id', text: true },
  { header: 'Employee Name', field: 'employee_name', text: true },
  { header: 'Designation', field: 'designation', text: true },
  { header: 'Date of Joining', field: 'date_of_joining', text: true },
  { header: 'Bank Name', field: 'bank_name', text: true },
  { header: 'Bank Account Number', field: 'bank_account_number', text: true },
  { header: 'PAN', field: 'pan', text: true },
  { header: 'ESIC No', field: 'esic_no', text: true },
  { header: 'UAN No', field: 'uan_no', text: true },
  { header: 'Month', field: 'month', text: true },
  { header: 'Year', field: 'year' },
  { header: 'Month Days', field: 'month_days' },
  { header: 'Paid Days', field: 'paid_days' },
  { header: 'Payroll Type', field: 'payroll_type', text: true },
  { header: 'Basic', field: 'basic', format: MONEY_FORMAT },
  { header: 'HRA', field: 'hra', format: MONEY_FORMAT },
  { header: 'Conveyance Allowances', field: 'conveyance_allowances', format: MONEY_FORMAT },
  { header: 'Medical Allowances', field: 'medical_allowances', format: MONEY_FORMAT },
  { header: 'Special Allowances', field: 'special_allowances', format: MONEY_FORMAT },
  { header: 'Night Shift Allowances', field: 'night_shift_allowances', format: MONEY_FORMAT },
  { header: 'Overtime', field: 'overtime', format: MONEY_FORMAT, added: true, aliases: ['Over Time', 'OT', 'O.T.'] },
  { header: 'Other Allowances', field: 'other_allowances', format: MONEY_FORMAT, added: true, aliases: ['Other Allowance'] },
  { header: 'Other Earnings', field: 'other_earnings', format: MONEY_FORMAT },
  { header: 'PF Employee', field: 'pf_employee', format: MONEY_FORMAT },
  { header: 'ESIC Employee', field: 'esic_employee', format: MONEY_FORMAT },
  { header: 'Advance', field: 'advance', format: MONEY_FORMAT, added: true, aliases: ['Advances', 'Salary Advance', 'Advance Deduction', 'Advance Recovery'] },
  { header: 'Other Deductions', field: 'other_deductions', format: MONEY_FORMAT },
  { header: 'Gross Earnings', field: 'gross_earnings', format: MONEY_FORMAT },
  { header: 'Gross Deductions', field: 'gross_deductions', format: MONEY_FORMAT },
  { header: 'Net Pay', field: 'net_pay', format: MONEY_FORMAT },
  { header: 'Last Updated', field: 'last_updated', text: true }
];

const HEADERS = COLUMNS.map(function (c) { return c.header; });
// Sent with every record list and save, so the backend can tell when this
// deployment is older than the fields it needs stored.
const FIELDS = COLUMNS.map(function (c) { return c.field; });
const COL = {};
COLUMNS.forEach(function (c, i) { COL[c.field] = i; });

// Employee details are shared by all of an employee's months: saving any
// row refreshes these columns on that employee's other rows too.
const EMPLOYEE_DETAIL_FIELDS = [
  'employee_name', 'designation', 'date_of_joining', 'bank_name',
  'bank_account_number', 'pan', 'esic_no', 'uan_no'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    // Optional shared key: set API_KEY in Project Settings > Script Properties
    // and the same value as GOOGLE_APPS_SCRIPT_KEY in the backend's env.
    const requiredKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (requiredKey && data.apiKey !== requiredKey) {
      return jsonOutput({ success: false, error: 'Unauthorized: API key missing or wrong' });
    }
    const handlers = {
      getStatus: handleGetStatus,
      listRecords: handleListRecords,
      upsertRecords: handleUpsertRecords,
      deleteRecords: handleDeleteRecords,
      uploadPdf: handleUploadPdf
    };
    const handler = handlers[data.action];
    const result = handler
      ? handler(data)
      : { success: false, error: 'Unknown action: ' + data.action };
    return jsonOutput(result);
  } catch (err) {
    return jsonOutput({ success: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return jsonOutput({ status: 'ok', name: 'Payslip Generator Google Apps Script API' });
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------- Drive

function getFolder(folderId) {
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      // fall through to the folder looked up by name
    }
  }
  const folders = DriveApp.getFoldersByName('Payslip Generator');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('Payslip Generator');
}

function getOrCreateSubfolder(parentFolder, name) {
  const folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(name);
}

function getOrCreateSpreadsheet(folder, sheetTitle) {
  const files = folder.getFilesByName(sheetTitle);
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }
  const ss = SpreadsheetApp.create(sheetTitle);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  ss.getSheets()[0].setName(SHEET_NAME);
  return ss;
}

// ---------------------------------------------------------------- Sheet

function openRecordsSheet(data) {
  const folder = getFolder(data.folderId);
  const ss = getOrCreateSpreadsheet(folder, data.sheetTitle || DEFAULT_SHEET_TITLE);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const cols = mapColumns(sheet);
  return { ss: ss, sheet: sheet, tz: ss.getSpreadsheetTimeZone(), cols: cols };
}

/** getRange can't reach past the sheet's size, so grow it first (a new sheet has 26 columns). */
function ensureSize(sheet, rows, cols) {
  if (sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < cols) sheet.insertColumnsAfter(sheet.getMaxColumns(), cols - sheet.getMaxColumns());
}

/**
 * Finds every app column in row 1 by its header, and returns, for each
 * entry of COLUMNS, the 1-based sheet column it is in. A blank sheet gets
 * the header row. A missing `added` column is inserted next to the column
 * listed before it in COLUMNS; its cells start empty, which the app reads
 * as 0. Throws, before touching row 1 or the data, if any other column is
 * missing or a header appears twice.
 */
function mapColumns(sheet) {
  ensureSize(sheet, 1, HEADERS.length);
  if (sheet.getLastRow() === 0) {
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    headerRange.setBackground('#1F3873');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    return COLUMNS.map(function (c, i) { return i + 1; });
  }

  let cols = findColumns(sheet);
  const missing = COLUMNS.filter(function (c, i) { return cols[i] === 0 && !c.added; });
  if (missing.length > 0) {
    throw new Error(
      'Sheet "' + sheet.getName() + '" has no column headed '
      + missing.map(function (c) { return '"' + c.header + '"'; }).join(', ')
      + ' in row 1. Add it back (columns can be in any order).'
    );
  }

  COLUMNS.forEach(function (col, i) {
    if (cols[i] !== 0) return;
    const after = cols[i - 1];
    sheet.insertColumnAfter(after);
    sheet.getRange(1, after).copyTo(sheet.getRange(1, after + 1), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    sheet.getRange(1, after + 1).setValue(col.header);
    cols = findColumns(sheet);
  });
  return cols;
}

/** Each COLUMNS entry's 1-based sheet column, from row 1; 0 where it's missing. */
function findColumns(sheet) {
  const width = Math.max(sheet.getLastColumn(), 1);
  const header = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(normHeader);
  return COLUMNS.map(function (col) {
    const names = [col.header].concat(col.aliases || []).map(normHeader);
    const hits = [];
    header.forEach(function (h, j) { if (names.indexOf(h) !== -1) hits.push(j + 1); });
    if (hits.length > 1) {
      throw new Error(
        'Sheet "' + sheet.getName() + '" has more than one "' + col.header + '" column (columns '
        + hits.map(columnLetter).join(', ') + ' of row 1). Keep one of them.'
      );
    }
    return hits.length ? hits[0] : 0;
  });
}

/** "Other  allowances", "OTHER-ALLOWANCES" and "Other Allowances" all match. */
function normHeader(value) {
  return String(value === null || value === undefined ? '' : value)
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function columnLetter(n) {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function cellToText(value, tz) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  return String(value);
}

/**
 * All data rows (row 2 down), each as an array in COLUMNS order whatever
 * order the sheet has them in. Blank rows are kept so index i is always
 * sheet row i + 2. Text columns come back as strings.
 */
function readRows(ctx) {
  const lastRow = ctx.sheet.getLastRow();
  if (lastRow < 2) return [];
  const width = Math.max.apply(null, ctx.cols);
  const values = ctx.sheet.getRange(2, 1, lastRow - 1, width).getValues();
  return values.map(function (sheetRow) {
    return COLUMNS.map(function (col, i) {
      const value = sheetRow[ctx.cols[i] - 1];
      if (i === COL.month) {
        const m = parseMonth(value);
        return m ? MONTH_NAMES[m - 1] : cellToText(value, ctx.tz);
      }
      return col.text ? cellToText(value, ctx.tz) : value;
    });
  });
}

/**
 * Writes rows (in COLUMNS order) back from row 2 down, into the app's
 * columns only, so other columns keep their values and formulas. Text
 * formats go on first so "000123" stays text.
 */
function writeRows(ctx, rows) {
  if (rows.length === 0) return;
  const sheet = ctx.sheet;
  ensureSize(sheet, rows.length + 1, Math.max.apply(null, ctx.cols));
  COLUMNS.forEach(function (col, i) {
    const format = col.text ? '@' : col.format;
    if (format) sheet.getRange(2, ctx.cols[i], rows.length, 1).setNumberFormat(format);
  });
  columnRuns(ctx.cols).forEach(function (run) {
    const values = rows.map(function (row) { return run.map(function (i) { return row[i]; }); });
    sheet.getRange(2, ctx.cols[run[0]], rows.length, run.length).setValues(values);
  });
}

/**
 * COLUMNS indexes grouped into runs that sit side by side in the sheet,
 * left to right, so each run is written with one call.
 */
function columnRuns(cols) {
  const order = cols.map(function (c, i) { return i; })
    .sort(function (a, b) { return cols[a] - cols[b]; });
  const runs = [];
  order.forEach(function (i) {
    const run = runs[runs.length - 1];
    if (run && cols[run[run.length - 1]] === cols[i] - 1) run.push(i);
    else runs.push([i]);
  });
  return runs;
}

function normId(value) {
  return String(value === null || value === undefined ? '' : value).trim().toLowerCase();
}

function parseMonth(value) {
  if (value instanceof Date) return value.getMonth() + 1;
  if (typeof value === 'number') return value >= 1 && value <= 12 && value % 1 === 0 ? value : null;
  const s = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
  if (!s) return null;
  const inParens = s.match(/\((\d{1,2})\)/);
  const digits = inParens ? inParens[1] : (/^\d{1,2}$/.test(s) ? s : null);
  if (digits) {
    const n = parseInt(digits, 10);
    return n >= 1 && n <= 12 ? n : null;
  }
  const letters = s.replace(/[^a-z]/g, '');
  for (let i = 0; i < 12; i++) {
    const name = MONTH_NAMES[i].toLowerCase();
    if (letters === name || letters === name.slice(0, 3)) return i + 1;
  }
  return null;
}

function parseYear(value) {
  if (value instanceof Date) return value.getFullYear();
  const n = parseInt(value, 10);
  return n > 0 ? n : null;
}

function keyOf(employeeId, year, month) {
  const id = normId(employeeId);
  const y = parseYear(year);
  const m = parseMonth(month);
  return id && y && m ? id + '|' + y + '|' + m : '';
}

function rowKey(row) {
  return keyOf(row[COL.employee_id], row[COL.year], row[COL.month]);
}

function recordToRow(r, now) {
  return COLUMNS.map(function (col) {
    if (col.field === 'month') {
      const m = parseMonth(r.month);
      return m ? MONTH_NAMES[m - 1] : '';
    }
    if (col.field === 'payroll_type') return PAYROLL_TYPE_LABELS[r.payroll_type] || r.payroll_type || '';
    if (col.field === 'last_updated') return now;
    const value = r[col.field];
    if (value === null || value === undefined || value === '') return '';
    return col.text ? String(value) : Number(value);
  });
}

function rowToRecord(row, rowNumber) {
  const record = { _row: rowNumber };
  COLUMNS.forEach(function (col, i) { record[col.field] = row[i]; });
  record.month = parseMonth(row[COL.month]);
  record.year = parseYear(row[COL.year]);
  return record;
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------- Actions

function handleGetStatus(data) {
  const ctx = openRecordsSheet(data);
  const folder = getFolder(data.folderId);
  const payslipsFolder = getOrCreateSubfolder(folder, 'Payslips');
  return {
    configured: true,
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: folder.getUrl(),
    sheetId: ctx.ss.getId(),
    sheetUrl: ctx.ss.getUrl(),
    payslipsFolderUrl: payslipsFolder.getUrl()
  };
}

function handleListRecords(data) {
  const ctx = openRecordsSheet(data);
  const records = [];
  readRows(ctx).forEach(function (row, i) {
    if (normId(row[COL.employee_id])) records.push(rowToRecord(row, i + 2));
  });
  return { success: true, records: records, fields: FIELDS, sheetUrl: ctx.ss.getUrl() };
}

/**
 * data.items: [{ record, matchKey?, mustExist?, mustNotExist? }]
 *   record      the full record to save (month as a number, payroll_type as a code)
 *   matchKey    { employeeId, year, month } of the row to overwrite, when it
 *               differs from the record's own key (an edit that moves the month)
 *   mustExist   fail with "not_found" unless the matched row exists
 *   mustNotExist fail with "conflict" if the record's row already exists
 * Returns one { status: inserted | updated | conflict | not_found } per item.
 */
function handleUpsertRecords(data) {
  return withLock(function () {
    const ctx = openRecordsSheet(data);
    const rows = readRows(ctx);
    const index = {};
    rows.forEach(function (row, i) {
      const k = rowKey(row);
      if (k && !(k in index)) index[k] = i;
    });

    const now = Utilities.formatDate(new Date(), ctx.tz, 'yyyy-MM-dd HH:mm:ss');
    const latestDetails = {};
    const results = [];
    let changed = false;

    (data.items || []).forEach(function (item) {
      const r = item.record || {};
      const newKey = keyOf(r.employee_id, r.year, r.month);
      if (!newKey) {
        results.push({ status: 'invalid', error: 'Employee ID, Month and Year are required' });
        return;
      }
      const m = item.matchKey;
      const matchKey = m ? keyOf(m.employeeId, m.year, m.month) : newKey;
      const at = matchKey in index ? index[matchKey] : -1;

      if (item.mustExist && at < 0) { results.push({ status: 'not_found' }); return; }
      if (item.mustNotExist && at >= 0) { results.push({ status: 'conflict' }); return; }
      if (matchKey !== newKey && newKey in index) { results.push({ status: 'conflict' }); return; }

      const row = recordToRow(r, now);
      if (at >= 0) {
        rows[at] = row;
        if (matchKey !== newKey) {
          delete index[matchKey];
          index[newKey] = at;
        }
        results.push({ status: 'updated' });
      } else {
        rows.push(row);
        index[newKey] = rows.length - 1;
        results.push({ status: 'inserted' });
      }
      latestDetails[normId(r.employee_id)] = row;
      changed = true;
    });

    if (changed) {
      rows.forEach(function (row) {
        const source = latestDetails[normId(row[COL.employee_id])];
        if (!source || source === row) return;
        EMPLOYEE_DETAIL_FIELDS.forEach(function (field) {
          row[COL[field]] = source[COL[field]];
        });
      });
      writeRows(ctx, rows);
    }

    return { success: true, results: results, fields: FIELDS, sheetUrl: ctx.ss.getUrl() };
  });
}

/** data.keys: [{ employeeId, year, month }]. Deletes every row matching any key. */
function handleDeleteRecords(data) {
  return withLock(function () {
    const ctx = openRecordsSheet(data);
    const wanted = {};
    (data.keys || []).forEach(function (k) {
      const key = keyOf(k.employeeId, k.year, k.month);
      if (key) wanted[key] = true;
    });

    const sheetRows = [];
    readRows(ctx).forEach(function (row, i) {
      if (wanted[rowKey(row)]) sheetRows.push(i + 2);
    });
    if (sheetRows.length === 0) return { success: true, deleted: 0 };

    // Sheets refuses to delete every non-frozen row, so keep one spare.
    if (ctx.sheet.getMaxRows() - sheetRows.length < 2) {
      ctx.sheet.insertRowsAfter(ctx.sheet.getMaxRows(), 1);
    }
    // Bottom-up, in contiguous runs, so earlier row numbers stay valid.
    let end = sheetRows.length - 1;
    while (end >= 0) {
      let start = end;
      while (start > 0 && sheetRows[start - 1] === sheetRows[start] - 1) start--;
      ctx.sheet.deleteRows(sheetRows[start], end - start + 1);
      end = start - 1;
    }
    return { success: true, deleted: sheetRows.length };
  });
}

function handleUploadPdf(data) {
  const folder = getFolder(data.folderId);
  const payslipsFolder = getOrCreateSubfolder(folder, 'Payslips');
  const monthFolder = getOrCreateSubfolder(payslipsFolder, (data.monthName || ('Month-' + data.month)) + ' ' + data.year);

  const decodedBytes = Utilities.base64Decode(data.pdfBase64);
  const blob = Utilities.newBlob(decodedBytes, 'application/pdf', data.fileName);

  // Re-generating a payslip replaces the previous file instead of duplicating it.
  const existingFiles = monthFolder.getFilesByName(data.fileName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  const file = monthFolder.createFile(blob);
  file.setDescription('Payslip for ' + data.employeeName + ' (' + data.employeeId + ') - ' + data.monthName + ' ' + data.year);

  return {
    success: true,
    fileId: file.getId(),
    fileName: data.fileName,
    fileUrl: file.getUrl(),
    folderUrl: monthFolder.getUrl()
  };
}
