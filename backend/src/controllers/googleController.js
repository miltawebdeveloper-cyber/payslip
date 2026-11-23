const catchAsync = require('../middleware/catchAsync');
const { SalaryData, Employee } = require('../models');
const {
  isGoogleConfigured,
  getAuthType,
  generateOAuthUrl,
  exchangeCodeForTokens,
} = require('../config/googleConfig');
const { getGoogleSheetStatus, syncAllRecordsToGoogleSheet } = require('../services/googleSheetsService');
const { getDriveStatus } = require('../services/googleDriveService');

/**
 * Returns overall Google integration status, sheet links, and drive folder links.
 */
const getStatus = catchAsync(async (req, res) => {
  const configured = isGoogleConfigured();
  const authType = getAuthType();

  if (!configured) {
    return res.json({
      configured: false,
      authType,
      message: 'Google integration is not yet fully configured. Set up OAuth2 or Service Account in environment variables.',
    });
  }

  const [sheetStatus, driveStatus] = await Promise.all([
    getGoogleSheetStatus(),
    getDriveStatus(),
  ]);

  res.json({
    configured: true,
    authType,
    sheet: sheetStatus,
    drive: driveStatus,
  });
});

/**
 * Manually trigger full synchronization of all PostgreSQL salary records to Google Sheets.
 */
const syncSheet = catchAsync(async (req, res) => {
  if (!isGoogleConfigured()) {
    return res.status(400).json({
      success: false,
      message: 'Google account is not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.',
    });
  }

  const allRecords = await SalaryData.findAll({
    include: [{ model: Employee, as: 'employee', required: true }],
    order: [
      ['year', 'DESC'],
      ['month', 'DESC'],
      [{ model: Employee, as: 'employee' }, 'employee_name', 'ASC'],
    ],
  });

  const syncResult = await syncAllRecordsToGoogleSheet(allRecords);

  res.json({
    success: syncResult.success,
    totalRecords: allRecords.length,
    spreadsheetId: syncResult.spreadsheetId,
    sheetUrl: syncResult.sheetUrl,
    message: `Successfully synchronized ${allRecords.length} records to Google Sheet.`,
  });
});

/**
 * Returns OAuth2 authorization URL for connecting a personal Google account.
 */
const getAuthUrl = catchAsync(async (req, res) => {
  const redirectUri = req.query.redirect_uri || (req.headers.origin ? `${req.headers.origin}/api/google/oauth2callback` : undefined);
  const authUrl = generateOAuthUrl(redirectUri);
  res.json({ authUrl });
});

/**
 * OAuth2 Callback handler: exchanges auth code for refresh token.
 */
const oauthCallback = catchAsync(async (req, res) => {
  const { code, redirect_uri } = req.query;
  if (!code) {
    return res.status(400).send('<h3>Authorization code missing.</h3>');
  }

  const tokens = await exchangeCodeForTokens(code, redirect_uri);

  res.send(`
    <html>
      <head><title>Google Authorization Successful</title></head>
      <body style="font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 600px; margin: auto;">
        <h2 style="color: #2e7d32;">Google Authorization Successful!</h2>
        <p>Copy the Refresh Token below and add it to your <code>.env</code> file or Vercel environment variables:</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 14px;">
          GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || '(Refresh token not returned; revoke app access at myaccount.google.com/permissions and retry with prompt=consent)'}
        </div>
        <p style="margin-top: 20px;">You can now close this window and restart your server / redeploy.</p>
      </body>
    </html>
  `);
});

module.exports = {
  getStatus,
  syncSheet,
  getAuthUrl,
  oauthCallback,
};
