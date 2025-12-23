const { google } = require('googleapis');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

async function checkSheets() {
    console.log('🔍 Diagnostics: Google Sheets Integration');
    console.log('----------------------------------------');

    // 1. Check Env Vars
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    console.log(`Checking Env Vars:`);
    console.log(`- EMAIL: ${email ? '✅ Present' : '❌ MISSING'}`);
    console.log(`- KEY: ${key ? '✅ Present' : '❌ MISSING'}`);
    console.log(`- SHEET ID: ${sheetId ? '✅ Present' : '❌ MISSING'}`);

    if (!email || !key || !sheetId) {
        console.error('❌ CRITICAL: Missing Environment Variables. Cannot proceed.');
        return;
    }

    // Fix Key Formatting (Newlines)
    const formattedKey = key.replace(/\\n/g, '\n').replace(/"/g, '');

    // 2. Auth Test
    console.log('\nTesting Authentication...');
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: email,
                private_key: formattedKey,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        console.log('✅ Authentication Successful (Client created).');

        // 3. Write Test
        console.log('\nAttempting WRITE to Sheet...');
        const timestamp = new Date().toISOString();
        const testRow = [timestamp, 'DIAGNOSTIC_TEST', 'System Check', 'N/A', 'test@example.com'];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: 'Sheet1!A:E', // Assuming Sheet1 and first few columns
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [testRow]
            }
        });

        if (response.status === 200) {
            console.log('✅ WRITE SUCCESSFUL!');
            console.log(`- Updated Range: ${response.data.updates.updatedRange}`);
            console.log(`- Updated Rows: ${response.data.updates.updatedRows}`);
        } else {
            console.error('⚠️ Write completed but status was:', response.status);
        }

    } catch (error) {
        console.error('\n❌ ERROR during execution:');
        if (error.response) {
            console.error(`- Status: ${error.response.status}`);
            console.error(`- Status Text: ${error.response.statusText}`);
            // Often detail is in error.response.data.error_description or error.message
        }
        console.error(`- Message: ${error.message}`);
    }
}

checkSheets();
