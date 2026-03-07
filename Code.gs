function doGet(e) {
  try {
    const isDemo = e && e.parameter && e.parameter.demo === 'true';
    const configSheetName = isDemo ? "Configs-demo" : "Configs";
    const txSheetName = isDemo ? "Transactions-demo" : "Transactions";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(configSheetName);
    
    if (!sheet) {
      if (isDemo) {
        const origConfig = ss.getSheetByName("Configs");
        if (origConfig) {
          sheet = origConfig.copyTo(ss);
          sheet.setName(configSheetName);
        } else {
          sheet = ss.insertSheet(configSheetName);
        }
        
        if (!ss.getSheetByName(txSheetName)) {
          const origTx = ss.getSheetByName("Transactions");
          if (origTx) {
            const txSheet = origTx.copyTo(ss);
            txSheet.setName(txSheetName);
          } else {
            ss.insertSheet(txSheetName);
          }
        }
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: configSheetName + " sheet not found" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    const rows = sheet.getDataRange().getValues();
    let hasUSDCol = false;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).includes("ID") && String(rows[i][3]).includes("USD")) {
        hasUSDCol = true;
        break;
      }
    }

    const data = { accounts: [], categories: [], incomes: [], transactions: [] };
    let currentSection = "";
    
    for (let i = 0; i < rows.length; i++) {
      const firstCol = String(rows[i][0]).trim();
      if (firstCol.startsWith("Updated")) {
        data.timestamp = firstCol.split("Updated")[1]?.trim() || rows[i][1];
        continue;
      }
      if (firstCol.includes("=== WALLETS ===")) { currentSection = "accounts"; continue; }
      if (firstCol.includes("=== CATEGORIES ===")) { currentSection = "categories"; continue; }
      if (firstCol.includes("=== INCOMES ===")) { currentSection = "incomes"; continue; }
      
      if (!firstCol || firstCol === "ID" || firstCol === "Name") continue;
      
      if (currentSection === "accounts") {
        const row = rows[i];
        data.accounts.push({
          id: String(row[0]), name: String(row[1]), balance: Number(row[2]),
          balanceUSD: hasUSDCol ? (row[3] ? Number(row[3]) : undefined) : undefined,
          color: hasUSDCol ? row[4] : row[3],
          icon: (hasUSDCol ? row[5] : row[4]) || "wallet",
          currency: (hasUSDCol ? row[6] : row[5]) || ""
        });
      } else if (currentSection === "categories") {
        const row = rows[i];
        data.categories.push({
          id: String(row[0]), name: String(row[1]), color: row[2], icon: row[3] || "more",
          tags: row[4] ? String(row[4]).split(",").map(t => t.trim()) : []
        });
      } else if (currentSection === "incomes") {
        const row = rows[i];
        data.incomes.push({ 
          id: String(row[0]), name: String(row[1]), color: row[2], icon: row[3] || "business",
          tags: row[4] ? String(row[4]).split(",").map(t => t.trim()) : []
        });
      }
    }

    try {
      const txSheet = ss.getSheetByName(txSheetName);
      if (txSheet && txSheet.getLastRow() > 1) {
        const txData = txSheet.getDataRange().getValues();
        const headers = txData[0].map(h => String(h).trim());
        const col = {};
        headers.forEach((h, i) => { col[h] = i; });

        let now = new Date();
        let filterAll = false;
        if (e && e.parameter && e.parameter.month) {
          if (e.parameter.month === "all") filterAll = true;
          else {
            const parts = e.parameter.month.split("-");
            now = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
          }
        }
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const accountByName = {}; data.accounts.forEach(a => { accountByName[a.name] = a.id; });
        const categoryByName = {}; data.categories.forEach(c => { categoryByName[c.name] = c.id; });
        const incomeByName = {}; data.incomes.forEach(i => { incomeByName[i.name] = i.id; });

        for (let i = 1; i < txData.length; i++) {
          const row = txData[i];
          let rawDate = row[col["Date"]];
          if (!rawDate) continue;
          let txDate = new Date(rawDate);
          if (isNaN(txDate.getTime())) continue;
          if (!filterAll && (txDate < monthStart || txDate >= monthEnd)) continue;

          const isoDate = Utilities.formatDate(txDate, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
          const type = String(row[col["Type"]] || "").trim();
          const sourceName = String(row[col["Source"]] || "").trim();
          const destinationName = String(row[col["Destination"]] || "").trim();
          
          const sourceAmount = parseFloat(row[col["Source Amount"]] || row[col["Amount"]] || 0) || 0;
          const sourceCurrency = col["Source Currency"] !== undefined ? String(row[col["Source Currency"]] || "").trim() : (col["Currency"] !== undefined ? String(row[col["Currency"]] || "").trim() : "USD");
          const sourceAmountUSD = col["Source Amount USD"] !== undefined ? (parseFloat(row[col["Source Amount USD"]] || "") || undefined) : (col["Amount USD"] !== undefined ? (parseFloat(row[col["Amount USD"]] || "") || undefined) : undefined);
          
          const targetAmount = col["Target Amount"] !== undefined ? (parseFloat(row[col["Target Amount"]] || "") || sourceAmount) : (col["Amount Local"] !== undefined ? (parseFloat(row[col["Amount Local"]] || "") || sourceAmount) : sourceAmount);
          const targetCurrency = col["Target Currency"] !== undefined ? String(row[col["Target Currency"]] || "").trim() : (col["Currency Local"] !== undefined ? String(row[col["Currency Local"]] || "").trim() : "USD");
          const targetAmountUSD = col["Target USD"] !== undefined ? (parseFloat(row[col["Target USD"]] || "") || undefined) : undefined;
          
          const tag = col["Tag"] !== undefined ? String(row[col["Tag"]] || "").trim() || undefined : undefined;
          const comment = col["Comment"] !== undefined ? String(row[col["Comment"]] || "").trim() || undefined : undefined;

          let accountId = ""; let targetId = "";
          if (type === "expense") { 
            accountId = accountByName[sourceName] || sourceName; 
            targetId = categoryByName[destinationName] || destinationName; 
          }
          else if (type === "income") { 
            // Correct mapping for income: accountId is Wallet (destination), targetId is IncomeSource (source)
            accountId = accountByName[destinationName] || destinationName; 
            targetId = incomeByName[sourceName] || sourceName; 
          }
          else if (type === "transfer") { 
            accountId = accountByName[sourceName] || sourceName; 
            targetId = accountByName[destinationName] || destinationName; 
          }

          const idColIdx = col["ID"];
          const rowId = (idColIdx !== undefined && row[idColIdx]) ? String(row[idColIdx]).trim() : `${isoDate}_${sourceName}_${destinationName}_${sourceAmount}`;

          data.transactions.push({
            id: rowId, type, accountId, targetId,
            sourceAmount, sourceCurrency, sourceAmountUSD,
            targetAmount, targetCurrency, targetAmountUSD,
            date: isoDate, tag, comment
          });
        }
      }
    } catch (txErr) { console.error("Transaction fetch error:", txErr); }
    
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
    const isDemo = data.demo === true;
    const configSheetName = isDemo ? "Configs-demo" : "Configs";
    const txSheetName = isDemo ? "Transactions-demo" : "Transactions";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let responses = [];

    const syncSettingsInternal = (settingsData) => {
      if (!settingsData.accounts || settingsData.accounts.length === 0) return { status: "error", message: "Empty config" };
      let sheet = ss.getSheetByName(configSheetName) || ss.insertSheet(configSheetName);
      sheet.clear();
      const rows = []; const colCount = 8;
      const pushRow = (arr) => {
        const row = new Array(colCount).fill("");
        for (let i = 0; i < Math.min(arr.length, colCount); i++) row[i] = arr[i];
        rows.push(row);
      };
      pushRow(["Updated", settingsData.timestamp]);
      pushRow([""]);
      pushRow([" === WALLETS ==="]);
      pushRow(["ID", "Name", "Balance", "Balance USD", "Color", "Icon", "Currency"]);
      settingsData.accounts.forEach(a => pushRow([a.id || "", a.name || "", a.balance || 0, a.balanceUSD || "", a.color || "", a.icon || "", a.currency || ""]));
      pushRow([""]);
      pushRow([" === CATEGORIES ==="]);
      pushRow(["ID", "Name", "Color", "Icon", "Tags"]);
      if (settingsData.categories) settingsData.categories.forEach(c => pushRow([c.id || "", c.name || "", c.color || "", c.icon || "", c.tags ? (Array.isArray(c.tags) ? c.tags.join(", ") : c.tags) : ""]));
      pushRow([""]);
      pushRow([" === INCOMES ==="]);
      pushRow(["ID", "Name", "Color", "Icon", "Tags"]);
      if (settingsData.incomes) settingsData.incomes.forEach(i => pushRow([i.id || "", i.name || "", i.color || "", i.icon || "", i.tags ? (Array.isArray(i.tags) ? i.tags.join(", ") : i.tags) : ""]));
      if (rows.length > 0) sheet.getRange(1, 1, rows.length, colCount).setValues(rows);
      sheet.autoResizeColumns(1, colCount);
      return { status: "success", message: "Configs updated" };
    };

    if (["addTransaction", "updateTransaction", "deleteTransaction"].includes(data.action)) {
      let txSheet = ss.getSheetByName(txSheetName) || ss.insertSheet(txSheetName);
      const baseHeaders = ["Date", "Type", "Source", "Destination", "Tag", "Source Amount", "Source Currency", "Source Amount USD", "Target Amount", "Target Currency", "Target USD", "Comment", "ID"];
      
      if (txSheet.getLastRow() === 0) {
        txSheet.appendRow(baseHeaders);
        txSheet.getRange(1, 1, 1, baseHeaders.length).setFontWeight("bold");
      }

      const currentHeaders = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());

      const fieldMap = {
        "Date": parseDateSafe(data.date), "Type": data.type, "Source": data.sourceName, "Destination": data.destinationName,
        "Tag": data.tagName || "", 
        "Source Amount": data.sourceAmount, "Source Currency": data.sourceCurrency || "", "Source Amount USD": data.sourceAmountUSD || "",
        "Target Amount": data.targetAmount || data.sourceAmount, "Target Currency": data.targetCurrency || "", "Target USD": data.targetAmountUSD || "",
        "Comment": data.comment || "", "ID": data.id || ""
      };

      if (data.action === "addTransaction") {
        txSheet.appendRow(currentHeaders.map(h => fieldMap[h] !== undefined ? fieldMap[h] : ""));
        responses.push({ action: "addTransaction", status: "success" });
      } 
      else if (data.action === "updateTransaction") {
        let foundRow = -1;
        const allTx = txSheet.getDataRange().getValues();
        const idIdx = currentHeaders.indexOf("ID");
        if (idIdx !== -1) {
          for (let i = 1; i < allTx.length; i++) {
            if (String(allTx[i][idIdx]).trim() === String(data.id)) { foundRow = i + 1; break; }
          }
        }
        const rowData = currentHeaders.map(h => fieldMap[h] !== undefined ? fieldMap[h] : "");
        if (foundRow !== -1) txSheet.getRange(foundRow, 1, 1, currentHeaders.length).setValues([rowData]);
        else txSheet.appendRow(rowData);
        responses.push({ action: "updateTransaction", status: "success" });
      }
      else if (data.action === "deleteTransaction") {
        const idIdx = currentHeaders.indexOf("ID");
        if (idIdx !== -1) {
          const allTx = txSheet.getDataRange().getValues();
          for (let i = allTx.length - 1; i >= 1; i--) {
            if (String(allTx[i][idIdx]).trim() === String(data.id)) txSheet.deleteRow(i + 1);
          }
        }
        responses.push({ action: "deleteTransaction", status: "success" });
      }
    }

    if (data.action === "syncSettings" || (data.accounts && data.categories)) {
      const settingsRes = syncSettingsInternal(data);
      responses.push({ action: "syncSettings", ...settingsRes });
    }

    SpreadsheetApp.flush();
    return ContentService.createTextOutput(JSON.stringify({ status: "success", responses })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function parseDateSafe(dateStr) {
  if (!dateStr) return new Date();
  try {
    const safeStr = String(dateStr).replace('T', ' ').replace(/-/g, '/');
    const d = new Date(safeStr);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) { return new Date(); }
}
