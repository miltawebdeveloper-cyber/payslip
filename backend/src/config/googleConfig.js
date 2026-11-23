const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

let cachedOAuth2Client = null;
let cachedAuthClient = null;

function getOAuth2Client(redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl =
    redirectUri ||
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:5000/api/google/oauth2callback';

  if (!clientId || !clientSecret) return null;

  return new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
}

function getGoogleAuthClient() {
  if (cachedAuthClient) return cachedAuthClient;

  // 1. Try local service-account.json file (Easiest, zero-config method)
  const serviceAccountPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
    path.join(__dirname, '..', '..', 'service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const content = fs.readFileSync(serviceAccountPath, 'utf8');
      const credentials = JSON.parse(content);
      const auth = google.auth.fromJSON(credentials);
      auth.scopes = SCOPES;
      cachedAuthClient = auth;
      return cachedAuthClient;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load service-account.json:', err.message);
    }
  }

  // 2. Try OAuth2 (Personal Google Account)
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    cachedAuthClient = oauth2Client;
    return cachedAuthClient;
  }

  // 2. Try Service Account (if configured)
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    // Handle escaped newlines in environment variable
    privateKey = privateKey.replace(/\\n/g, '\n');
    const jwtClient = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES,
    });
    cachedAuthClient = jwtClient;
    return cachedAuthClient;
  }

  // 3. Try Google Application Credentials JSON string or file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      const auth = google.auth.fromJSON(credentials);
      auth.scopes = SCOPES;
      cachedAuthClient = auth;
      return cachedAuthClient;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', err.message);
    }
  }

  return null;
}

function isGoogleConfigured() {
  if (process.env.GOOGLE_APPS_SCRIPT_URL) return true;
  return Boolean(getGoogleAuthClient());
}

function getAuthType() {
  if (process.env.GOOGLE_APPS_SCRIPT_URL) {
    return 'apps_script';
  }
  const serviceAccountPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
    path.join(__dirname, '..', '..', 'service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    return 'service_account_file';
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
    return 'oauth2';
  }
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return 'service_account';
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return 'service_account_json';
  }
  return null;
}

function generateOAuthUrl(customRedirectUri) {
  const oauth2Client = getOAuth2Client(customRedirectUri);
  if (!oauth2Client) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required to generate auth URL.');
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

async function exchangeCodeForTokens(code, customRedirectUri) {
  const oauth2Client = getOAuth2Client(customRedirectUri);
  if (!oauth2Client) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
  }

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

function getDriveClient() {
  const auth = getGoogleAuthClient();
  if (!auth) throw new Error('Google authentication is not configured. Please set Google environment variables.');
  return google.drive({ version: 'v3', auth });
}

function getSheetsClient() {
  const auth = getGoogleAuthClient();
  if (!auth) throw new Error('Google authentication is not configured. Please set Google environment variables.');
  return google.sheets({ version: 'v4', auth });
}

module.exports = {
  getGoogleAuthClient,
  isGoogleConfigured,
  getAuthType,
  getOAuth2Client,
  generateOAuthUrl,
  exchangeCodeForTokens,
  getDriveClient,
  getSheetsClient,
};
