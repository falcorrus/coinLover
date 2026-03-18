/**
 * CoinLover Backend (GAS)
 * Fix: Variable naming bug and robust parsing.
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
    throw new Error("Access denied. Ensure spreadsheet is shared with the service account.");
  }
}

function parseNum(val, fallback = 0) {
  if (val === undefined || val === null || val === "") return fallback;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

function ensureInitialized(ss) {
  let conf = ss.getSheetByName("Configs") || ss.insertSheet("Configs");
  let txs = ss.getSheetByName("Transactions") || ss.insertSheet("Transactions");
  if (conf.getLastRow() === 0) {
    const initialConfigs = [
      ["Updated", new Date().toISOString()], [""], [" === WALLETS ==="],
      ["ID", "Name", "Balance", "Balance USD", "Color", "Icon", "Currency"],
      ["acc-1", "Наличные", 0, 0, "#10b981", "wallet", "USD"], [""], [" === CATEGORIES ==="],
      ["ID", "Name", "Color", "Icon", "Tags"],
      ["cat-1", "Магазины", "#f59e0b", "shop", "еда, покупки"], [""], [" === INCOMES ==="],
      ["ID", "Name", "Color", "Icon", "Tags"],
      ["inc-1", "Зарплата", "#10b981", "business", ""]
    ];
    conf.getRange(1, 1, initialConfigs.length, initialConfigs[0].length).setValues(initialConfigs);
  }
  if (txs.getLastRow() === 0) {
    const h = ["Date", "Type", "Source", "Destination", "Tag", "Source Amount", "Source Currency", "Source Amount USD", "Target Amount", "Target Currency", "Target USD", "Comment", "ID"];
    txs.appendRow(h); txs.getRange(1, 1, 1, h.length).setFontWeight("bold");
  }
  return conf;
}

function doGet(e) {
  try {
    const ss = getSS(e);
    const ssId = ss.getId();
    const isMaster = (ssId === MASTER_SS_ID);
    const configSheetName = (e && e.parameter && e.parameter.demo === 'true') ? "Configs-demo" : "Configs";
    const txSheetName = (e && e.parameter && e.parameter.demo === 'true') ? "Transactions-demo" : "Transactions";
    
    let sheet = ss.getSheetByName(configSheetName);
    if (!sheet || sheet.getLastRow() === 0) sheet = ensureInitialized(ss);
    
    const rows = sheet.getDataRange().getValues();
    let hasUSDCol = false;
    for (let r of rows) { if (r[0] && String(r[0]).includes("ID") && r[3] && String(r[3]).includes("USD")) { hasUSDCol = true; break; } }

    const data = { accounts: [], categories: [], incomes: [], transactions: [], users: [] };
    let section = "";
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const f = String(row[0]).trim().toUpperCase();
      if (f.startsWith("UPDATED")) { 
        data.timestamp = row[1] || String(row[0]).split("Updated")[1]?.trim(); 
        continue; 
      }
      if (f.includes("WALLETS")) { section = "acc"; continue; }
      if (f.includes("CATEGORIES")) { section = "cat"; continue; }
      if (f.includes("INCOMES")) { section = "inc"; continue; }
      if (isMaster && f.includes("USERS")) { section = "usr"; continue; }
      if (!f || f === "ID" || f === "NAME") continue;
      
      if (section === "acc") data.accounts.push({ id: String(row[0]), name: String(row[1]), balance: parseNum(row[2]), balanceUSD: hasUSDCol ? parseNum(row[3]) : undefined, color: hasUSDCol ? row[4] : row[3], icon: (hasUSDCol ? row[5] : row[4]) || "wallet", currency: (hasUSDCol ? row[6] : row[5]) || "USD" });
      else if (section === "cat") data.categories.push({ id: String(row[0]), name: String(row[1]), color: row[2], icon: row[3] || "more", tags: row[4] ? String(row[4]).split(",").map(t => t.trim()) : [] });
      else if (section === "inc") data.incomes.push({ id: String(row[0]), name: String(row[1]), color: row[2], icon: row[3] || "business", tags: row[4] ? String(row[4]).split(",").map(t => t.trim()) : [] });
      else if (section === "usr" && isMaster) data.users.push({ name: String(row[0]).trim(), id: String(row[1]).trim() });
    }

    try {
      const txSheet = ss.getSheetByName(txSheetName);
      if (txSheet && txSheet.getLastRow() > 1) {
        const txRows = txSheet.getDataRange().getValues();
        const headers = txRows[0].map(v => String(v).trim());
        const col = {}; headers.forEach((v, i) => col[v] = i);
        const accMap = {}; data.accounts.forEach(a => accMap[a.name] = a.id);
        const catMap = {}; data.categories.forEach(c => catMap[c.name] = c.id);
        const incMap = {}; data.incomes.forEach(i => incMap[i.name] = i.id);

        for (let i = 1; i < txRows.length; i++) {
          const r = txRows[i]; if (!r[col["Date"]]) continue;
          const type = String(r[col["Type"]] || "").trim();
          const src = String(r[col["Source"]] || "").trim();
          const dst = String(r[col["Destination"]] || "").trim();
          let aid = "", tid = "";
          if (type === "expense") { aid = accMap[src] || src; tid = catMap[dst] || dst; }
          else if (type === "income") { aid = accMap[dst] || dst; tid = incMap[src] || src; }
          else if (type === "transfer") { aid = accMap[src] || src; tid = accMap[dst] || dst; }

          const dt = new Date(r[col["Date"]]);
          if (isNaN(dt.getTime())) continue;
          const iso = Utilities.formatDate(dt, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
          const sAmt = parseNum(r[col["Source Amount"]] || r[col["Amount"]]);
          const tAmt = parseNum(r[col["Target Amount"]] || r[col["Amount"]], sAmt);
          
          data.transactions.push({
            id: col["ID"] !== undefined ? String(r[col["ID"]]) : `${iso}_${i}`,
            type, accountId: aid, targetId: tid,
            sourceAmount: sAmt, sourceCurrency: String(r[col["Source Currency"]] || "USD"),
            sourceAmountUSD: parseNum(r[col["Source Amount USD"]] || r[col["Amount USD"]], sAmt),
            targetAmount: tAmt, targetCurrency: String(r[col["Target Currency"]] || "USD"),
            targetAmountUSD: parseNum(r[col["Target USD"]] || r[col["Amount USD"]], tAmt),
            date: iso, tag: r[col["Tag"]] ? String(r[col["Tag"]]) : undefined, comment: r[col["Comment"]] ? String(r[col["Comment"]]) : undefined
          });
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
    const isDemo = data.demo === true;
    const configSheetName = isDemo ? "Configs-demo" : "Configs";
    const txSheetName = isDemo ? "Transactions-demo" : "Transactions";
    let responses = [];

    if (data.action === "initTable") { ensureInitialized(ss); responses.push({ action: "initTable", status: "success" }); }

    const syncSettingsInternal = (settingsData) => {
      if (!settingsData.accounts || settingsData.accounts.length === 0) return { status: "error", message: "Empty config" };
      let sheet = ss.getSheetByName(configSheetName) || ss.insertSheet(configSheetName);
      let existingUsers = [];
      if (ss.getId() === MASTER_SS_ID) {
        try {
          const oldRows = sheet.getDataRange().getValues();
          let inUsers = false;
          for (let r of oldRows) {
            const f = String(r[0]).toUpperCase();
            if (f.includes("USERS")) { inUsers = true; continue; }
            if (inUsers && r[0] && f !== "NAME") existingUsers.push([r[0], r[1]]);
          }
        } catch (e) {}
      }
      sheet.clear();
      const rows = [];
      const pushRow = (arr) => { const r = new Array(8).fill(""); arr.forEach((v, i) => r[i] = v); rows.push(r); };
      pushRow(["Updated", settingsData.timestamp]);
      pushRow([""]); pushRow([" === WALLETS ==="]);
      pushRow(["ID", "Name", "Balance", "Balance USD", "Color", "Icon", "Currency"]);
      settingsData.accounts.forEach(a => pushRow([a.id, a.name, a.balance, a.balanceUSD || "", a.color, a.icon, a.currency]));
      pushRow([""]); pushRow([" === CATEGORIES ==="]);
      pushRow(["ID", "Name", "Color", "Icon", "Tags"]);
      if (settingsData.categories) settingsData.categories.forEach(c => pushRow([c.id, c.name, c.color, c.icon, Array.isArray(c.tags) ? c.tags.join(", ") : c.tags]));
      pushRow([""]); pushRow([" === INCOMES ==="]);
      pushRow(["ID", "Name", "Color", "Icon", "Tags"]);
      if (settingsData.incomes) settingsData.incomes.forEach(i => pushRow([i.id, i.name, i.color, i.icon, Array.isArray(i.tags) ? i.tags.join(", ") : i.tags]));
      if (ss.getId() === MASTER_SS_ID) {
        pushRow([""]); pushRow([" === USERS ==="]);
        pushRow(["Name", "Spreadsheet ID"]);
        existingUsers.forEach(u => pushRow([u[0], u[1]]));
      }
      if (rows.length > 0) sheet.getRange(1, 1, rows.length, 8).setValues(rows);
      return { status: "success" };
    };

    if (["addTransaction", "updateTransaction", "deleteTransaction"].includes(data.action)) {
      let txSheet = ss.getSheetByName(txSheetName) || ss.insertSheet(txSheetName);
      if (txSheet.getLastRow() === 0) { 
        const h = ["Date", "Type", "Source", "Destination", "Tag", "Source Amount", "Source Currency", "Source Amount USD", "Target Amount", "Target Currency", "Target USD", "Comment", "ID"]; 
        txSheet.appendRow(h); 
      }
      const headers = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
      const f = { 
        "Date": parseDateSafe(data.date), "Type": data.type, "Source": data.sourceName, "Destination": data.destinationName,
        "Tag": data.tagName || "", "Source Amount": data.sourceAmount, "Source Currency": data.sourceCurrency,
        "Source Amount USD": data.sourceAmountUSD || "",
        "Target Amount": data.targetAmount || data.sourceAmount, "Target Currency": data.targetCurrency,
        "Target USD": data.targetAmountUSD || "",
        "Comment": data.comment || "", "ID": data.id 
      };
      const rowData = headers.map(h => f[h] !== undefined ? f[h] : "");
      if (data.action === "addTransaction") txSheet.appendRow(rowData);
      else if (data.action === "updateTransaction") {
        const all = txSheet.getDataRange().getValues(); const idIdx = headers.indexOf("ID");
        let r = -1; for(let i=1; i<all.length; i++) if(String(all[i][idIdx]) === String(data.id)) { r=i+1; break; }
        if (r !== -1) txSheet.getRange(r, 1, 1, headers.length).setValues([rowData]);
      } else if (data.action === "deleteTransaction") {
        const all = txSheet.getDataRange().getValues(); const idIdx = headers.indexOf("ID");
        for(let i=all.length-1; i>=1; i--) if(String(all[i][idIdx]) === String(data.id)) txSheet.deleteRow(i+1);
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
