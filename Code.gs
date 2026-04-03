/**
 * CoinLover Backend (GAS) - Version 6 (Fixed User Columns Order)
 */

const MASTER_SS_ID = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M";

function getSS(e, data) {
  try {
    let ssId = "";
    if (e && e.parameter && e.parameter.ssId) ssId = e.parameter.ssId;
    else if (data && data.ssId) ssId = data.ssId;
    if (ssId) return SpreadsheetApp.openById(ssId);
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    throw new Error("Access denied. Ensure spreadsheet ID is correct and shared.");
  }
}

function parseNum(val, fallback = 0) {
  if (val === undefined || val === null || val === "") return fallback;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

function ensureInitialized(ss, configName = "Configs", txName = "Transactions") {
  let conf = ss.getSheetByName(configName) || ss.insertSheet(configName);
  let txs = ss.getSheetByName(txName) || ss.insertSheet(txName);
  
  if (conf.getLastRow() === 0) {
    const configHeaders = [
      ["Updated", new Date().toISOString(), "", "", "", "", ""],
      ["Base_Currency", "USD", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      [" === WALLETS ===", "", "", "", "", "", ""],
      ["id", "name", "balance", "balance_base", "color", "icon", "currency"],
      ["ID", "Название", "Баланс", "Баланс (база)", "Цвет", "Иконка", "Валюта"]
    ];
    conf.getRange(1, 1, configHeaders.length, 7).setValues(configHeaders);
  }
  
  if (txs.getLastRow() === 0) {
    const ids = ["date", "type", "src", "dst", "tag", "s_amt", "s_curr", "t_amt", "t_curr", "base_amt", "comment", "id"];
    const labels = ["Дата", "Тип", "Источник", "Назначение", "Тег", "Сумма (исх)", "Валюта (исх)", "Сумма (цель)", "Валюта (цель)", "Цель (база)", "Комментарий", "ID"];
    txs.appendRow(ids);
    txs.appendRow(labels);
  }
  return conf;
}

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'template') {
      const masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
      let tmplSheet = masterSs.getSheetByName("Template_Configs") || masterSs.getSheetByName("Configs");
      if (tmplSheet) {
        const rows = tmplSheet.getDataRange().getValues();
        const tmplData = { accounts: [], categories: [], incomes: [] };
        let tSec = "", tRowIdx = -1;
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const key = String(row[0]).trim().toLowerCase();
          
          if (key.indexOf("wallets") !== -1) { tSec = "acc"; tRowIdx = i + 1; continue; }
          if (key.indexOf("categories") !== -1) { tSec = "cat"; tRowIdx = i + 1; continue; }
          if (key.indexOf("incomes") !== -1) { tSec = "inc"; tRowIdx = i + 1; continue; }
          if (key.indexOf("users") !== -1) { tSec = "usr"; tRowIdx = i + 1; continue; }
          
          if (tRowIdx === -1) continue;
          if (i < tRowIdx) continue;
          if (i === tRowIdx) continue;
          if (i === tRowIdx + 1) {
            const v0 = String(row[0]).trim().toLowerCase();
            if (v0 === "id" || v0 === "name" || v0 === "имя" || v0 === "название") continue;
          }

          const col = {}; 
          const idRow = rows[tRowIdx];
          if (!idRow) continue;
          idRow.forEach((v, idx) => { 
            if(v) {
              const head = String(v).trim().toLowerCase();
              col[head] = idx;
              // Aliases for robustness
              if (head === "название") col["name"] = idx;
              if (head === "цвет") col["color"] = idx;
              if (head === "иконка") col["icon"] = idx;
              if (head === "теги") col["tags"] = idx;
              if (head === "валюта") col["currency"] = idx;
            }
          });

          try {
            const uId = col["id"] !== undefined ? col["id"] : 0;
            const uName = col["name"] !== undefined ? col["name"] : (col["имя"] !== undefined ? col["имя"] : 1);
            const uColor = col["color"] !== undefined ? col["color"] : 2;
            const uIcon = col["icon"] !== undefined ? col["icon"] : 3;
            const uTags = col["tags"] !== undefined ? col["tags"] : 4;
            const uCurr = col["currency"] !== undefined ? col["currency"] : 6;

            if (tSec === "acc" && (row[uId] || row[0])) {
              tmplData.accounts.push({ id: String(row[uId] || row[0]), name: String(row[uName] || row[1]), balance: 0, balanceUSD: 0, color: row[uColor] || "#6d5dfc", icon: row[uIcon] || "wallet", currency: row[uCurr] || "" });
            } else if (tSec === "cat" && (row[uId] || row[0])) {
              tmplData.categories.push({ id: String(row[uId] || row[0]), name: String(row[uName] || row[1]), color: row[uColor] || "#6d5dfc", icon: row[uIcon] || "more", tags: row[uTags] ? String(row[uTags]).split(",").map(t => t.trim()) : [] });
            } else if (tSec === "inc" && (row[uId] || row[0])) {
              tmplData.incomes.push({ id: String(row[uId] || row[0]), name: String(row[uName] || row[1]), color: row[uColor] || "#6d5dfc", icon: row[uIcon] || "business", tags: row[uTags] ? String(row[uTags]).split(",").map(t => t.trim()) : [] });
            }
          } catch (e) {}
        }
        return ContentService.createTextOutput(JSON.stringify({ status: "success", data: tmplData })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const ss = getSS(e);
    const configSheetName = (e && e.parameter && e.parameter.demo === 'true') ? "Configs-demo" : "Configs";
    const txSheetName = (e && e.parameter && e.parameter.demo === 'true') ? "Transactions-demo" : "Transactions";
    
    let sheet = ss.getSheetByName(configSheetName);
    if (!sheet) sheet = ensureInitialized(ss, configSheetName, txSheetName);
    
    const rows = sheet.getDataRange().getValues();
    const data = { accounts: [], categories: [], incomes: [], transactions: [], users: [], baseCurrency: "USD" };
    let section = "";
    let sectionIdRowIdx = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      const key = String(row[0]).trim().toLowerCase();
      
      if (key.indexOf("updated") !== -1) { data.timestamp = row[1]; continue; }
      if (key.indexOf("base_currency") !== -1) { data.baseCurrency = String(row[1]).trim() || "USD"; continue; }
      
      if (key.indexOf("wallets") !== -1) { section = "acc"; sectionIdRowIdx = i + 1; continue; }
      if (key.indexOf("categories") !== -1) { section = "cat"; sectionIdRowIdx = i + 1; continue; }
      if (key.indexOf("incomes") !== -1) { section = "inc"; sectionIdRowIdx = i + 1; continue; }
      if (ss.getId() === MASTER_SS_ID && key.indexOf("users") !== -1) { section = "usr"; sectionIdRowIdx = i + 1; continue; }
      
      if (sectionIdRowIdx === -1) continue;
      if (i < sectionIdRowIdx) continue;
      if (i === sectionIdRowIdx) continue;

      if (i === sectionIdRowIdx + 1) {
        const val0 = String(row[0]).trim().toLowerCase();
        if (val0 === "id" || val0 === "name" || val0 === "имя" || val0 === "название") {
          continue;
        }
      }

      const col = {}; 
      const idRow = rows[sectionIdRowIdx];
      if (!idRow) continue;
      idRow.forEach((v, idx) => { if(v) col[String(v).trim().toLowerCase()] = idx; });

      try {
        const uId = col["id"] !== undefined ? col["id"] : col["id"];
        const uName = col["name"] !== undefined ? col["name"] : col["название"];
        const uColor = col["color"] !== undefined ? col["color"] : col["цвет"];
        const uIcon = col["icon"] !== undefined ? col["icon"] : col["иконка"];
        const uTags = col["tags"] !== undefined ? col["tags"] : col["теги"];
        const uBal = col["balance"] !== undefined ? col["balance"] : col["баланс"];
        const uBalBase = col["balance_base"] !== undefined ? col["balance_base"] : col["баланс (база)"];
        const uCurr = col["currency"] !== undefined ? col["currency"] : col["валюта"];
        const uLink = col["link"] !== undefined ? col["link"] : col["ссылка"];
        const uContact = col["contact"] !== undefined ? col["contact"] : col["контакт"];

        if (section === "acc" && (uId !== undefined || row[0])) {
          data.accounts.push({ id: String(uId !== undefined ? row[uId] : row[0]), name: String(uName !== undefined ? row[uName] : row[1]), balance: parseNum(uBal !== undefined ? row[uBal] : row[2]), balanceUSD: parseNum(uBalBase !== undefined ? row[uBalBase] : row[3]), color: uColor !== undefined ? row[uColor] : row[4], icon: uIcon !== undefined ? row[uIcon] : (row[5] || "wallet"), currency: uCurr !== undefined ? row[uCurr] : (row[6] || "") });
        } else if (section === "cat" && (uId !== undefined || row[0])) {
          data.categories.push({ id: String(uId !== undefined ? row[uId] : row[0]), name: String(uName !== undefined ? row[uName] : row[1]), color: uColor !== undefined ? row[uColor] : row[2], icon: uIcon !== undefined ? row[uIcon] : (row[3] || "more"), tags: (uTags !== undefined ? row[uTags] : row[4]) ? String(uTags !== undefined ? row[uTags] : row[4]).split(",").map(t => t.trim()) : [] });
        } else if (section === "inc" && (uId !== undefined || row[0])) {
          data.incomes.push({ id: String(uId !== undefined ? row[uId] : row[0]), name: String(uName !== undefined ? row[uName] : row[1]), color: uColor !== undefined ? row[uColor] : row[2], icon: uIcon !== undefined ? row[uIcon] : (row[3] || "business"), tags: (uTags !== undefined ? row[uTags] : row[4]) ? String(uTags !== undefined ? row[uTags] : row[4]).split(",").map(t => t.trim()) : [] });
        } else if (section === "usr") {
          let usId = col["id"] !== undefined ? row[col["id"]] : row[2];
          let usName = col["name"] !== undefined ? row[col["name"]] : (col["имя"] !== undefined ? row[col["имя"]] : row[0]);
          let usLink = col["link"] !== undefined ? row[col["link"]] : row[3];
          let usContact = col["contact"] !== undefined ? row[col["contact"]] : row[1];
          data.users.push({ name: String(usName || "").trim(), contact: String(usContact || "").trim(), id: String(usId || "").trim(), link: String(usLink || "").trim() });
        }
      } catch (e) {}
    }

    try {
      const txSheet = ss.getSheetByName(txSheetName);
      if (txSheet && txSheet.getLastRow() > 1) {
        const txRows = txSheet.getDataRange().getValues();
        let headerRow = txRows[0];
        let dataStartIndex = 1;
        if (txRows.length > 1 && String(txRows[1][0]).trim().toLowerCase() === "дата") {
          dataStartIndex = 2;
        }

        const headers = headerRow.map(v => String(v).trim().toLowerCase());
        const col = {}; headers.forEach((v, i) => col[v] = i);
        
        const findCol = (names) => {
          for (let n of names) {
            if (col[n.toLowerCase()] !== undefined) return col[n.toLowerCase()];
          }
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
            if (!dateRaw || String(dateRaw).toLowerCase().indexOf("date") !== -1 || String(dateRaw).toLowerCase().indexOf("дата") !== -1) continue;
            
            let rawType = String(r[c_type] || "").trim().toLowerCase();
            let type = "expense";
            if (rawType.indexOf("inc") !== -1 || rawType.indexOf("доход") !== -1 || rawType.indexOf("приход") !== -1 || rawType === "in") type = "income";
            else if (rawType.indexOf("trans") !== -1 || rawType.indexOf("перевод") !== -1) type = "transfer";
            else if (rawType.indexOf("exp") !== -1 || rawType.indexOf("расход") !== -1 || rawType === "out") type = "expense";

            const srcRaw = String(r[c_src] || "").trim();
            const dstRaw = String(r[c_dst] || "").trim();
            
            let aid = "", tid = "";
            if (type === "expense") { aid = accMap[srcRaw] || srcRaw; tid = catMap[dstRaw] || dstRaw; }
            else if (type === "income") { aid = accMap[dstRaw] || dstRaw; tid = incMap[srcRaw] || srcRaw; }
            else if (type === "transfer") { aid = accMap[srcRaw] || srcRaw; tid = accMap[dstRaw] || dstRaw; }

            let dt;
            if (dateRaw instanceof Date) {
              dt = dateRaw;
            } else {
              const s = String(dateRaw).trim();
              dt = new Date(s);
              
              if (isNaN(dt.getTime())) {
                if (s.includes('/')) {
                  const p = s.split(/[ /:]/);
                  if (p.length >= 3) {
                    const month = parseInt(p[0]) - 1;
                    const day = parseInt(p[1]);
                    let year = parseInt(p[2]);
                    if (year < 100) year += 2000;
                    const hour = p[3] ? parseInt(p[3]) : 12;
                    const min = p[4] ? parseInt(p[4]) : 0;
                    dt = new Date(year, month, day, hour, min, 0);
                  }
                } else {
                  // Fallback for DD.MM.YYYY or DD-MM-YYYY (with dots/dashes)
                  const p = s.split(/[.-]/);
                  if (p.length >= 3) {
                    let year = parseInt(p[2]); 
                    if (year < 100) year += 2000;
                    dt = new Date(year, parseInt(p[1]) - 1, parseInt(p[0]), 12, 0, 0);
                  }
                }
              }
            }

            if (!dt || isNaN(dt.getTime())) continue;
            const iso = Utilities.formatDate(dt, "UTC", "yyyy-MM-dd'T'HH:mm:ss'Z'");
            
            const s_amt = parseNum(r[c_s_amt]);
            const t_amt = c_t_amt !== undefined ? parseNum(r[c_t_amt]) : s_amt;

            data.transactions.push({
              id: String(c_id !== undefined ? r[c_id] : i), 
              type: type, 
              accountId: aid, targetId: tid,
              sourceAmount: s_amt, 
              sourceCurrency: String(c_s_curr !== undefined ? r[c_s_curr] : ""),
              sourceAmountUSD: parseNum(r[c_s_base]),
              targetAmount: t_amt, 
              targetCurrency: String(c_t_curr !== undefined ? r[c_t_curr] : ""),
              targetAmountUSD: parseNum(r[c_t_base]),
              date: iso, 
              tag: c_tag !== undefined ? String(r[c_tag]) : undefined, 
              comment: c_comment !== undefined ? String(r[c_comment]) : undefined
            });
          }
        }
      }
    } catch (e) {}
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const data = JSON.parse(e.postData.contents);
    const ss = getSS(e, data);
    
    const configSheetName = data.demo === true ? "Configs-demo" : "Configs";
    const txSheetName = data.demo === true ? "Transactions-demo" : "Transactions";
    
    ensureInitialized(ss, configSheetName, txSheetName);
    
    let responses = [];

    if (data.action === "initTable") { responses.push({ action: "initTable", status: "success" }); }

    const syncSettingsInternal = (settingsData) => {
      let sheet = ss.getSheetByName(configSheetName) || ss.insertSheet(configSheetName);
      
      let baseCurrency = settingsData.baseCurrency;
      if (!baseCurrency && sheet.getLastRow() >= 2) {
        try {
          baseCurrency = sheet.getRange(2, 2).getValue();
        } catch (e) {}
      }
      if (!baseCurrency) baseCurrency = "USD";

      let existingUsers = [];
      if (ss.getId() === MASTER_SS_ID) {
        try {
          const sheetData = sheet.getDataRange().getValues();
          let inUsers = false;
          for (let i = 0; i < sheetData.length; i++) {
            const val0 = String(sheetData[i][0]).trim().toLowerCase();
            if (val0.indexOf("users") !== -1) { inUsers = true; continue; }
            if (inUsers && sheetData[i][0] && val0 !== "name" && val0 !== "имя") {
              existingUsers.push({ name: String(sheetData[i][0]), contact: String(sheetData[i][1] || ""), id: String(sheetData[i][2] || ""), link: String(sheetData[i][3] || "") });
            }
          }
        } catch (e) {}
      }

      sheet.clear();
      const rows = [];
      const pushRow = (arr) => { 
        const fixedRow = new Array(13).fill("");
        arr.forEach((v, idx) => fixedRow[idx] = v);
        rows.push(fixedRow); 
      };
      
      pushRow(["Updated", settingsData.timestamp]);
      pushRow(["Base_Currency", baseCurrency]);
      pushRow([""]); pushRow([" === WALLETS ==="]);
      pushRow(["id", "name", "balance", "balance_base", "color", "icon", "currency"]);
      pushRow(["ID", "Название", "Баланс", "Баланс (база)", "Цвет", "Иконка", "Валюта"]);
      if (settingsData.accounts) settingsData.accounts.forEach(a => pushRow([a.id, a.name, a.balance, a.balanceUSD || "", a.color, a.icon, a.currency]));
      
      pushRow([""]); pushRow([" === CATEGORIES ==="]);
      pushRow(["id", "name", "color", "icon", "tags"]);
      pushRow(["ID", "Название", "Цвет", "Иконка", "Теги"]);
      if (settingsData.categories) settingsData.categories.forEach(c => pushRow([c.id, c.name, c.color, c.icon, Array.isArray(c.tags) ? c.tags.join(", ") : c.tags]));
      
      pushRow([""]); pushRow([" === INCOMES ==="]);
      pushRow(["id", "name", "color", "icon", "tags"]);
      pushRow(["ID", "Название", "Цвет", "Иконка", "Теги"]);
      if (settingsData.incomes) settingsData.incomes.forEach(i => pushRow([i.id, i.name, i.color, i.icon, Array.isArray(i.tags) ? i.tags.join(", ") : i.tags]));
      
      if (existingUsers.length > 0) {
        pushRow([""]); pushRow([" === USERS ==="]);
        pushRow(["Name", "Contact", "ID", "Link"]);
        existingUsers.forEach(u => pushRow([u.name, u.contact, u.id, u.link]));
      }
      
      if (rows.length > 0) sheet.getRange(1, 1, rows.length, 13).setValues(rows);
      return { status: "success" };
    };

    if (["addTransaction", "updateTransaction", "deleteTransaction"].includes(data.action)) {
      let txSheet = ss.getSheetByName(txSheetName) || ss.insertSheet(txSheetName);
      const all = txSheet.getDataRange().getValues();
      const ids = all[0].map(h => String(h).trim().toLowerCase());
      const col = {}; ids.forEach((v, i) => col[v] = i);
      
      const baseAmt = data.targetAmountUSD !== undefined && data.targetAmountUSD !== 0 ? data.targetAmountUSD : (data.sourceAmountUSD || 0);
      const f = { 
        "date": parseDateSafe(data.date), "type": data.type, "src": data.sourceName, "dst": data.destinationName,
        "tag": data.tagName || "", "s_amt": Number(data.sourceAmount), "s_curr": data.sourceCurrency,
        "t_amt": Number(data.targetAmount || data.sourceAmount), "t_curr": data.targetCurrency,
        "base_amt": Number(baseAmt),
        "comment": data.comment || "", "id": data.id 
      };
      const rowData = ids.map(h => f[h] !== undefined ? f[h] : "");
      if (data.action === "addTransaction") txSheet.appendRow(rowData);
      else if (data.action === "updateTransaction") {
        let rIdx = -1; for(let i=1; i<all.length; i++) if(String(all[i][col["id"]]) === String(data.id)) { rIdx=i+1; break; }
        if (rIdx !== -1) txSheet.getRange(rIdx, 1, 1, ids.length).setValues([rowData]);
      } else if (data.action === "deleteTransaction") {
        for(let i=all.length-1; i>=1; i--) if(String(all[i][col["id"]]) === String(data.id)) txSheet.deleteRow(i+1);
      }

      if (data.accounts) syncSettingsInternal(data);
      responses.push({ action: data.action, status: "success" });
    }

    if (data.action === "syncSettings") { const res = syncSettingsInternal(data); responses.push({ action: "syncSettings", ...res }); }
    
    if (data.action === "registerLead") {
      const masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
      const configSheet = masterSs.getSheetByName("Configs") || masterSs.insertSheet("Configs");
      const values = configSheet.getDataRange().getValues();
      let usersRowIdx = -1;
      
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]).indexOf("=== USERS ===") !== -1) {
          usersRowIdx = i + 1;
          break;
        }
      }
      
      if (usersRowIdx === -1) {
        configSheet.appendRow([""]);
        configSheet.appendRow([" === USERS ==="]);
        configSheet.appendRow(["Name", "Contact", "ID", "Link"]);
        usersRowIdx = configSheet.getLastRow();
      }
      
      const userSsId = data.sheetUrl ? getIdFromUrl(data.sheetUrl) : "";
      
      // Append the new lead info in order: Name, Contact, ID, Link
      const leadInfo = [data.name || "", data.contact || "", userSsId, data.sheetUrl || ""];
      configSheet.appendRow(leadInfo);
      
      // NEW: Initialize the user's sheet if ID is successfully extracted
      if (userSsId) {
        try {
          const userSs = SpreadsheetApp.openById(userSsId);
          ensureInitialized(userSs);
        } catch (err) {
          console.error("Failed to initialize user sheet: " + err.toString());
        }
      }
      
      responses.push({ action: "registerLead", status: "success" });
    }

    SpreadsheetApp.flush();
    return ContentService.createTextOutput(JSON.stringify({ status: "success", responses })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}

function getIdFromUrl(url) {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

function parseDateSafe(s) { 
  if(!s) return new Date(); 
  const str = String(s).trim();
  let d = new Date(str);
  if (isNaN(d.getTime())) {
    if (str.includes('/')) {
      const p = str.split(/[ /:]/);
      if (p.length >= 3) {
        const month = parseInt(p[0]) - 1;
        const day = parseInt(p[1]);
        let year = parseInt(p[2]);
        if (year < 100) year += 2000;
        const hour = p[3] ? parseInt(p[3]) : 12;
        const min = p[4] ? parseInt(p[4]) : 0;
        d = new Date(year, month, day, hour, min, 0);
      }
    } else {
      // Try DD.MM.YYYY
      const p = str.split(/[.-]/);
      if (p.length >= 3) {
        let year = parseInt(p[2]);
        if (year < 100) year += 2000;
        d = new Date(year, parseInt(p[1]) - 1, parseInt(p[0]), 12, 0, 0);
      }
    }
  }
  return isNaN(d.getTime()) ? new Date() : d; 
}
