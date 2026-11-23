/* eslint-disable no-console */
/**
 * Interactive CLI helper to generate GOOGLE_REFRESH_TOKEN for your personal Google account.
 * Run with: npm run google:auth (from root) or node scripts/generateGoogleToken.js (from backend)
 */
require('dotenv').config();
const readline = require('readline');
const { google } = require('googleapis');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/oauth2callback';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

async function main() {
  console.log('\n======================================================');
  console.log('  Google Personal Account Authorization Helper');
  console.log('======================================================\n');

  let id = clientId;
  let secret = clientSecret;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  if (!id) {
    id = await question('Enter your GOOGLE_CLIENT_ID: ');
  }
  if (!secret) {
    secret = await question('Enter your GOOGLE_CLIENT_SECRET: ');
  }

  if (!id || !secret) {
    console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
    rl.close();
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(id.trim(), secret.trim(), redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n1. Open the following URL in your browser to sign in with your personal Google account:\n');
  console.log(authUrl);
  console.log('\n2. After granting consent, if your backend server is running, you will be redirected to:');
  console.log(`   ${redirectUri}`);
  console.log('   and your refresh token will be displayed on screen.\n');
  console.log('   OR copy the "code" query parameter from the browser URL address bar and paste it below:\n');

  const codeInput = await question('Enter the authorization code (or full redirected URL): ');
  rl.close();

  if (!codeInput || !codeInput.trim()) {
    console.log('No code entered. Aborting.');
    process.exit(0);
  }

  let code = codeInput.trim();
  if (code.includes('code=')) {
    const match = code.match(/code=([^&]+)/);
    if (match) {
      code = decodeURIComponent(match[1]);
    }
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n======================================================');
    console.log('  SUCCESS! Your Google Credentials:');
    console.log('======================================================\n');
    console.log('Add these variables to your backend/.env and Vercel Environment Variables:\n');
    console.log(`GOOGLE_CLIENT_ID=${id.trim()}`);
    console.log(`GOOGLE_CLIENT_SECRET=${secret.trim()}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n======================================================\n');
  } catch (err) {
    console.error('\nError exchanging authorization code:', err.message);
  }
}

main();
