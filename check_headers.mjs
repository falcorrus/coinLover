import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

async function getSheetsClient() {
  const credPath = path.join(process.env.HOME, '.gemini/configs/keys/ga-projects-key.json');
  const creds = JSON.parse(fs.readFileSync(creds_path, 'utf8'));
  const authClient = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  return google.sheets({ version: 'v4', auth: authClient });
}

async function checkHeaders() {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M";
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!A1:Z1'
    });
    console.log("Headers row 1:", JSON.stringify(res.data.values?.[0]));
    
    const res2 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!A2:Z2'
    });
    console.log("Headers row 2:", JSON.stringify(res2.data.values?.[0]));
  } catch (e) {
    console.error(e);
  }
}

// Fixed the creds_path in the script above
const creds_path = path.join(process.env.HOME, '.gemini/configs/keys/ga-projects-key.json');
checkHeaders();
