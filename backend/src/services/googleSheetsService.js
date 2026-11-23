const { getSheetsClient, getDriveClient, isGoogleConfigured } = require('../config/googleConfig');
const { getOrCreateMainFolder } = require('./googleDriveService');
const { calculatePayslip } = require('./payrollCalculationService');
const { MONTH_NAMES } = require('../config/constants');
const googleAppsScript = require('./googleAppsScriptService');

const SHEET_TITLE = process.env.GOOGLE_SHEET_TITLE || 'Payslip Generator - Salary Records';

const HEADERS = [
  'Employee ID',
  'Employee Name',
  'Designation',
  'Date of Joining',
  'Bank Name',
  'Bank Account Number',
  'PAN',
  'ESIC No',
  'UAN No',
  'Month',
  'Year',
  'Month Days',
  'Paid Days',
  'Payroll Type',
  'Basic',
  'HRA',
  'Conveyance Allowances',
  'Medical Allowances',
  'Special Allowances',
  'Night Shift Allowances',
  'Other Earnings',
  'PF Employee',
  'ESIC Employee',
  'Other Deductions',
  'Gross Earnings',
  'Gross Deductions',
  'Net Pay',
  'Last Updated',
];

let cachedSpreadsheetId = null;

function serializeRecordForSheet(record) {
  const calc = calculatePayslip(record);
  const monthName = typeof record.month === 'number' && record.month >= 1 && record.month <= 12
    ? `${MONTH_NAMES[record.month - 1]} (${record.month})`
    : record.month;

  return [
    record.employee?.employee_id || record.employee_id || '',
    record.employee_name || record.employee?.employee_name || '',
    record.designation || record.employee?.designation || '',
    record.date_of_joining || record.employee?.date_of_joining || '',
    record.bank_name || record.employee?.bank_name || '',
    record.bank_account_number || record.employee?.bank_account_number || '',
    record.pan || record.employee?.pan || '',
    record.esic_no || record.employee?.esic_no || '',
    record.uan_no || record.employee?.uan_no || '',
    monthName,
    record.year || '',
    record.month_days ?? '',
    record.paid_days ?? '',
    record.payroll_type || '',
    Number(record.basic || 0),
    Number(record.hra || 0),
    Number(record.conveyance_allowances || 0),
    Number(record.medical_allowances || 0),
    Number(record.special_allowances || 0),
    Number(record.night_shift_allowances || 0),
    Number(record.other_earnings || 0),
    Number(record.pf_employee || 0),
    Number(record.esic_employee || 0),
    Number(record.other_deductions || 0),
    calc.grossEarnings,
    calc.grossDeductions,
    calc.netPay,
    new Date().toISOString(),
  ];
}

/**
 * Finds or creates the dedicated Google Spreadsheet under the user's account.
 */
async function getOrCreateSpreadsheetId() {
  if (cachedSpreadsheetId) return cachedSpreadsheetId;
  if (process.env.GOOGLE_SHEET_ID) {
    cachedSpreadsheetId = process.env.GOOGLE_SHEET_ID;
    return cachedSpreadsheetId;
  }

  const sheets = getSheetsClient();
  const drive = getDriveClient();

  // Search in Google Drive for an existing sheet with this title
  const safeTitle = SHEET_TITLE.replace(/'/g, "\\'");
  const searchRes = await drive.files.list({
    q: `name = '${safeTitle}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
    pageSize: 1,
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    cachedSpreadsheetId = searchRes.data.files[0].id;
    return cachedSpreadsheetId;
  }

  // Create new Spreadsheet
  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: SHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: 'Salary Records',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = createRes.data.spreadsheetId;
  cachedSpreadsheetId = spreadsheetId;

  // Move the spreadsheet into the dedicated main Google Drive folder
  try {
    const mainFolder = await getOrCreateMainFolder(drive);
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: mainFolder.id,
      fields: 'id, parents',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Could not move sheet to main folder:', err.message);
  }

  // Format headers
  try {
    await formatSheetHeader(sheets, spreadsheetId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Could not format sheet header:', err.message);
  }

  return spreadsheetId;
}

/**
 * Formats row 1 of the sheet with professional styles (bold, header color, frozen row).
 */
async function formatSheetHeader(sheets, spreadsheetId) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.12, green: 0.22, blue: 0.45 }, // Dark navy #1F3873
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                  fontSize: 10,
                },
                horizontalAlignment: 'CENTER',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
          },
        },
      ],
    },
  });
}

/**
 * Replaces all data rows in the Google Sheet with the provided records.
 */
async function syncAllRecordsToGoogleSheet(records) {
  if (googleAppsScript.isAppsScriptConfigured()) {
    return googleAppsScript.syncAllRecords(records);
  }

  if (!isGoogleConfigured()) {
    // eslint-disable-next-line no-console
    console.warn('Google Sheets sync skipped: Google credentials not configured.');
    return { success: false, reason: 'not_configured' };
  }

  const sheets = getSheetsClient();
  const spreadsheetId = await getOrCreateSpreadsheetId();

  const values = [HEADERS, ...records.map(serializeRecordForSheet)];

  // Clear existing sheet content
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'Salary Records!A1:ZZ',
  });

  // Write new content
  const updateRes = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Salary Records!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return {
    success: true,
    spreadsheetId,
    updatedRows: records.length,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    response: updateRes.data,
  };
}

/**
 * Upserts a single salary record in Google Sheet.
 * Looks for matching Employee ID + Year + Month. Updates row if found, appends if new.
 */
async function upsertRecordInGoogleSheet(record) {
  if (googleAppsScript.isAppsScriptConfigured()) {
    return googleAppsScript.upsertRecord(record);
  }

  if (!isGoogleConfigured()) return null;

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = await getOrCreateSpreadsheetId();

    // Read current data
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Salary Records!A1:K',
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      // Sheet is empty, initialize with headers and this row
      return syncAllRecordsToGoogleSheet([record]);
    }

    const empId = String(record.employee?.employee_id || record.employee_id || '').trim().toLowerCase();
    const monthNum = parseInt(record.month, 10);
    const yearNum = parseInt(record.year, 10);

    let matchRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rEmpId = String(row[0] || '').trim().toLowerCase();
      const rMonth = String(row[9] || '');
      const rYear = parseInt(row[10], 10);

      const monthMatches = rMonth.includes(`(${monthNum})`) || parseInt(rMonth, 10) === monthNum;
      if (rEmpId === empId && rYear === yearNum && monthMatches) {
        matchRowIndex = i + 1; // 1-based index in sheets
        break;
      }
    }

    const rowData = serializeRecordForSheet(record);

    if (matchRowIndex > 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Salary Records!A${matchRowIndex}:AB${matchRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
      return { action: 'updated', row: matchRowIndex, spreadsheetId };
    }

    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Salary Records!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowData] },
    });
    return { action: 'appended', spreadsheetId };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to upsert record in Google Sheet:', err.message);
    return null;
  }
}

/**
 * Removes a record from Google Sheet by Employee ID, Month, and Year.
 */
async function deleteRecordFromGoogleSheet(employeeId, month, year) {
  if (googleAppsScript.isAppsScriptConfigured()) {
    return googleAppsScript.deleteRecord(employeeId, month, year);
  }

  if (!isGoogleConfigured()) return null;

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = await getOrCreateSpreadsheetId();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Salary Records!A1:K',
    });

    const rows = res.data.values || [];
    const empId = String(employeeId || '').trim().toLowerCase();
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    let matchRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rEmpId = String(row[0] || '').trim().toLowerCase();
      const rMonth = String(row[9] || '');
      const rYear = parseInt(row[10], 10);

      const monthMatches = rMonth.includes(`(${monthNum})`) || parseInt(rMonth, 10) === monthNum;
      if (rEmpId === empId && rYear === yearNum && monthMatches) {
        matchRowIndex = i; // 0-based row index for deleteDimension
        break;
      }
    }

    if (matchRowIndex > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: 'ROWS',
                  startIndex: matchRowIndex,
                  endIndex: matchRowIndex + 1,
                },
              },
            },
          ],
        },
      });
      return { action: 'deleted', row: matchRowIndex + 1 };
    }
    return null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete record from Google Sheet:', err.message);
    return null;
  }
}

/**
 * Gets sheet status and direct link.
 */
async function getGoogleSheetStatus() {
  if (googleAppsScript.isAppsScriptConfigured()) {
    const status = await googleAppsScript.getStatus();
    return {
      configured: true,
      sheetUrl: status.sheetUrl,
      spreadsheetId: status.sheetId,
      sheetTitle: SHEET_TITLE,
    };
  }

  if (!isGoogleConfigured()) {
    return { configured: false };
  }

  try {
    const spreadsheetId = await getOrCreateSpreadsheetId();
    return {
      configured: true,
      spreadsheetId,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      sheetTitle: SHEET_TITLE,
    };
  } catch (err) {
    return {
      configured: true,
      error: err.message,
    };
  }
}

module.exports = {
  getOrCreateSpreadsheetId,
  syncAllRecordsToGoogleSheet,
  upsertRecordInGoogleSheet,
  deleteRecordFromGoogleSheet,
  getGoogleSheetStatus,
  HEADERS,
};
