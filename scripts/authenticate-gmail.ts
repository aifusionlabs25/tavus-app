import { google } from 'googleapis';
import express from 'express';
import open from 'open';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/api/auth/gmail/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env.local');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.compose'];

const app = express();

// Step 1: Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
});

console.log('🔐 Authorize this app by visiting this URL:');
console.log(authUrl);
console.log('\nOpening browser...\n');

// Auto-open browser
open(authUrl);

// Step 2: Handle OAuth callback
app.get('/api/auth/gmail/callback', async (req, res) => {
    const code = req.query.code as string;

    try {
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\n✅ SUCCESS! Add these to your .env file:\n');
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log(`GMAIL_ACCESS_TOKEN=${tokens.access_token}\n`); // Access token is short-lived, but good to see

        res.send(`
      <h1>✅ Authentication Successful!</h1>
      <p>Check your terminal for the refresh token.</p>
      <p>You can close this window.</p>
    `);

        // Auto-close server after 5 seconds
        setTimeout(() => process.exit(0), 5000);
    } catch (error) {
        console.error('❌ Error retrieving tokens:', error);
        res.send('❌ Authentication failed. Check terminal for errors.');
    }
});

app.listen(3000, () => {
    console.log('🚀 Auth server running on http://localhost:3000');
});
