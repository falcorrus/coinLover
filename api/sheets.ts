import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const MASTER_SS_ID = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M";

let authClient: any = null;
let sheetsClient: any = null;

function parseNum(val, fallback = 0) {
  if (val === undefined || val === null || val === "") return fallback;
  const n = parseFloat(String(val).replace(',', '.').replace(/\s/g, ''));
  return isNaN(n) ? fallback : n;
}

// Use a function to get or create the sheets client
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  // Fallback for local development
  if (!clientEmail || !privateKey) {
    try {
      const credsPath = path.join(process.cwd(), 'google-credentials.json');
      if (fs.existsSync(credsPath)) {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        clientEmail = creds.client_email;
        privateKey = creds.private_key;
        console.log("[API] Loaded credentials from google-credentials.json fallback.");
      }
    } catch (e) {
      console.error("[API] Error loading fallback credentials:", e.message);
    }
  }
  
  // Remove quotes if present
  const cleanEmail = (clientEmail || '').replace(/^"(.*)"$/, '$1');
  const cleanKey = (privateKey || '').replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n');

  if (!cleanEmail || !cleanKey) {
    console.error("[API] Missing Google credentials. ENV or google-credentials.json required.");
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: cleanEmail,
        private_key: cleanKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    // @ts-ignore - Google API types can be tricky
    sheetsClient = google.sheets({ version: 'v4', auth: client });
    return sheetsClient;
  } catch (err) {
    console.error("[API] Failed to initialize Google Sheets client:", err.message);
    return null;
  }
}

async function updateConfigs(sheets, spreadsheetId, sheetName, payload) {
  try {
    // 1. Fetch existing content to preserve non-managed sections (like USERS)
    const existingRes = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range: `${sheetName}!A:Z` 
    });
    const existingRows = existingRes.data.values || [];
    
    let preservedUsersSection: any[][] = [];
    let inUsersSection = false;
    for (const row of existingRows) {
      const val0 = String(row[0] || "").toLowerCase();
      if (val0.includes("users")) inUsersSection = true;
      if (inUsersSection) preservedUsersSection.push(row);
    }

    // 2. Recreate the managed parts
    const ts = payload.timestamp || new Date().toISOString();
    const baseCurrency = payload.baseCurrency || "USD";
    
    const rows: any[][] = [];
    const pushRow = (arr: any[]) => {
      const fixedRow = new Array(Math.max(arr.length, 13)).fill("");
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

    // 3. Append the preserved USERS section if it existed
    if (preservedUsersSection.length > 0) {
      pushRow(["", ""]);
      preservedUsersSection.forEach(r => rows.push(r));
    }

    // 4. Clear and update
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A1:Z1000`
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    });
    
    console.log(`[API] Successfully synced ${rows.length} rows to ${sheetName} (Preserved ${preservedUsersSection.length} user rows)`);
  } catch (e) {
    console.error("[API] Failed to update configs:", e.message);
  }
}

async function initSheets(sheets, spreadsheetId) {
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
      ["BASE_CURRENCY", "USD"],
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

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SS_ID,
      range: 'Configs!A:K'
    });
    const rows = res.data.values || [];

    let userSectionIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] && String(rows[i][0]).toLowerCase().includes("users")) {
        userSectionIdx = i;
        break;
      }
    }

    if (userSectionIdx === -1) {
      console.error("[API] USERS section not found in Master Sheet");
      return false;
    }

    // Correct order: Name | Contact | ID | LinkApp | LinkSheet | Access Ends
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

    await sheets.spreadsheets.values.append({
      spreadsheetId: MASTER_SS_ID,
      range: `Configs!A${userSectionIdx + 3}`,
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
    // ... (Master sheet check logic remains same)

    if (ssId && ssId !== MASTER_SS_ID) {
      console.log(`[API] Checking access for ssId: ${ssId}`);
      try {
        const masterRes = await sheets.spreadsheets.values.get({
          spreadsheetId: MASTER_SS_ID,
          range: 'Configs!A:K'
        });
        const mRows = masterRes.data.values || [];
        let userSection = false;
        let accessValid = true;
        let accessEndsDate = null;
        let idColIndex = -1;
        let accessColIndex = -1;

        for (let i = 0; i < mRows.length; i++) {
          const row = mRows[i];
          if (!row || !row[0]) continue;
          const val0 = String(row[0]).trim().toLowerCase();
          
          if (val0.includes("users")) {
            userSection = true;
            const headers = mRows[i+1] || [];
            idColIndex = headers.findIndex(h => String(h).trim().toLowerCase() === "id");
            accessColIndex = headers.findIndex(h => String(h).trim().toLowerCase() === "access ends");
            i++; 
            continue;
          }

          if (userSection && idColIndex !== -1) {
            const rowId = row[idColIndex];
            if (rowId === ssId) {
               if (accessColIndex !== -1 && row[accessColIndex]) {
                 accessEndsDate = row[accessColIndex];
                 const parts = accessEndsDate.split(/[./-]/);
                 if (parts.length >= 3) {
                   const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T23:59:59`);
                   if (!isNaN(d.getTime()) && d < new Date()) {
                     accessValid = false; 
                   }
                 }
               }
               break;
            }
          }
        }

        if (!accessValid) {
          return res.status(403).json({ 
            status: "error", 
            error: "access_expired", 
            message: `Подписка истекла (${accessEndsDate}). Пожалуйста, продлите доступ.` 
          });
        }
      } catch (e) {
        console.error("[API] Master sheet check failed:", e.message);
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

      // Fetch Configs with better error handling
      let rows = [];
      try {
        const confRes = await sheets.spreadsheets.values.get({
          spreadsheetId: targetSsId,
          range: `${configSheetName}!A:M`
        });
        rows = confRes.data.values || [];
      } catch (e) {
        console.warn(`[API] Config sheet not found in ${targetSsId}. Returning empty defaults.`);
        return res.status(200).json({ 
          status: "success", 
          data: { accounts: [], categories: [], incomes: [], transactions: [], baseCurrency: "USD" } 
        });
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

        // Dynamic header mapping for this section
        const hRow = rows[sectionHeaderIdx] || [];
        const col: any = {};
        hRow.forEach((v, idx) => { if(v) col[String(v).trim().toLowerCase()] = idx; });

        // Utility to find column by multiple possible names
        const getIdx = (keys: string[]) => {
          for (const k of keys) if (col[k] !== undefined) return col[k];
          return -1;
        };

        const uId = getIdx(["id"]);
        const uName = getIdx(["name", "имя", "название"]);
        const uColor = getIdx(["color", "цвет"]);
        const uIcon = getIdx(["icon", "иконка"]);
        const uTags = getIdx(["tags", "теги"]);
        const uBal = getIdx(["balance", "баланс", "остаток", "сумма"]);
        const uBalBase = getIdx(["balance_base", "баланс (база)", "usd", "баланс usd"]);
        const uCurr = getIdx(["currency", "валюта"]);

        const val = (idx: number, def = "") => (idx !== -1 && row[idx] !== undefined) ? String(row[idx]).trim() : def;
        const num = (idx: number) => {
          if (idx === -1 || row[idx] === undefined) return 0;
          const clean = String(row[idx]).replace(/[^\d.-]/g, "");
          return parseFloat(clean) || 0;
        };

        const id = val(uId);
        if (!id || id.toLowerCase() === "id") continue;

        if (section === "acc") {
          data.accounts.push({
            id,
            name: val(uName, "Кошелек"),
            balance: num(uBal),
            balanceUSD: num(uBalBase) || num(uBal),
            color: val(uColor, "#ccc"),
            icon: val(uIcon, "wallet"),
            currency: val(uCurr, "USD")
          });
        } else if (section === "cat" || section === "inc") {
          const entity = {
            id,
            name: val(uName, "Без имени"),
            color: val(uColor, "#ccc"),
            icon: val(uIcon, section === "cat" ? "tag" : "business"),
            tags: val(uTags) ? val(uTags).split(",").map(t => t.trim()).filter(Boolean) : []
          };
          if (section === "cat") data.categories.push(entity);
          else data.incomes.push(entity);
        }
      }

      // Fetch Transactions
      try {
        const txRes = await sheets.spreadsheets.values.get({
          spreadsheetId: targetSsId,
          range: `${txSheetName}!A:L`
        });
        const txRows = txRes.data.values || [];
        if (txRows.length > 1) {
          const headerRow = txRows[0];
          let dataStartIndex = 1;
          if (txRows.length > 1 && String(txRows[1][0]).trim().toLowerCase() === "дата") {
            dataStartIndex = 2;
          }
          const headers = headerRow.map(v => String(v).trim().toLowerCase());
          const col = {}; headers.forEach((v, i) => col[v] = i);
          
          const findCol = (names) => {
            for (let n of names) if (col[n.toLowerCase()] !== undefined) return col[n.toLowerCase()];
            return undefined;
          };

          const c_date = findCol(["date", "дата", "день"]);
          const c_type = findCol(["type", "тип"]);
          const c_src = findCol(["src", "source", "источник", "откуда", "из"]);
          const c_dst = findCol(["dst", "destination", "назначение", "куда", "цель"]);
          const c_tag = findCol(["tag", "тег", "метка"]);
          const c_s_amt = findCol(["s_amt", "source_amount", "amount", "сумма (исх)", "сумма", "расход"]);
          const c_s_curr = findCol(["s_curr", "source_currency", "currency", "валюта (исх)", "валюта"]);
          const c_s_base = findCol(["s_base", "source_base", "сумма (база)", "base_amount"]);
          const c_t_amt = findCol(["t_amt", "target_amount", "сумма (цель)", "получено"]);
          const c_t_curr = findCol(["t_curr", "target_currency", "валюта (цель)"]);
          const c_t_base = findCol(["t_base", "target_base", "цель (база)"]);
          const c_comment = findCol(["comment", "примечание", "комментарий", "коментарий"]);
          const c_id = findCol(["id", "идентификатор"]);

          if (c_date !== undefined) {
             const accMap = {}; data.accounts.forEach(a => { accMap[a.name] = a.id; accMap[a.id] = a.id; });
             const catMap = {}; data.categories.forEach(c => { catMap[c.name] = c.id; catMap[c.id] = c.id; });
             const incMap = {}; data.incomes.forEach(i => { incMap[i.name] = i.id; incMap[i.id] = i.id; });

             for (let i = dataStartIndex; i < txRows.length; i++) {
               const r = txRows[i];
               const dateRaw = r[c_date];
               if (!dateRaw || String(dateRaw).toLowerCase().includes("date") || String(dateRaw).toLowerCase().includes("дата")) continue;
               
               let rawType = String(r[c_type] || "").trim().toLowerCase();
               let type = "expense";
               if (rawType.includes("inc") || rawType.includes("доход") || rawType.includes("приход") || rawType === "in") type = "income";
               else if (rawType.includes("trans") || rawType.includes("перевод")) type = "transfer";
               
               const srcRaw = String(r[c_src] || "").trim();
               const dstRaw = String(r[c_dst] || "").trim();
               
               let aid = "", tid = "";
               if (type === "expense") { aid = accMap[srcRaw] || srcRaw; tid = catMap[dstRaw] || dstRaw; }
               else if (type === "income") { aid = accMap[dstRaw] || dstRaw; tid = incMap[srcRaw] || srcRaw; }
               else if (type === "transfer") { aid = accMap[srcRaw] || srcRaw; tid = accMap[dstRaw] || dstRaw; }

               let dtStr = String(dateRaw).trim().replace(/-/g, '/');
               if (dtStr.includes('.')) {
                 const p = dtStr.split('.');
                 if (p.length === 3) {
                   let year = parseInt(p[2]);
                   if (year < 100) year += 2000;
                   dtStr = `${year}-${p[1]}-${p[0]}T12:00:00`;
                 }
               }
               const dt = new Date(dtStr);
               if (isNaN(dt.getTime())) continue;

               data.transactions.push({
                 id: String(c_id !== undefined ? r[c_id] : i),
                 type,
                 accountId: aid,
                 targetId: tid,
                 sourceAmount: parseNum(r[c_s_amt]),
                 sourceCurrency: String(c_s_curr !== undefined ? r[c_s_curr] : "USD"),
                 sourceAmountUSD: parseNum(r[c_s_base]),
                 targetAmount: parseNum(c_t_amt !== undefined ? r[c_t_amt] : r[c_s_amt]),
                 targetCurrency: String(c_t_curr !== undefined ? r[c_t_curr] : "USD"),
                 targetAmountUSD: parseNum(c_t_base !== undefined ? r[c_t_base] : r[c_s_base]),
                 date: dt.toISOString(),
                 tag: c_tag !== undefined ? String(r[c_tag]) : undefined,
                 comment: c_comment !== undefined ? String(r[c_comment]) : undefined
               });
             }
          }
        }
      } catch (e) {
        console.error("Failed to parse transactions", e);
      }

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
        await initSheets(sheets, targetSsId);
        // Also try to register if not already there
        await registerLeadInMaster(sheets, { ...payload, ssId: targetSsId, name: "New App User", type: "app_init" });
        return res.status(200).json({ status: "success", message: "Table initialized" });
      }

      if (payload.action === 'addTransaction') {
        // Fetch headers first to know where to put data
        const headerRes = await sheets.spreadsheets.values.get({
          spreadsheetId: targetSsId,
          range: `${txSheetName}!A1:Z1`
        });
        const headers = (headerRes.data.values?.[0] || []).map(h => String(h).trim().toLowerCase());
        
        // Define data mapping
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
          "base_amt": payload.targetAmountUSD || payload.sourceAmountUSD || 0,
          "comment": payload.comment || "",
          "id": payload.id
        };

        // Construct row based on headers
        const row = new Array(Math.max(headers.length, 12)).fill("");
        headers.forEach((h, idx) => {
          if (dataMap[h] !== undefined) row[idx] = dataMap[h];
        });

        // If headers are missing (unlikely but possible), fallback to default order
        if (headers.length === 0) {
          console.warn("[API] No headers found, falling back to default order");
          row[0] = payload.date; row[1] = payload.type; row[2] = payload.sourceName;
          row[3] = payload.destinationName; row[4] = payload.tagName || "";
          row[5] = payload.sourceAmount; row[6] = payload.sourceCurrency;
          row[7] = payload.targetAmount || payload.sourceAmount;
          row[8] = payload.targetCurrency || payload.sourceCurrency;
          row[9] = payload.targetAmountUSD || payload.sourceAmountUSD || 0;
          row[10] = payload.comment || ""; row[11] = payload.id;
        }
        
        await sheets.spreadsheets.values.append({
          spreadsheetId: targetSsId,
          range: `${txSheetName}!A:Z`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] }
        });

        // Also update balances in Configs if accounts are provided
        if (payload.accounts) {
          await updateConfigs(sheets, targetSsId, configSheetName, payload);
        }

        return res.status(200).json({ status: "success" });
      }

      if (payload.action === 'syncSettings') {
        await updateConfigs(sheets, targetSsId, configSheetName, payload);
        return res.status(200).json({ status: "success" });
      }

      if (payload.action === 'deleteTransaction') {
        // For now, regular sync will handle consistency
        return res.status(200).json({ status: "success", message: "Delete requires manual sync or full refresh" });
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
