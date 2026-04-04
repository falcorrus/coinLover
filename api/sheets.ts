import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const MASTER_SS_ID = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M";

let authClient: any = null;
let sheetsClient: any = null;

function parseNum(v: any) {
  if (v === undefined || v === null || v === "") return 0;
  const s = String(v).replace(/[^\d.-]/g, '');
  return parseFloat(s) || 0;
}

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
    console.error("[API] Missing Google credentials. ENV or google-credentials.json required.");
    return null;
  }

  authClient = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  sheetsClient = google.sheets({ version: 'v4', auth: authClient });
  return sheetsClient;
}

async function updateConfigs(sheets, spreadsheetId, sheetName, payload) {
  try {
    // Recreate the managed parts
    const ts = payload.timestamp || new Date().toISOString();
    const baseCurrency = payload.baseCurrency || "USD";
    
    const rows: any[][] = [];
    const pushRow = (arr: any[]) => {
      const fixedRow = new Array(13).fill("");
      arr.forEach((v, idx) => fixedRow[idx] = v);
      rows.push(fixedRow);
    };

    pushRow(["Updated", ts]);
    pushRow(["BASE_CURRENCY", baseCurrency]);
    pushRow(["", ""]);
    pushRow([" === WALLETS / ACCOUNTS ===", ""]);
    pushRow(["ID", "Name", "Balance", "Balance_Base", "Color", "Icon", "Currency"]);
    
    if (payload.accounts) {
      payload.accounts.forEach(a => {
        pushRow([a.id, a.name, a.balance, a.balanceUSD || a.balance, a.color, a.icon, a.currency || "USD"]);
      });
    }

    pushRow(["", ""]);
    pushRow([" === CATEGORIES ===", ""]);
    pushRow(["ID", "Name", "Color", "Icon", "Tags"]);
    
    if (payload.categories) {
      payload.categories.forEach(c => {
        pushRow([c.id, c.name, c.color, c.icon, Array.isArray(c.tags) ? c.tags.join(", ") : (c.tags || "")]);
      });
    }

    pushRow(["", ""]);
    pushRow([" === INCOMES ===", ""]);
    pushRow(["ID", "Name", "Color", "Icon", "Tags"]);
    
    if (payload.incomes) {
      payload.incomes.forEach(i => {
        pushRow([i.id, i.name, i.color, i.icon, Array.isArray(i.tags) ? i.tags.join(", ") : (i.tags || "")]);
      });
    }

    pushRow(["", ""]);
    pushRow([" === SYSTEM ===", ""]);

    // Clear and update
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A1:Z500`
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    });
    
    console.log(`[API] Successfully synced ${rows.length} rows to ${sheetName}`);
  } catch (e) {
    console.error("[API] Failed to update configs:", e.message);
  }
}

async function initSheets(sheets, spreadsheetId, baseCurrency = "USD") {
  try {
    const configSheet = "Configs";
    const txSheet = "Transactions";
    
    const ss = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = ss.data.sheets.map(s => s.properties.title);

    const requests = [];
    if (!sheetNames.includes(configSheet)) {
      requests.push({ addSheet: { properties: { title: configSheet } } });
    }
    if (!sheetNames.includes(txSheet)) {
      requests.push({ addSheet: { properties: { title: txSheet } } });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
      // Give Google a moment to index new sheets
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const configRows = [
      ["Updated", new Date().toISOString()],
      ["BASE_CURRENCY", baseCurrency],
      ["", ""],
      [" === WALLETS / ACCOUNTS ===", ""],
      ["ID", "Name", "Balance", "Balance_Base", "Color", "Icon", "Currency"],
      ["", ""],
      [" === CATEGORIES ===", ""],
      ["ID", "Name", "Color", "Icon", "Tags"],
      ["", ""],
      [" === INCOMES ===", ""],
      ["ID", "Name", "Color", "Icon", "Tags"],
      ["", ""],
      [" === SYSTEM ===", ""]
    ];

    const txRows = [
      ["date", "type", "src", "dst", "tag", "s_amt", "s_curr", "t_amt", "t_curr", "base_amt", "comment", "id"],
      ["Дата", "Тип", "Источник", "Назначение", "Тег", "Сумма (исх)", "Вал (исх)", "Сумма (цель)", "Вал (цель)", "USD", "Комментарий", "ID"]
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${configSheet}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: configRows }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${txSheet}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: txRows }
    });

    // Formatting: Hide technical row 1 and freeze headers (row 1-2)
    try {
      const sheetsMeta = ss.data.sheets || [];
      const txSheetId = sheetsMeta.find(s => s.properties.title === txSheet)?.properties.sheetId;
      
      if (txSheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                updateDimensionProperties: {
                  range: { sheetId: txSheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
                  properties: { hiddenByUser: true },
                  fields: "hiddenByUser"
                }
              },
              {
                updateSheetProperties: {
                  properties: { sheetId: txSheetId, gridProperties: { frozenRowCount: 2 } },
                  fields: "gridProperties.frozenRowCount"
                }
              }
            ]
          }
        });
      }
    } catch (fmtError) {
      console.warn("[API] Failed to apply formatting:", fmtError.message);
    }

    return true;
  } catch (e) {
    console.error("[API] Failed to init table:", e.message);
    throw e;
  }
}

async function registerLeadInMaster(sheets, payload) {
  try {
    const sheetUrl = payload.sheetUrl || "";
    const ssId = payload.ssId || (sheetUrl.match(/[-\w]{25,}/) ? sheetUrl.match(/[-\w]{25,}/)[0] : "");
    const userSheet = "Users";

    // 1. Ensure Users sheet exists
    const ss = await sheets.spreadsheets.get({ spreadsheetId: MASTER_SS_ID });
    const sheetNames = ss.data.sheets.map(s => s.properties.title);
    if (!sheetNames.includes(userSheet)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: MASTER_SS_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: userSheet } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: MASTER_SS_ID,
        range: `${userSheet}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [["Name", "Contact", "ID", "LinkApp", "LinkSheet", "Access Ends"]] }
      });
    }

    // 2. Check if user already exists to avoid duplicates
    const existingRes = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SS_ID,
      range: `${userSheet}!A:C`
    });
    const existingRows = existingRes.data.values || [];
    const userExists = existingRows.some(row => row[2] === ssId);
    
    if (userExists) {
      console.log(`[API] User ${ssId} already registered. Skipping append.`);
      return true;
    }

    // 3. Prepare data
    const accessEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU'); 
    const linkApp = `https://coinlover.ru/?ssId=${ssId}`;
    const linkSheet = sheetUrl || `https://docs.google.com/spreadsheets/d/${ssId}`;

    const newRow = [
      payload.name || "New User",
      payload.contact || "",
      ssId,
      linkApp,
      linkSheet,
      accessEnds
    ];

    // 4. Append to Users sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: MASTER_SS_ID,
      range: `${userSheet}!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] }
    });

    return true;
  } catch (e) {
    console.error("[API] Failed to register lead:", e.message);
    return false;
  }
}

export default async function handler(req, res) {
  console.log(`[API] ${req.method} ${req.url}`);
  const sheets = await getSheetsClient();

  if (!sheets) {
    return res.status(500).json({ 
      status: "error", 
      message: "Server configuration error: Google credentials missing or invalid." 
    });
  }
  const { method, query, body } = req;
  const ssId = query.ssId || (body && body.ssId);

  try {
    // Check access in MASTER SS / Users sheet
    if (ssId && ssId !== MASTER_SS_ID) {
      const cleanSsId = String(ssId).trim();
      try {
        const masterRes = await sheets.spreadsheets.values.get({
          spreadsheetId: MASTER_SS_ID,
          range: 'Users!A:F'
        });
        const mRows = masterRes.data.values || [];
        if (mRows.length > 0) {
          // If first row is a section header like "=== USERS ===", take the next row as headers
          let headerRowIdx = 0;
          if (String(mRows[0][0] || "").toLowerCase().includes("users") && mRows[1]) {
            headerRowIdx = 1;
          }

          const headers = mRows[headerRowIdx].map(h => String(h).trim().toLowerCase());
          console.log(`[API] Users Sheet Headers (from row ${headerRowIdx + 1}): ${JSON.stringify(headers)}`);
          
          const idIdx = headers.indexOf("id");
          const accessIdx = headers.indexOf("access ends");
          
          let accessValid = true;
          let accessEndsDate = null;
          let found = false;

          const dataStartIdx = headerRowIdx + 1;
          for (let i = dataStartIdx; i < mRows.length; i++) {
            const rowId = String(mRows[i][idIdx] || "").trim();
            if (rowId) console.log(`[API] Comparing: '${cleanSsId}' with '${rowId}'`);
            if (rowId === cleanSsId) {
              found = true;
              if (accessIdx !== -1 && mRows[i][accessIdx]) {
                accessEndsDate = String(mRows[i][accessIdx]).trim();
                let d = new Date(accessEndsDate); // Try native ISO first
                
                if (isNaN(d.getTime())) {
                  // Try DD.MM.YYYY or DD.MM.YY
                  const parts = accessEndsDate.split(/[./-]/).map(p => p.trim());
                  if (parts.length >= 3) {
                    let year = parts[2];
                    if (year.length === 2) year = "20" + year; // Convert YY to 20YY
                    d = new Date(`${year}-${parts[1]}-${parts[0]}T23:59:59`);
                  }
                }

                if (!isNaN(d.getTime())) {
                  const now = new Date();
                  if (d < now) accessValid = false;
                  console.log(`[API] Access check for ${cleanSsId}: Found. Expiry: ${d.toISOString()}, Valid: ${accessValid}`);
                }
              }
              break;
            }
          }

          if (found && !accessValid) {
            console.warn(`[API] Access DENIED for ${cleanSsId}. Subscription expired on ${accessEndsDate}`);
            return res.status(403).json({ 
              status: "error", 
              error: "access_expired", 
              message: `Подписка истекла (${accessEndsDate}). Пожалуйста, продлите доступ.` 
            });
          }
          if (!found) {
            console.log(`[API] ssId ${cleanSsId} not found in Users list. Allowing by default.`);
          }
        }
      } catch (e) {
        console.error("[API] Access check failed:", e.message);
      }
    }

    if (method === 'GET') {
      const isDemo = query.demo === 'true';
      const targetSsId = ssId || MASTER_SS_ID; 
      const configSheetName = isDemo ? "Configs-demo" : "Configs";
      const txSheetName = isDemo ? "Transactions-demo" : "Transactions";

      if (query.action === 'template') {
        const data = {
          accounts: [
            { id: "acc-cash", name: "Наличные", balance: 0, currency: "RUB", color: "#10b981", icon: "wallet" },
            { id: "acc-card", name: "Карта", balance: 0, currency: "RUB", color: "#3b82f6", icon: "credit-card" }
          ],
          categories: [
            { id: "cat-food", name: "Еда", color: "#f59e0b", icon: "utensils", tags: ["продукты", "супермаркет"] },
            { id: "cat-transport", name: "Транспорт", color: "#3b82f6", icon: "car", tags: ["такси", "бензин"] },
            { id: "cat-home", name: "Жилье", color: "#ef4444", icon: "home", tags: ["аренда", "коммуналка"] },
            { id: "cat-fun", name: "Развлечения", color: "#ec4899", icon: "film", tags: ["кино", "бар"] }
          ],
          incomes: [
            { id: "inc-salary", name: "Зарплата", color: "#10b981", icon: "briefcase", tags: ["основная"] },
            { id: "inc-gift", name: "Подарки", color: "#8b5cf6", icon: "gift", tags: ["день рождения"] }
          ]
        };
        return res.status(200).json({ status: "success", data });
      }

      // Fetch Configs
      let rows = [];
      try {
        const confRes = await sheets.spreadsheets.values.get({
          spreadsheetId: targetSsId,
          range: `${configSheetName}!A:M`
        });
        rows = confRes.data.values || [];
      } catch (e) {
        console.warn(`[API] Config sheet not found in ${targetSsId}.`);
        return res.status(200).json({ status: "success", data: { accounts: [], categories: [], incomes: [], transactions: [], baseCurrency: "USD" } });
      }
      
      const data: any = { accounts: [], categories: [], incomes: [], transactions: [], baseCurrency: "USD" };
      let section = "";
      let sectionHeaderIdx = -1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        const key = String(row[0]).trim().toLowerCase();
        
        if (key.includes("updated")) { data.timestamp = row[1]; continue; }
        if (key.includes("base_currency")) { data.baseCurrency = String(row[1]).trim() || "USD"; continue; }
        if (key.includes("wallets") || key.includes("accounts")) { section = "acc"; sectionHeaderIdx = i + 1; continue; }
        if (key.includes("categories")) { section = "cat"; sectionHeaderIdx = i + 1; continue; }
        if (key.includes("incomes")) { section = "inc"; sectionHeaderIdx = i + 1; continue; }
        if (key.startsWith("===")) { section = ""; sectionHeaderIdx = -1; continue; }
        
        if (sectionHeaderIdx === -1 || i <= sectionHeaderIdx) continue;

        const hRow = rows[sectionHeaderIdx] || [];
        const col: any = {};
        hRow.forEach((v, idx) => { if(v) col[String(v).trim().toLowerCase()] = idx; });

        const getIdx = (keys: string[]) => {
          for (const k of keys) if (col[k] !== undefined) return col[k];
          return -1;
        };

        const uId = getIdx(["id", "идентификатор", "айди"]), 
              uName = getIdx(["name", "имя", "название", "кошелек", "категория", "источник"]), 
              uColor = getIdx(["color", "цвет"]),
              uIcon = getIdx(["icon", "иконка"]), 
              uTags = getIdx(["tags", "теги", "метки"]), 
              uBal = getIdx(["balance", "баланс", "остаток"]),
              uBalBase = getIdx(["balance_base", "usd", "база", "баланс (база)"]), 
              uCurr = getIdx(["currency", "валюта", "вал"]);

        const val = (idx: number, def = "") => (idx !== -1 && row[idx] !== undefined) ? String(row[idx]).trim() : def;
        const num = (idx: number) => {
          if (idx === -1 || row[idx] === undefined) return 0;
          return parseNum(row[idx]);
        };

        const id = val(uId);
        if (!id || id.toLowerCase() === "id") continue;

        if (section === "acc") {
          const accCurr = val(uCurr) || data.baseCurrency || "USD";
          data.accounts.push({ 
            id, 
            name: val(uName, "Кошелек"), 
            balance: num(uBal), 
            balanceUSD: num(uBalBase) || num(uBal), 
            color: val(uColor, "#ccc"), 
            icon: val(uIcon, "wallet"), 
            currency: accCurr 
          });
        } else if (section === "cat" || section === "inc") {
          const entity = { id, name: val(uName, "Без имени"), color: val(uColor, "#ccc"), icon: val(uIcon, section === "cat" ? "tag" : "business"), tags: val(uTags) ? val(uTags).split(",").map(t => t.trim()).filter(Boolean) : [] };
          if (section === "cat") data.categories.push(entity); else data.incomes.push(entity);
        }
      }

      // Fetch Transactions
      try {
        const txRes = await sheets.spreadsheets.values.get({ spreadsheetId: targetSsId, range: `${txSheetName}!A:L` });
        const txRows = txRes.data.values || [];
        if (txRows.length > 1) {
          const headerRow = txRows[0];
          let dataStartIndex = 1;
          if (txRows.length > 1 && String(txRows[1][0]).trim().toLowerCase() === "дата") dataStartIndex = 2;
          
          const headers = headerRow.map(v => String(v || "").trim().toLowerCase());
          const col = {}; headers.forEach((v, i) => col[v] = i);
          
          const findCol = (names: string[]) => {
            for (let n of names) {
              const cleaned = n.toLowerCase().trim();
              if (col[cleaned] !== undefined) return col[cleaned];
            }
            return undefined;
          };

          const c_date = findCol(["date", "дата", "день", "day"]), 
                c_type = findCol(["type", "тип"]), 
                c_src = findCol(["src", "source", "источник", "откуда", "из", "кошелек (исх)"]),
                c_dst = findCol(["dst", "destination", "назначение", "куда", "цель", "категория"]), 
                c_tag = findCol(["tag", "тег", "метка"]), 
                c_s_amt = findCol(["s_amt", "amount", "source_amount", "сумма (исх)", "сумма", "расход", "amount_src"]),
                c_s_curr = findCol(["s_curr", "currency", "source_currency", "валюта (исх)", "валюта", "вал", "curr_src"]), 
                c_s_base = findCol(["s_base", "base_amount", "source_base", "сумма (база)", "usd", "base_amt"]), 
                c_t_amt = findCol(["t_amt", "target_amount", "сумма (цель)", "получено", "amount_dst"]),
                c_t_curr = findCol(["t_curr", "target_currency", "валюта (цель)", "вал (цель)", "curr_dst"]), 
                c_t_base = findCol(["t_base", "target_base", "цель (база)"]), 
                c_comment = findCol(["comment", "комментарий", "примечание", "notes"]), 
                c_id = findCol(["id", "идентификатор", "индентификатор"]);

          if (c_date !== undefined) {
             const accMap = {}; 
             data.accounts.forEach(a => { 
               const aid = String(a.id).trim();
               const aname = String(a.name).trim().toLowerCase();
               accMap[aname] = aid; 
               accMap[aid] = aid; 
             });
             const catMap = {}; data.categories.forEach(c => { catMap[String(c.name).trim().toLowerCase()] = String(c.id).trim(); catMap[String(c.id).trim()] = String(c.id).trim(); });
             const incMap = {}; data.incomes.forEach(i => { incMap[String(i.name).trim().toLowerCase()] = String(i.id).trim(); incMap[String(i.id).trim()] = String(i.id).trim(); });

             for (let i = dataStartIndex; i < txRows.length; i++) {
               const r = txRows[i];
               const dateRaw = r[c_date];
               if (!dateRaw || String(dateRaw).toLowerCase().includes("date") || String(dateRaw).toLowerCase().includes("дата")) continue;
               
               let rawType = String(r[c_type] || "").trim().toLowerCase();
               let type = "expense";
               if (rawType.includes("inc") || rawType.includes("доход")) type = "income";
               else if (rawType.includes("trans") || rawType.includes("перевод")) type = "transfer";
               
               const srcRaw = String(r[c_src] || "").trim();
               const dstRaw = String(r[c_dst] || "").trim();
               const srcKey = srcRaw.toLowerCase();
               const dstKey = dstRaw.toLowerCase();

               let aid = "", tid = "";
               if (type === "expense") { aid = accMap[srcKey] || srcRaw; tid = catMap[dstKey] || dstRaw; }
               else if (type === "income") { aid = accMap[dstKey] || dstRaw; tid = incMap[srcKey] || srcRaw; }
               else if (type === "transfer") { aid = accMap[srcKey] || srcRaw; tid = accMap[dstKey] || dstRaw; }

               const s = String(dateRaw).trim();
               let dt = new Date(s);
               
               // If slashes or dots, handle explicitly to avoid native parser issues
               if (s.includes('/') || s.includes('.') || s.includes('-')) {
                 const isISO = s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-';
                 if (isISO) {
                   dt = new Date(s);
                 } else if (s.includes('/')) {
                   const p = s.split(/[ /:]/);
                   if (p.length >= 3) {
                     let day, month, year;
                     const v1 = parseInt(p[0]); const v2 = parseInt(p[1]); const v3 = parseInt(p[2]);
                     if (v1 > 12) { day = v1; month = v2 - 1; }
                     else if (v2 > 12) { month = v1 - 1; day = v2; }
                     else { day = v1; month = v2 - 1; } // Prefer D/M/Y
                     year = v3 < 100 ? 2000 + v3 : v3;
                     const hour = p[3] ? parseInt(p[3]) : 12;
                     const min = p[4] ? parseInt(p[4]) : 0;
                     dt = new Date(year, month, day, hour, min, 0);
                   }
                 } else {
                   // Dots or Dashes (DD.MM.YYYY)
                   const p = s.split(/[.-]/);
                   if (p.length >= 3) {
                     let day = parseInt(p[0]); let month = parseInt(p[1]) - 1; let year = parseInt(p[2]);
                     if (year < 100) year += 2000;
                     dt = new Date(year, month, day, 12, 0, 0);
                   }
                 }
               }
               
               if (isNaN(dt.getTime())) continue;

               const sCurr = String(c_s_curr !== undefined && r[c_s_curr] !== undefined && r[c_s_curr] !== "" ? r[c_s_curr] : (accMap[srcKey] ? data.accounts.find(a => a.id === accMap[srcKey])?.currency : "") || data.baseCurrency || "USD");
               const tCurr = String(c_t_curr !== undefined && r[c_t_curr] !== undefined && r[c_t_curr] !== "" ? r[c_t_curr] : sCurr);

               data.transactions.push({
                 id: String(c_id !== undefined ? r[c_id] : i), type, accountId: aid, targetId: tid,
                 sourceAmount: parseNum(r[c_s_amt]), sourceCurrency: sCurr,
                 sourceAmountUSD: parseNum(r[c_s_base]), targetAmount: parseNum(c_t_amt !== undefined ? r[c_t_amt] : r[c_s_amt]),
                 targetCurrency: tCurr, targetAmountUSD: parseNum(c_t_base !== undefined ? r[c_t_base] : r[c_s_base]),
                 date: dt.toISOString(), tag: c_tag !== undefined ? String(r[c_tag]) : undefined, comment: c_comment !== undefined ? String(r[c_comment]) : undefined
               });
             }
          }
        }
      } catch (e) { console.error("Failed to parse transactions", e); }

      return res.status(200).json({ status: "success", data });
    }

    if (method === 'POST') {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const targetSsId = payload.ssId || (payload.sheetUrl && payload.sheetUrl.match(/[-\w]{25,}/) ? payload.sheetUrl.match(/[-\w]{25,}/)[0] : MASTER_SS_ID);
      const isDemo = payload.demo === true;
      const configSheetName = isDemo ? "Configs-demo" : "Configs";
      const txSheetName = isDemo ? "Transactions-demo" : "Transactions";
      
      console.log(`[API] POST Action: ${payload.action} on SS: ${targetSsId}`);

      if (payload.action === 'registerLead') {
        const ok = await registerLeadInMaster(sheets, payload);
        return res.status(200).json({ status: ok ? "success" : "error", message: ok ? "Lead registered" : "Registration failed" });
      }

      if (payload.action === 'initTable') {
        let initOk = false;
        let initError = "";
        try {
          await initSheets(sheets, targetSsId, payload.baseCurrency || "USD");
          initOk = true;
        } catch (e) {
          console.error("[API] initSheets failed:", e.message);
          initError = e.message;
        }
        await registerLeadInMaster(sheets, { ...payload, ssId: targetSsId, name: payload.name || "New App User", type: "app_init" });
        if (!initOk) {
          return res.status(403).json({ status: "error", message: `Не удалось подготовить таблицу: ${initError}. Добавьте coinlover-service-acc@baonlineru.iam.gserviceaccount.com как Редактора.` });
        }
        return res.status(200).json({ status: "success", message: "Table initialized" });
      }

      if (payload.action === 'addTransaction' || payload.action === 'updateTransaction' || payload.action === 'syncSettings') {
        if (payload.action === 'addTransaction' || payload.action === 'updateTransaction') {
          const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: targetSsId, range: `${txSheetName}!A1:Z1` });
          const headers = (headerRes.data.values?.[0] || []).map(h => String(h).trim().toLowerCase());
          const dataMap = { 
            "date": payload.date, 
            "type": payload.type, 
            "src": payload.sourceName, 
            "dst": payload.destinationName, 
            "tag": payload.tagName || "", 
            "s_amt": payload.sourceAmount, 
            "s_curr": payload.sourceCurrency, 
            "t_amt": payload.targetAmount || payload.sourceAmount, 
            "t_curr": payload.targetCurrency || payload.sourceCurrency, 
            "base_amt": payload.targetAmountUSD !== undefined && payload.targetAmountUSD !== 0 ? payload.targetAmountUSD : (payload.sourceAmountUSD || 0), 
            "comment": payload.comment || "", 
            "id": payload.id 
          };
          const row = new Array(Math.max(headers.length, 12)).fill("");
          headers.forEach((h, idx) => { if (dataMap[h] !== undefined) row[idx] = dataMap[h]; });

          if (payload.action === 'addTransaction') {
            await sheets.spreadsheets.values.append({ 
              spreadsheetId: targetSsId, 
              range: `${txSheetName}!A:Z`, 
              valueInputOption: 'USER_ENTERED', 
              requestBody: { values: [row] } 
            });
          } else {
            // updateTransaction: find row by ID
            const allRes = await sheets.spreadsheets.values.get({ spreadsheetId: targetSsId, range: `${txSheetName}!A:Z` });
            const allRows = allRes.data.values || [];
            const idColIdx = headers.indexOf("id");
            if (idColIdx !== -1) {
              const rIdx = allRows.findIndex(r => String(r[idColIdx]) === String(payload.id));
              if (rIdx !== -1) {
                await sheets.spreadsheets.values.update({
                  spreadsheetId: targetSsId,
                  range: `${txSheetName}!A${rIdx + 1}`,
                  valueInputOption: 'USER_ENTERED',
                  requestBody: { values: [row] }
                });
              }
            }
          }
        }
        if (payload.accounts) await updateConfigs(sheets, targetSsId, configSheetName, payload);
        return res.status(200).json({ status: "success" });
      }

      if (payload.action === 'deleteTransaction') {
        const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: targetSsId, range: `${txSheetName}!A1:Z1` });
        const headers = (headerRes.data.values?.[0] || []).map(h => String(h).trim().toLowerCase());
        const idColIdx = headers.indexOf("id");
        
        if (idColIdx !== -1) {
          const allRes = await sheets.spreadsheets.values.get({ spreadsheetId: targetSsId, range: `${txSheetName}!A:Z` });
          const allRows = allRes.data.values || [];
          const rIdx = allRows.findIndex(r => String(r[idColIdx]) === String(payload.id));
          
          if (rIdx !== -1) {
            const ss = await sheets.spreadsheets.get({ spreadsheetId: targetSsId });
            const sheetId = ss.data.sheets.find(s => s.properties.title === txSheetName)?.properties.sheetId;
            
            if (sheetId !== undefined) {
              await sheets.spreadsheets.batchUpdate({
                spreadsheetId: targetSsId,
                requestBody: {
                  requests: [{
                    deleteDimension: {
                      range: {
                        sheetId: sheetId,
                        dimension: "ROWS",
                        startIndex: rIdx,
                        endIndex: rIdx + 1
                      }
                    }
                  }]
                }
              });
            }
          }
        }
        if (payload.accounts) await updateConfigs(sheets, targetSsId, configSheetName, payload);
        return res.status(200).json({ status: "success" });
      }
      return res.status(200).json({ status: "success", message: `Action ${payload.action} handled` });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
}
