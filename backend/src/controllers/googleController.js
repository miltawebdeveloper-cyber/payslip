const catchAsync = require('../middleware/catchAsync');
const { generateOAuthUrl, exchangeCodeForTokens } = require('../config/googleConfig');
const googleAppsScript = require('../services/googleAppsScriptService');

/**
 * Links to the Google Sheet (the app's data store) and the Drive folders.
 * Never fails the request: a Google problem is reported in `error`.
 */
const getStatus = catchAsync(async (req, res) => {
  if (!googleAppsScript.isAppsScriptConfigured()) {
    return res.json({
      configured: false,
      authType: null,
      message: 'Set GOOGLE_APPS_SCRIPT_URL to the Apps Script Web App URL. Salary records are stored in its Google Sheet.',
    });
  }

  try {
    const status = await googleAppsScript.getStatus();
    res.json({
      configured: true,
      authType: 'apps_script',
      sheet: {
        configured: true,
        sheetUrl: status.sheetUrl,
        spreadsheetId: status.sheetId,
        sheetTitle: googleAppsScript.sheetParams().sheetTitle,
      },
      drive: {
        configured: true,
        mainFolder: {
          id: status.folderId,
          name: status.folderName,
          webViewLink: status.folderUrl,
        },
        payslipsFolder: {
          webViewLink: status.payslipsFolderUrl || status.folderUrl,
        },
      },
    });
  } catch (err) {
    res.json({ configured: true, authType: 'apps_script', error: err.message });
  }
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
  getAuthUrl,
  oauthCallback,
};
