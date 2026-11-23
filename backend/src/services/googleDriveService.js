const stream = require('stream');
const { getDriveClient, isGoogleConfigured } = require('../config/googleConfig');
const { MONTH_NAMES } = require('../config/constants');
const googleAppsScript = require('./googleAppsScriptService');

// In-memory cache for folder IDs to minimize Google Drive API roundtrips
const folderCache = new Map();

/**
 * Searches for an active (non-trashed) folder with given name inside parentFolderId.
 */
async function findFolder(drive, folderName, parentFolderId = null) {
  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
    pageSize: 1,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0];
  }
  return null;
}

/**
 * Creates a folder with the given name inside parentFolderId (or root).
 */
async function createFolder(drive, folderName, parentFolderId = null) {
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const res = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, webViewLink',
  });

  return res.data;
}

/**
 * Gets or creates the main dedicated Drive folder (defaults to "Payslip Generator").
 */
async function getOrCreateMainFolder(drive) {
  const folderName = process.env.GOOGLE_DRIVE_MAIN_FOLDER || 'Payslip Generator';
  const cacheKey = `main:${folderName}`;

  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey);
  }

  // If explicit parent folder ID provided in env:
  if (process.env.GOOGLE_DRIVE_MAIN_FOLDER_ID) {
    const folder = { id: process.env.GOOGLE_DRIVE_MAIN_FOLDER_ID, name: folderName };
    folderCache.set(cacheKey, folder);
    return folder;
  }

  let folder = await findFolder(drive, folderName);
  if (!folder) {
    folder = await createFolder(drive, folderName);
  }

  folderCache.set(cacheKey, folder);
  return folder;
}

/**
 * Gets or creates the "Payslips" subfolder inside the main folder.
 */
async function getOrCreatePayslipsFolder(drive) {
  const mainFolder = await getOrCreateMainFolder(drive);
  const cacheKey = `payslips:${mainFolder.id}`;

  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey);
  }

  let folder = await findFolder(drive, 'Payslips', mainFolder.id);
  if (!folder) {
    folder = await createFolder(drive, 'Payslips', mainFolder.id);
  }

  folderCache.set(cacheKey, folder);
  return folder;
}

/**
 * Gets or creates a subfolder inside Payslips organized by month and year (e.g. "September 2026").
 */
async function getOrCreateMonthFolder(drive, monthNum, yearNum) {
  const payslipsFolder = await getOrCreatePayslipsFolder(drive);
  const monthName = MONTH_NAMES[monthNum - 1] || `Month-${monthNum}`;
  const folderName = `${monthName} ${yearNum}`;
  const cacheKey = `month:${payslipsFolder.id}:${folderName}`;

  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey);
  }

  let folder = await findFolder(drive, folderName, payslipsFolder.id);
  if (!folder) {
    folder = await createFolder(drive, folderName, payslipsFolder.id);
  }

  folderCache.set(cacheKey, folder);
  return folder;
}

/**
 * Uploads or updates a payslip PDF in Google Drive.
 * Organised in: Payslip Generator -> Payslips -> [Month Year] -> [FileName].pdf
 */
async function uploadPayslipPdf({ employee, month, year, pdfBuffer, fileName }) {
  if (googleAppsScript.isAppsScriptConfigured()) {
    const res = await googleAppsScript.uploadPayslipPdf({ employee, month, year, pdfBuffer, fileName });
    return {
      fileId: res.fileId,
      fileName,
      webViewLink: res.fileUrl,
      webContentLink: res.fileUrl,
      action: 'uploaded',
    };
  }

  if (!isGoogleConfigured()) {
    // eslint-disable-next-line no-console
    console.warn('Google Drive integration skipped: Google credentials not configured.');
    return null;
  }

  const drive = getDriveClient();
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // 1. Ensure target month folder inside Payslips
  const targetFolder = await getOrCreateMonthFolder(drive, monthNum, yearNum);

  // 2. Check if file already exists in this folder to avoid duplicate files
  const safeName = fileName.replace(/'/g, "\\'");
  const searchRes = await drive.files.list({
    q: `name = '${safeName}' and '${targetFolder.id}' in parents and trashed = false`,
    fields: 'files(id, name, webViewLink, webContentLink)',
    spaces: 'drive',
    pageSize: 1,
  });

  const bufferStream = new stream.PassThrough();
  bufferStream.end(pdfBuffer);

  const media = {
    mimeType: 'application/pdf',
    body: bufferStream,
  };

  const employeeName = employee.employee_name || employee.employeeName || '';
  const employeeId = employee.employee_id || employee.employeeId || '';

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    // Update existing file
    const existingFile = searchRes.data.files[0];
    const updateRes = await drive.files.update({
      fileId: existingFile.id,
      media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    return {
      fileId: updateRes.data.id,
      fileName,
      webViewLink: updateRes.data.webViewLink,
      webContentLink: updateRes.data.webContentLink,
      folderId: targetFolder.id,
      folderName: targetFolder.name,
      action: 'updated',
    };
  }

  // Create new file
  const fileMetadata = {
    name: fileName,
    parents: [targetFolder.id],
    description: `Payslip for ${employeeName} (${employeeId}) - ${MONTH_NAMES[monthNum - 1]} ${yearNum}`,
  };

  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink, webContentLink',
  });

  return {
    fileId: createRes.data.id,
    fileName,
    webViewLink: createRes.data.webViewLink,
    webContentLink: createRes.data.webContentLink,
    folderId: targetFolder.id,
    folderName: targetFolder.name,
    action: 'created',
  };
}

/**
 * Gets the current Google Drive status and folder links.
 */
async function getDriveStatus() {
  if (googleAppsScript.isAppsScriptConfigured()) {
    const status = await googleAppsScript.getStatus();
    return {
      configured: true,
      mainFolder: {
        id: status.folderId,
        name: status.folderName || 'Payslip Generator',
        webViewLink: status.folderUrl,
      },
      payslipsFolder: {
        webViewLink: status.payslipsFolderUrl || status.folderUrl,
      },
    };
  }

  if (!isGoogleConfigured()) {
    return { configured: false };
  }

  try {
    const drive = getDriveClient();
    const mainFolder = await getOrCreateMainFolder(drive);
    const payslipsFolder = await getOrCreatePayslipsFolder(drive);

    return {
      configured: true,
      mainFolder: {
        id: mainFolder.id,
        name: mainFolder.name,
        webViewLink: mainFolder.webViewLink,
      },
      payslipsFolder: {
        id: payslipsFolder.id,
        name: payslipsFolder.name,
        webViewLink: payslipsFolder.webViewLink,
      },
    };
  } catch (err) {
    return {
      configured: true,
      error: err.message,
    };
  }
}

module.exports = {
  getOrCreateMainFolder,
  getOrCreatePayslipsFolder,
  getOrCreateMonthFolder,
  uploadPayslipPdf,
  getDriveStatus,
};
