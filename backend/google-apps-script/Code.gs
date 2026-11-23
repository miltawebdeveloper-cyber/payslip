/**
 * Google Apps Script Web App for Payslip Generator
 * 
 * NO Google Cloud setup required!
 * Runs directly inside your personal Google Account.
 * 
 * Steps to deploy:
 * 1. Go to https://script.google.com/
 * 2. Click "New project"
 * 3. Replace all code in the editor with this script
 * 4. Click "Deploy" > "New deployment"
 * 5. Click the gear icon (Select type) > Choose "Web app"
 * 6. Set:
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone"
 * 7. Click "Deploy", authorize access, and copy the "Web app URL"
 * 8. Add that URL to your backend/.env as:
 *    GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 */

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
  'Last Updated'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    if (action === 'getStatus') {
      result = handleGetStatus(data);
    } else if (action === 'syncSheet') {
      result = handleSyncSheet(data);
    } else if (action === 'upsertRecord') {
      result = handleUpsertRecord(data);
    } else if (action === 'deleteRecord') {
      result = handleDeleteRecord(data);
    } else if (action === 'uploadPdf') {
      result = handleUploadPdf(data);
    } else {
      result = { success: false, error: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', name: 'Payslip Generator Google Apps Script API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFolder(folderId) {
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      // folder not found
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
    const file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }

  // Create new Spreadsheet
  const ss = SpreadsheetApp.create(sheetTitle);
  const file = DriveApp.getFileById(ss.getId());
  file.moveTo(folder);

  const sheet = ss.getActiveSheet();
  sheet.setName('Salary Records');
  sheet.appendRow(HEADERS);
  formatHeaderRow(sheet);

  return ss;
}

function formatHeaderRow(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground('#1F3873');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function recordToRow(r) {
  return [
    r.employee_id || '',
    r.employee_name || '',
    r.designation || '',
    r.date_of_joining || '',
    r.bank_name || '',
    r.bank_account_number || '',
    r.pan || '',
    r.esic_no || '',
    r.uan_no || '',
    r.month || '',
    r.year || '',
    r.month_days !== undefined ? r.month_days : '',
    r.paid_days !== undefined ? r.paid_days : '',
    r.payroll_type || '',
    r.basic || 0,
    r.hra || 0,
    r.conveyance_allowances || 0,
    r.medical_allowances || 0,
    r.special_allowances || 0,
    r.night_shift_allowances || 0,
    r.other_earnings || 0,
    r.pf_employee || 0,
    r.esic_employee || 0,
    r.other_deductions || 0,
    r.grossEarnings || 0,
    r.grossDeductions || 0,
    r.netPay || 0,
    r.lastUpdated || new Date().toISOString()
  ];
}

function handleGetStatus(data) {
  const folder = getFolder(data.folderId);
  const ss = getOrCreateSpreadsheet(folder, data.sheetTitle || 'Payslip Generator - Salary Records');
  const payslipsFolder = getOrCreateSubfolder(folder, 'Payslips');

  return {
    configured: true,
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: folder.getUrl(),
    sheetId: ss.getId(),
    sheetUrl: ss.getUrl(),
    payslipsFolderUrl: payslipsFolder.getUrl(),
  };
}

function handleSyncSheet(data) {
  const folder = getFolder(data.folderId);
  const ss = getOrCreateSpreadsheet(folder, data.sheetTitle || 'Payslip Generator - Salary Records');
  const sheet = ss.getSheetByName('Salary Records') || ss.getActiveSheet();

  sheet.clear();
  sheet.appendRow(HEADERS);
  formatHeaderRow(sheet);

  const records = data.records || [];
  if (records.length > 0) {
    const rows = records.map(recordToRow);
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }

  return {
    success: true,
    totalRows: records.length,
    sheetUrl: ss.getUrl(),
    sheetId: ss.getId()
  };
}

function handleUpsertRecord(data) {
  const folder = getFolder(data.folderId);
  const ss = getOrCreateSpreadsheet(folder, data.sheetTitle || 'Payslip Generator - Salary Records');
  const sheet = ss.getSheetByName('Salary Records') || ss.getActiveSheet();

  const r = data.record;
  const targetEmpId = String(r.employee_id || '').trim().toLowerCase();
  const targetYear = parseInt(r.year, 10);
  const targetMonthNum = parseInt(r.monthNum || r.month, 10);

  const rows = sheet.getDataRange().getValues();
  let matchRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    const rowEmpId = String(rows[i][0] || '').trim().toLowerCase();
    const rowMonth = String(rows[i][9] || '');
    const rowYear = parseInt(rows[i][10], 10);

    const monthMatches = rowMonth.includes('(' + targetMonthNum + ')') || parseInt(rowMonth, 10) === targetMonthNum;
    if (rowEmpId === targetEmpId && rowYear === targetYear && monthMatches) {
      matchRowIndex = i + 1; // 1-based index
      break;
    }
  }

  const newRow = recordToRow(r);

  if (matchRowIndex > 0) {
    sheet.getRange(matchRowIndex, 1, 1, HEADERS.length).setValues([newRow]);
    return { success: true, action: 'updated', row: matchRowIndex, sheetUrl: ss.getUrl() };
  } else {
    sheet.appendRow(newRow);
    return { success: true, action: 'appended', sheetUrl: ss.getUrl() };
  }
}

function handleDeleteRecord(data) {
  const folder = getFolder(data.folderId);
  const ss = getOrCreateSpreadsheet(folder, data.sheetTitle || 'Payslip Generator - Salary Records');
  const sheet = ss.getSheetByName('Salary Records') || ss.getActiveSheet();

  const targetEmpId = String(data.employeeId || '').trim().toLowerCase();
  const targetYear = parseInt(data.year, 10);
  const targetMonthNum = parseInt(data.month, 10);

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowEmpId = String(rows[i][0] || '').trim().toLowerCase();
    const rowMonth = String(rows[i][9] || '');
    const rowYear = parseInt(rows[i][10], 10);

    const monthMatches = rowMonth.includes('(' + targetMonthNum + ')') || parseInt(rowMonth, 10) === targetMonthNum;
    if (rowEmpId === targetEmpId && rowYear === targetYear && monthMatches) {
      sheet.deleteRow(i + 1);
      return { success: true, action: 'deleted', row: i + 1 };
    }
  }

  return { success: false, message: 'Record not found' };
}

function handleUploadPdf(data) {
  const folder = getFolder(data.folderId);
  const payslipsFolder = getOrCreateSubfolder(folder, 'Payslips');
  const monthFolder = getOrCreateSubfolder(payslipsFolder, (data.monthName || ('Month-' + data.month)) + ' ' + data.year);

  // Decode PDF from base64
  const decodedBytes = Utilities.base64Decode(data.pdfBase64);
  const blob = Utilities.newBlob(decodedBytes, 'application/pdf', data.fileName);

  // If a file with the same name exists, delete/replace it
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
