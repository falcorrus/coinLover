import { google } from 'googleapis';
import fs from 'fs';

const creds = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));

const auth = new google.auth.JWT(
  creds.client_email,
  null,
  creds.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });
const MASTER_SS_ID = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M";

async function run() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SS_ID,
      range: 'Users!A:F'
    });
    console.log("Users Rows:", res.data.values);
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

run();
