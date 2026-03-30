import { google } from 'googleapis';
import fs from 'fs';

async function test() {
  try {
    const creds = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
    console.log("Service Account Email:", creds.client_email);
    console.log("Project ID:", creds.project_id);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const MASTER_SS_ID = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M";

    console.log("Attempting to fetch spreadsheet metadata...");
    const res = await sheets.spreadsheets.get({
      spreadsheetId: MASTER_SS_ID,
    });
    console.log("Success! Spreadsheet title:", res.data.properties.title);
  } catch (err) {
    console.error("FAILED!");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Error Message:", err.message);
    }
  }
}

test();