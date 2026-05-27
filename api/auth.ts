import { Request, Response } from 'express';
import crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const MASTER_SS_ID = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M";
const SECRET = process.env.JWT_SECRET || "coinlover-super-secret-key-1337";

// Helper: Get Sheets client (similar to api/sheets.ts)
let sheetsClient: any = null;
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    const credPath = path.join(process.cwd(), 'google-credentials.json');
    if (fs.existsSync(credPath)) {
      const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      clientEmail = creds.client_email;
      privateKey = creds.private_key;
    }
  }

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google credentials. ENV or google-credentials.json required.");
  }

  const authClient = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  sheetsClient = google.sheets({ version: 'v4', auth: authClient });
  return sheetsClient;
}

// Helper: Generate a signed stateless challenge token
function generateChallengeToken(challenge: string, extraData = "") {
  const timestamp = Date.now();
  const dataToSign = `${challenge}.${timestamp}.${extraData}`;
  const signature = crypto.createHmac('sha256', SECRET).update(dataToSign).digest('base64url');
  return `${challenge}.${timestamp}.${extraData}.${signature}`;
}

// Helper: Verify a signed stateless challenge token
function verifyChallengeToken(token: string, challenge: string, extraData = ""): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  
  const [tokenChallenge, tokenTimestampStr, tokenExtra, signature] = parts;
  if (tokenChallenge !== challenge || tokenExtra !== extraData) return false;
  
  const timestamp = parseInt(tokenTimestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000) {
    // Challenge expired (> 5 minutes)
    return false;
  }
  
  const dataToSign = `${challenge}.${tokenTimestampStr}.${extraData}`;
  const expectedSignature = crypto.createHmac('sha256', SECRET).update(dataToSign).digest('base64url');
  return signature === expectedSignature;
}

// Helper: Convert base64url string to Buffer
function base64urlToBuffer(b64url: string): Buffer {
  return Buffer.from(b64url, 'base64');
}

// Helper: Convert Uint8Array to base64url
function bufferToBase64url(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64url');
}

// Helper: Resolve ssId from contact in Master Sheet Users
async function getSsIdByContact(contact: string): Promise<string | null> {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SS_ID,
      range: 'Users!B:C' // Column B: Contact, Column C: ID (ssId)
    });
    const rows = res.data.values || [];
    const searchContact = contact.trim().toLowerCase().replace(/^@/, '');
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      const rowContact = String(row[0]).trim().toLowerCase().replace(/^@/, '');
      if (rowContact === searchContact) {
        return String(row[1]).trim();
      }
    }
  } catch (err) {
    console.error('[Auth] Failed to lookup contact in Master Sheet:', err);
  }
  return null;
}

// Handler for all auth operations
export async function authHandler(req: Request, res: Response) {
  // CORS Headers for Native App (Capacitor)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { path: routePath, method } = req;
  const action = routePath.split('/').pop();
  
  // RP ID (Relying Party ID) represents the domain of our app.
  // In production it must match the actual domain (e.g. coinlover.ru).
  const hostHeader = req.headers.host || 'coinlover.ru';
  const rpId = hostHeader.split(':')[0]; // strip port

  console.log(`[Auth] ${method} /api/auth/${action} | host=${hostHeader} rpId=${rpId}`);

  try {
    if (action === 'register-options') {
      const ssId = String(req.query.ssId || "").trim();
      const contact = String(req.query.contact || "").trim();
      if (!ssId && !contact) {
        return res.status(400).json({ status: 'error', message: 'Missing ssId or contact' });
      }

      const identifier = ssId || contact;
      const userName = ssId 
        ? `user-${ssId.substring(0, 8)}@coinlover.ru` 
        : `new-${contact.replace(/[^a-zA-Z0-9]/g, '')}@coinlover.ru`;

      console.log(`[Auth] register-options: ssId=${ssId.substring(0, 12)}... contact=${contact}`);

      // Generate credentials creation options
      const options = await generateRegistrationOptions({
        rpName: 'CoinLover',
        rpID: rpId,
        userID: Buffer.from(identifier, 'utf8'),
        userName: userName,
        userDisplayName: ssId ? 'CoinLover Wallet Holder' : `CoinLover User (${contact})`,
        attestationType: 'none',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          requireResidentKey: true,
          userVerification: 'required'
        }
      });

      // Stateless signed challenge containing identifier
      const challengeToken = generateChallengeToken(options.challenge, identifier);
      
      console.log(`[Auth] register-options OK challenge=${options.challenge.substring(0, 12)}...`);
      return res.status(200).json({
        status: 'success',
        options,
        challengeToken
      });
    }

    if (action === 'register-verify') {
      const { ssId, registrationResponse, challengeToken } = req.body;
      if (!ssId || !registrationResponse || !challengeToken) {
        return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
      }

      // Verify stateless challenge token matches the one in response
      const clientChallenge = registrationResponse.response.clientDataJSON 
        ? JSON.parse(Buffer.from(registrationResponse.response.clientDataJSON, 'base64').toString('utf8')).challenge
        : '';
      
      let challengeVerified = verifyChallengeToken(challengeToken, clientChallenge, ssId);
      if (!challengeVerified) {
        const contact = String(req.body.contact || "").trim();
        if (contact) {
          challengeVerified = verifyChallengeToken(challengeToken, clientChallenge, contact);
        }
      }

      if (!challengeVerified) {
        return res.status(400).json({ status: 'error', message: 'Invalid or expired challenge token' });
      }

      const expectedChallenge = clientChallenge;

      // Verify the WebAuthn response
      const verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge,
        expectedOrigin: [`https://${rpId}`, `http://${rpId}`, `https://coinlover.ru`, `https://coin.reloto.ru`],
        expectedRPID: rpId,
        requireUserVerification: true
      });

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ status: 'error', message: 'WebAuthn registration verification failed' });
      }

      const { credential } = verification.registrationInfo;
      const credentialIDStr = typeof credential.id === 'string' 
        ? credential.id 
        : bufferToBase64url(credential.id);
      
      const credentialPublicKeyStr = bufferToBase64url(credential.publicKey);
      const counter = credential.counter;

      // Prepare Google Sheets update
      const sheets = await getSheetsClient();
      
      // Read current configs first to preserve them
      let existingRows: any[][] = [];
      try {
        const confRes = await sheets.spreadsheets.values.get({
          spreadsheetId: ssId,
          range: 'Configs!A:M'
        });
        existingRows = confRes.data.values || [];
      } catch (err) {
        return res.status(404).json({ status: 'error', message: 'Google Sheet not found or access denied' });
      }

      // Update the configs array with new system keys
      const updatedRows = [...existingRows];
      
      // Helper to set or append key
      const setKeyVal = (key: string, val: any) => {
        const idx = updatedRows.findIndex(r => r && r[0] && String(r[0]).trim() === key);
        if (idx !== -1) {
          updatedRows[idx] = [key, val];
        } else {
          updatedRows.push([key, val]);
        }
      };

      setKeyVal("Passkey_Enabled", "TRUE");
      setKeyVal("Passkey_Credential_ID", credentialIDStr);
      setKeyVal("Passkey_Public_Key", credentialPublicKeyStr);
      setKeyVal("Passkey_Counter", String(counter));

      // Save back to Google Sheets
      await sheets.spreadsheets.values.clear({
        spreadsheetId: ssId,
        range: 'Configs!A1:Z500'
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: ssId,
        range: 'Configs!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: updatedRows }
      });

      return res.status(200).json({ status: 'success', verified: true });
    }

    if (action === 'login-options') {
      console.log(`[Auth] login-options rpId=${rpId}`);
      const options = await generateAuthenticationOptions({
        rpID: rpId,
        userVerification: 'required'
      });

      const challengeToken = generateChallengeToken(options.challenge);
      
      console.log(`[Auth] login-options OK challenge=${options.challenge.substring(0, 12)}...`);
      return res.status(200).json({
        status: 'success',
        options,
        challengeToken
      });
    }

    if (action === 'login-verify') {
      const { loginResponse, challengeToken, ssId } = req.body;
      if (!loginResponse || !challengeToken || !ssId) {
        return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
      }

      // Resolve ssId if it is a contact handle
      let resolvedSsId = ssId;
      const isGoogleSheetId = /^[a-zA-Z0-9-_]{25,}$/.test(ssId) && !ssId.includes('@');
      
      if (!isGoogleSheetId) {
        console.log(`[Auth] login-verify: ssId is a contact handle (${ssId}), looking up in Master Sheet...`);
        const found = await getSsIdByContact(ssId);
        if (!found) {
          return res.status(404).json({ 
            status: 'error', 
            message: `Пользователь с контактом "${ssId}" не найден в системе. Пожалуйста, зайдите по ссылке на таблицу.` 
          });
        }
        resolvedSsId = found;
        console.log(`[Auth] login-verify resolved ssId: ${resolvedSsId.substring(0, 12)}...`);
      }

      // Verify challenge token
      const clientChallenge = loginResponse.response.clientDataJSON 
        ? JSON.parse(Buffer.from(loginResponse.response.clientDataJSON, 'base64').toString('utf8')).challenge
        : '';
        
      if (!verifyChallengeToken(challengeToken, clientChallenge)) {
        return res.status(400).json({ status: 'error', message: 'Invalid or expired challenge token' });
      }

      // Fetch public key & credential info from user's Google Sheet
      const sheets = await getSheetsClient();
      let rows: any[][] = [];
      try {
        const confRes = await sheets.spreadsheets.values.get({
          spreadsheetId: resolvedSsId,
          range: 'Configs!A:M'
        });
        rows = confRes.data.values || [];
      } catch (err) {
        return res.status(404).json({ status: 'error', message: 'Google Sheet not found or access denied' });
      }

      // Find keys
      let passkeyCredId = "";
      let passkeyPubKey = "";
      let passkeyCounter = 0;
      let passkeyEnabled = false;

      for (const row of rows) {
        if (!row || !row[0]) continue;
        const k = String(row[0]).trim();
        if (k === "Passkey_Enabled") passkeyEnabled = String(row[1]).trim() === "TRUE";
        if (k === "Passkey_Credential_ID") passkeyCredId = String(row[1]).trim();
        if (k === "Passkey_Public_Key") passkeyPubKey = String(row[1]).trim();
        if (k === "Passkey_Counter") passkeyCounter = parseInt(row[1], 10) || 0;
      }

      if (!passkeyEnabled || !passkeyCredId || !passkeyPubKey) {
        return res.status(400).json({ status: 'error', message: 'Passkey is not enabled/configured for this spreadsheet' });
      }

      // Verify that the login credentialID matches what we have stored
      if (loginResponse.id !== passkeyCredId && bufferToBase64url(base64urlToBuffer(loginResponse.id)) !== passkeyCredId) {
        return res.status(400).json({ status: 'error', message: 'Credential ID mismatch' });
      }

      // Verify assertion response
      const verification = await verifyAuthenticationResponse({
        response: loginResponse,
        expectedChallenge: clientChallenge,
        expectedOrigin: [`https://${rpId}`, `http://${rpId}`, `https://coinlover.ru`, `https://coin.reloto.ru`],
        expectedRPID: rpId,
        requireUserVerification: true,
        credential: {
          id: passkeyCredId,
          publicKey: base64urlToBuffer(passkeyPubKey),
          counter: passkeyCounter
        }
      });

      if (!verification.verified) {
        return res.status(400).json({ status: 'error', message: 'WebAuthn signature verification failed' });
      }

      // Update the counter in Google Sheets to prevent replay attacks
      const updatedRows = [...rows];
      const counterIdx = updatedRows.findIndex(r => r && r[0] && String(r[0]).trim() === "Passkey_Counter");
      const newCounter = verification.authenticationInfo.newCounter;
      if (counterIdx !== -1) {
        updatedRows[counterIdx] = ["Passkey_Counter", String(newCounter)];
      } else {
        updatedRows.push(["Passkey_Counter", String(newCounter)]);
      }

      // Save back counter
      await sheets.spreadsheets.values.clear({
        spreadsheetId: resolvedSsId,
        range: 'Configs!A1:Z500'
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: resolvedSsId,
        range: 'Configs!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: updatedRows }
      });

      return res.status(200).json({ 
        status: 'success', 
        verified: true,
        ssId: resolvedSsId 
      });
    }

    return res.status(404).json({ status: 'error', message: 'Not Found' });
  } catch (err) {
    console.error('[Auth API] Error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
