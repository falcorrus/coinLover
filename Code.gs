/**
 * CoinLover Backend (GAS) - Row 1 ID Mapping Version
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
    const configHeaders = [
      ["Updated", new Date().toISOString()], ["Base_Currency", "USD"], [""], [" === WALLETS ==="],
      ["id", "name", "balance", "balance_base", "color", "icon", "currency"], // Row 5: IDs
      ["ID", "Название", "Баланс", "Баланс (база)", "Цвет", "Иконка", "Валюта"], // Row 6: Labels
      ["acc-1", "Наличные", 0, 0, "#10b981", "wallet", "USD"]
    ];
    conf.getRange(1, 1, configHeaders.length, configHeaders[0].length).setValues(configHeaders);
  }
  
  if (txs.getLastRow() === 0) {
    const ids = ["date", "type", "src", "dst", "tag", "s_amt", "s_curr", "s_base", "t_amt", "t_curr", "t_base", "comment", "id"];
    const labels = ["Дата", "Тип", "Источник", "Назначение", "Тег", "Сумма (исх)", "Валюта (исх)", "Сумма (база)", "Сумма (цель)", "Валюта (цель)", "Цель (база)", "Комментарий", "ID"];
    txs.appendRow(ids);
    txs.appendRow(labels);
    txs.getRange(1, 1, 2, ids.length).setFontWeight("bold");
  }
  return conf;
}

function doGet(e) {
  try {
    const ss = getSS(e);
    const configSheetName = (e && e.parameter && e.parameter.demo === 'true') ? "Configs-demo" : "Configs";
    const txSheetName = (e && e.parameter && e.parameter.demo === 'true') ? "Transactions-demo" : "Transactions";
    
    let sheet = ss.getSheetByName(configSheetName);
    if (!sheet || sheet.getLastRow() === 0) sheet = ensureInitialized(ss);
    
    const rows = sheet.getDataRange().getValues();
    const data = { accounts: [], categories: [], incomes: [], transactions: [], users: [], baseCurrency: "USD" };
    let section = "";
    let sectionIdRowIdx = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const f = String(row[0]).trim().toLowerCase();
      
      if (f.startsWith("updated")) { data.timestamp = row[1]; continue; }
      if (f.startsWith("base_currency")) { data.baseCurrency = String(row[1]).trim() || "USD"; continue; }
      
      if (f.includes("wallets")) { section = "acc"; sectionIdRowIdx = i + 1; continue; }
      if (f.includes("categories")) { section = "cat"; sectionIdRowIdx = i + 1; continue; }
      if (f.includes("incomes")) { section = "inc"; sectionIdRowIdx = i + 1; continue; }
      if (ss.getId() === MASTER_SS_ID && f.includes("users")) { section = "usr"; sectionIdRowIdx = i + 1; continue; }
      
      // Skip ID rows and Header Label rows
      if (!f || i === sectionIdRowIdx || i === sectionIdRowIdx + 1) continue;
      if (sectionIdRowIdx === -1) continue;

      const col = {}; 
      const idRow = rows[sectionIdRowIdx];
      idRow.forEach((v, idx) => { if(v) col[String(v).trim().toLowerCase()] = idx; });

      if (section === "acc") {
        data.accounts.push({ 
          id: String(row[col["id"]]), 
          name: String(row[col["name"]]), 
          balance: parseNum(row[col["balance"]]), 
          balanceUSD: parseNum(row[col["balance_base"]]), 
          color: row[col["color"]], 
          icon: row[col["icon"]] || "wallet", 
          currency: row[col["currency"]] || "USD" 
        });
      } else if (section === "cat") {
        data.categories.push({ 
          id: String(row[col["id"]]), 
          name: String(row[col["name"]]), 
          color: row[col["color"]], 
          icon: row[col["icon"]] || "more", 
          tags: row[col["tags"]] ? String(row[col["tags"]]).split(",").map(t => t.trim()) : [] 
        });
      } else if (section === "inc") {
        data.incomes.push({ 
          id: String(row[col["id"]]), 
          name: String(row[col["name"]]), 
          color: row[col["color"]], 
          icon: row[col["icon"]] || "business", 
          tags: row[col["tags"]] ? String(row[col["tags"]]).split(",").map(t => t.trim()) : [] 
        });
      } else if (section === "usr") {
        data.users.push({ name: String(row[0]).trim(), id: String(row[1]).trim() });
      }
    }

    try {
      const txSheet = ss.getSheetByName(txSheetName);
      if (txSheet && txSheet.getLastRow() > 2) {
        const txRows = txSheet.getDataRange().getValues();
        const ids = txRows[0].map(v => String(v).trim().toLowerCase());
        const col = {}; ids.forEach((v, i) => col[v] = i);
        
        const accMap = {}; data.accounts.forEach(a => accMap[a.name] = a.id);
        const catMap = {}; data.categories.forEach(c => catMap[c.name] = c.id);
        const incMap = {}; data.incomes.forEach(i => incMap[i.name] = i.id);

        for (let i = 2; i < txRows.length; i++) {
          const r = txRows[i]; if (!r[col["date"]]) continue;
          const type = String(r[col["type"]] || "").trim();
          const src = String(r[col["src"]] || "").trim();
          const dst = String(r[col["dst"]] || "").trim();
          let aid = "", tid = "";
          if (type === "expense") { aid = accMap[src] || src; tid = catMap[dst] || dst; }
          else if (type === "income") { aid = accMap[dst] || dst; tid = incMap[src] || src; }
          else if (type === "transfer") { aid = accMap[src] || src; tid = accMap[dst] || dst; }

          const dt = new Date(r[col["date"]]);
          if (isNaN(dt.getTime())) continue;
          const iso = Utilities.formatDate(dt, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
          
          data.transactions.push({
            id: String(r[col["id"]]), type, accountId: aid, targetId: tid,
            sourceAmount: parseNum(r[col["s_amt"]]), sourceCurrency: String(r[col["s_curr"]] || "USD"),
            sourceAmountUSD: parseNum(r[col["s_base"]]),
            targetAmount: parseNum(r[col["t_amt"]]), targetCurrency: String(r[col["t_curr"]] || "USD"),
            targetAmountUSD: parseNum(r[col["t_base"]]),
            date: iso, tag: r[col["tag"]] ? String(r[col["tag"]]) : undefined, comment: r[col["comment"]] ? String(r[col["comment"]]) : undefined
          });
        }
      }
    } catch (e) { console.error("TX load error", e); }
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
      let sheet = ss.getSheetByName(configSheetName) || ss.insertSheet(configSheetName);
      let existingUsers = [];
      if (ss.getId() === MASTER_SS_ID) {
        try {
          const oldRows = sheet.getDataRange().getValues();
          let inUsers = false;
          for (let r of oldRows) {
            const f = String(r[0]).toUpperCase();
            if (f.includes("USERS")) { inUsers = true; continue; }
            if (inUsers && r[0] && f !== "NAME" && f !== "ID") existingUsers.push([r[0], r[1]]);
          }
        } catch (e) {}
      }
      sheet.clear();
      const rows = [];
      const pushRow = (arr) => { rows.push(arr); };
      pushRow(["Updated", settingsData.timestamp]);
      pushRow(["Base_Currency", settingsData.baseCurrency || "USD"]);
      pushRow([""]); pushRow([" === WALLETS ==="]);
      pushRow(["id", "name", "balance", "balance_base", "color", "icon", "currency"]);
      pushRow(["ID", "Название", "Баланс", "Баланс (база)", "Цвет", "Иконка", "Валюта"]);
      settingsData.accounts.forEach(a => pushRow([a.id, a.name, a.balance, a.balanceUSD || "", a.color, a.icon, a.currency]));
      pushRow([""]); pushRow([" === CATEGORIES ==="]);
      pushRow(["id", "name", "color", "icon", "tags"]);
      pushRow(["ID", "Название", "Цвет", "Иконка", "Теги"]);
      if (settingsData.categories) settingsData.categories.forEach(c => pushRow([c.id, c.name, c.color, c.icon, Array.isArray(c.tags) ? c.tags.join(", ") : c.tags]));
      pushRow([""]); pushRow([" === INCOMES ==="]);
      pushRow(["id", "name", "color", "icon", "tags"]);
      pushRow(["ID", "Название", "Цвет", "Иконка", "Теги"]);
      if (settingsData.incomes) settingsData.incomes.forEach(i => pushRow([i.id, i.name, i.color, i.icon, Array.isArray(i.tags) ? i.tags.join(", ") : i.tags]));
      
      if (ss.getId() === MASTER_SS_ID) {
        pushRow([""]); pushRow([" === USERS ==="]);
        pushRow(["Name", "ID"]);
        existingUsers.forEach(u => pushRow([u[0], u[1]]));
      }
      if (rows.length > 0) sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
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
        let rIdx = -1; for(let i=2; i<all.length; i++) if(String(all[i][col["id"]]) === String(data.id)) { rIdx=i+1; break; }
        if (rIdx !== -1) txSheet.getRange(rIdx, 1, 1, ids.length).setValues([rowData]);
      } else if (data.action === "deleteTransaction") {
        for(let i=all.length-1; i>=2; i--) if(String(all[i][col["id"]]) === String(data.id)) txSheet.deleteRow(i+1);
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
