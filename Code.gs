/**
 * CoinLover Backend (GAS) - Version 3 (Rectangular Array Fix)
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
    const ids = ["date", "type", "src", "dst", "tag", "s_amt", "s_curr", "s_base", "t_amt", "t_curr", "t_base", "comment", "id"];
    const labels = ["Дата", "Тип", "Источник", "Назначение", "Тег", "Сумма (исх)", "Валюта (исх)", "Сумма (база)", "Сумма (цель)", "Валюта (цель)", "Цель (база)", "Комментарий", "ID"];
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
          idRow.forEach((v, idx) => { if(v) col[String(v).trim().toLowerCase()] = idx; });

          try {
            const uId = col["id"] !== undefined ? col["id"] : col["id"];
            const uName = col["name"] !== undefined ? col["name"] : col["название"];
            const uColor = col["color"] !== undefined ? col["color"] : col["цвет"];
            const uIcon = col["icon"] !== undefined ? col["icon"] : col["иконка"];
            const uTags = col["tags"] !== undefined ? col["tags"] : col["теги"];
            const uBal = col["balance"] !== undefined ? col["balance"] : col["баланс"];
            const uCurr = col["currency"] !== undefined ? col["currency"] : col["валюта"];

            if (tSec === "acc" && (uId !== undefined || row[0])) {
              tmplData.accounts.push({ id: String(uId !== undefined ? row[uId] : row[0]), name: String(uName !== undefined ? row[uName] : row[1]), balance: 0, balanceUSD: 0, color: uColor !== undefined ? row[uColor] : row[4], icon: uIcon !== undefined ? row[uIcon] : (row[5] || "wallet"), currency: uCurr !== undefined ? row[uCurr] : (row[6] || "USD") });
            } else if (tSec === "cat" && (uId !== undefined || row[0])) {
              tmplData.categories.push({ id: String(uId !== undefined ? row[uId] : row[0]), name: String(uName !== undefined ? row[uName] : row[1]), color: uColor !== undefined ? row[uColor] : row[2], icon: uIcon !== undefined ? row[uIcon] : (row[3] || "more"), tags: (uTags !== undefined ? row[uTags] : row[4]) ? String(uTags !== undefined ? row[uTags] : row[4]).split(",").map(t => t.trim()) : [] });
            } else if (tSec === "inc" && (uId !== undefined || row[0])) {
              tmplData.incomes.push({ id: String(uId !== undefined ? row[uId] : row[0]), name: String(uName !== undefined ? row[uName] : row[1]), color: uColor !== undefined ? row[uColor] : row[2], icon: uIcon !== undefined ? row[uIcon] : (row[3] || "business"), tags: (uTags !== undefined ? row[uTags] : row[4]) ? String(uTags !== undefined ? row[uTags] : row[4]).split(",").map(t => t.trim()) : [] });
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

        if (section === "acc" && (uId !== undefined || row[0])) {
          data.accounts.push({ id: String(uId !== undefined ? row[uId] : row[0]), name: String(uName !== undefined ? row[uName] : row[1]), balance: parseNum(uBal !== undefined ? row[uBal] : row[2]), balanceUSD: parseNum(uBalBase !== undefined ? row[uBalBase] : row[3]), color: uColor !== undefined ? row[uColor] : row[4], icon: uIcon !== undefined ? row[uIcon] : (row[5] || "wallet"), currency: uCurr !== undefined ? row[uCurr] : (row[6] || "USD") });
        } else if (section === "cat" && (uId !== undefined || row[0])) {
          data.categories.push({ id: String(uId !== undefined ? row[uId] : row[0]), name: String(uName !== undefined ? row[uName] : row[1]), color: uColor !== undefined ? row[uColor] : row[2], icon: uIcon !== undefined ? row[uIcon] : (row[3] || "more"), tags: (uTags !== undefined ? row[uTags] : row[4]) ? String(uTags !== undefined ? row[uTags] : row[4]).split(",").map(t => t.trim()) : [] });
        } else if (section === "inc" && (uId !== undefined || row[0])) {
          data.incomes.push({ id: String(uId !== undefined ? row[uId] : row[0]), name: String(uName !== undefined ? row[uName] : row[1]), color: uColor !== undefined ? row[uColor] : row[2], icon: uIcon !== undefined ? row[uIcon] : (row[3] || "business"), tags: (uTags !== undefined ? row[uTags] : row[4]) ? String(uTags !== undefined ? row[uTags] : row[4]).split(",").map(t => t.trim()) : [] });
        } else if (section === "usr") {
          let usId = col["id"] !== undefined ? row[col["id"]] : row[1];
          let usName = col["name"] !== undefined ? row[col["name"]] : (col["имя"] !== undefined ? row[col["имя"]] : row[0]);
          data.users.push({ name: String(usName || "").trim(), id: String(usId || "").trim() });
        }
      } catch (e) {}
    }

    try {
      const txSheet = ss.getSheetByName(txSheetName);
      if (txSheet && txSheet.getLastRow() > 1) {
        const txRows = txSheet.getDataRange().getValues();
        // Look for headers in row 0 or 1
        let headerRow = txRows[0];
        let dataStartIndex = 1;
        if (txRows.length > 1 && String(txRows[1][0]).trim().toLowerCase() === "дата") {
          dataStartIndex = 2; // skip second header row
        }

        const ids = headerRow.map(v => String(v).trim().toLowerCase());
        const col = {}; ids.forEach((v, i) => col[v] = i);
        
        // Support old and new column names
        const c_date = col["date"] !== undefined ? col["date"] : col["дата"];
        const c_type = col["type"] !== undefined ? col["type"] : col["тип"];
        const c_src = col["src"] !== undefined ? col["src"] : (col["source"] !== undefined ? col["source"] : col["источник"]);
        const c_dst = col["dst"] !== undefined ? col["dst"] : (col["destination"] !== undefined ? col["destination"] : col["назначение"]);
        const c_tag = col["tag"] !== undefined ? col["tag"] : col["тег"];
        const c_s_amt = col["s_amt"] !== undefined ? col["s_amt"] : (col["source_amount"] !== undefined ? col["source_amount"] : col["сумма (исх)"]);
        const c_s_curr = col["s_curr"] !== undefined ? col["s_curr"] : (col["source_currency"] !== undefined ? col["source_currency"] : col["валюта (исх)"]);
        const c_s_base = col["s_base"] !== undefined ? col["s_base"] : col["сумма (база)"];
        const c_t_amt = col["t_amt"] !== undefined ? col["t_amt"] : (col["target_amount"] !== undefined ? col["target_amount"] : col["сумма (цель)"]);
        const c_t_curr = col["t_curr"] !== undefined ? col["t_curr"] : (col["target_currency"] !== undefined ? col["target_currency"] : col["валюта (цель)"]);
        const c_t_base = col["t_base"] !== undefined ? col["t_base"] : col["цель (база)"];
        const c_comment = col["comment"] !== undefined ? col["comment"] : col["коментарий"];
        const c_id = col["id"] !== undefined ? col["id"] : col["id"];
        
        if (c_date !== undefined) {
          const accMap = {}; data.accounts.forEach(a => { accMap[a.name] = a.id; accMap[a.id] = a.id; });
          const catMap = {}; data.categories.forEach(c => { catMap[c.name] = c.id; catMap[c.id] = c.id; });
          const incMap = {}; data.incomes.forEach(i => { incMap[i.name] = i.id; incMap[i.id] = i.id; });

          for (let i = dataStartIndex; i < txRows.length; i++) {
            const r = txRows[i]; 
            const dateVal = String(r[c_date]);
            if (!dateVal || dateVal.toLowerCase().indexOf("date") !== -1 || dateVal.toLowerCase().indexOf("дата") !== -1) continue;
            
            const type = String(r[c_type] || "").trim();
            const srcRaw = String(r[c_src] || "").trim();
            const dstRaw = String(r[c_dst] || "").trim();
            
            let aid = "", tid = "";
            if (type === "expense") { aid = accMap[srcRaw] || srcRaw; tid = catMap[dstRaw] || dstRaw; }
            else if (type === "income") { aid = accMap[dstRaw] || dstRaw; tid = incMap[srcRaw] || srcRaw; }
            else if (type === "transfer") { aid = accMap[srcRaw] || srcRaw; tid = accMap[dstRaw] || dstRaw; }

            const dt = new Date(r[c_date]);
            if (isNaN(dt.getTime())) continue;
            const iso = Utilities.formatDate(dt, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
            
            data.transactions.push({
              id: String(r[c_id] || i), type, accountId: aid, targetId: tid,
              sourceAmount: parseNum(r[c_s_amt]), sourceCurrency: String(r[c_s_curr] || "USD"),
              sourceAmountUSD: parseNum(r[c_s_base]),
              targetAmount: parseNum(r[c_t_amt]), targetCurrency: String(r[c_t_curr] || "USD"),
              targetAmountUSD: parseNum(r[c_t_base]),
              date: iso, tag: r[c_tag] ? String(r[c_tag]) : undefined, comment: r[c_comment] ? String(r[c_comment]) : undefined
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
    
    // Always ensure sheets and basic headers exist before any action
    ensureInitialized(ss, configSheetName, txSheetName);
    
    let responses = [];

    if (data.action === "initTable") { responses.push({ action: "initTable", status: "success" }); }

    const syncSettingsInternal = (settingsData) => {
      let sheet = ss.getSheetByName(configSheetName) || ss.insertSheet(configSheetName);
      
      let existingUsers = [];
      if (ss.getId() === MASTER_SS_ID) {
        try {
          const sheetData = sheet.getDataRange().getValues();
          let inUsers = false;
          for (let i = 0; i < sheetData.length; i++) {
            const val0 = String(sheetData[i][0]).trim().toLowerCase();
            if (val0.indexOf("users") !== -1) { inUsers = true; continue; }
            if (inUsers && sheetData[i][0] && val0 !== "name" && val0 !== "имя") {
              existingUsers.push({ name: String(sheetData[i][0]), id: String(sheetData[i][1] || "") });
            }
          }
        } catch (e) {}
      }

      sheet.clear();
      const rows = [];
      const pushRow = (arr) => { 
        const fixedRow = new Array(13).fill(""); // Ensure rectangular array (max columns)
        arr.forEach((v, idx) => fixedRow[idx] = v);
        rows.push(fixedRow); 
      };
      
      pushRow(["Updated", settingsData.timestamp]);
      pushRow(["Base_Currency", settingsData.baseCurrency || "USD"]);
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
        pushRow(["Name", "ID"]);
        existingUsers.forEach(u => pushRow([u.name, u.id]));
      }
      
      if (rows.length > 0) sheet.getRange(1, 1, rows.length, 13).setValues(rows);
      return { status: "success" };
    };

    if (["addTransaction", "updateTransaction", "deleteTransaction"].includes(data.action)) {
      let txSheet = ss.getSheetByName(txSheetName) || ss.insertSheet(txSheetName);
      const all = txSheet.getDataRange().getValues();
      const ids = all[0].map(h => String(h).trim().toLowerCase());
      const col = {}; ids.forEach((v, i) => col[v] = i);
      
      const f = { 
        "date": parseDateSafe(data.date), "type": data.type, "src": data.sourceName, "dst": data.destinationName,
        "tag": data.tagName || "", "s_amt": data.sourceAmount, "s_curr": data.sourceCurrency, "s_base": data.sourceAmountUSD || "",
        "t_amt": data.targetAmount || data.sourceAmount, "t_curr": data.targetCurrency, "t_base": data.targetAmountUSD || "",
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
      responses.push({ action: data.action, status: "success" });
    }
    if (data.action === "syncSettings") { const res = syncSettingsInternal(data); responses.push({ action: "syncSettings", ...res }); }
    SpreadsheetApp.flush();
    return ContentService.createTextOutput(JSON.stringify({ status: "success", responses })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}

function parseDateSafe(s) { if(!s) return new Date(); const d = new Date(String(s).replace('T',' ').replace(/-/g,'/')); return isNaN(d.getTime()) ? new Date() : d; }