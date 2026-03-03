function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Configs");
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Configs sheet not found" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const rows = sheet.getDataRange().getValues();
    const data = {
      accounts: [],
      categories: [],
      incomes: [],
      transactions: []
    };
    
    let currentSection = "";
    
    for (let i = 0; i < rows.length; i++) {
      const firstCol = String(rows[i][0]).trim();
      
      if (firstCol.startsWith("Updated")) {
        data.timestamp = firstCol.split("Updated")[1]?.trim() || rows[i][1];
        continue;
      }
      
      if (firstCol.includes("=== WALLETS ===")) {
        currentSection = "accounts";
        continue;
      }
      if (firstCol.includes("=== CATEGORIES ===")) {
        currentSection = "categories";
        continue;
      }
      if (firstCol.includes("=== INCOMES ===")) {
        currentSection = "incomes";
        continue;
      }
      
      // Skip headers and empty rows
      if (!firstCol || firstCol === "ID" || firstCol === "Name") continue;
      
      if (currentSection === "accounts") {
        data.accounts.push({
          id: rows[i][0],
          name: rows[i][1],
          balance: Number(rows[i][2]),
          color: rows[i][3],
          icon: rows[i][4] || "wallet",
          currency: rows[i][5] || ""
        });
      } else if (currentSection === "categories") {
        data.categories.push({
          id: rows[i][0],
          name: rows[i][1],
          color: rows[i][2],
          icon: rows[i][3] || "more",
          tags: rows[i][4] ? String(rows[i][4]).split(",").map(t => t.trim()) : []
        });
      } else if (currentSection === "incomes") {
        data.incomes.push({
          id: rows[i][0],
          name: rows[i][1],
          color: rows[i][2],
          icon: rows[i][3] || "business"
        });
      }
    }

    // === Read current month transactions ===
    try {
      const txSheet = ss.getSheetByName("Transactions");
      if (txSheet && txSheet.getLastRow() > 1) {
        const txData = txSheet.getDataRange().getValues();
        const headers = txData[0].map(h => String(h).trim());

        // Map header names to column indices
        const col = {};
        headers.forEach((h, i) => { col[h] = i; });

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // Build lookup maps for name → id
        const accountByName = {};
        data.accounts.forEach(a => { accountByName[a.name] = a.id; });

        const categoryByName = {};
        data.categories.forEach(c => { categoryByName[c.name] = c.id; });

        const incomeByName = {};
        data.incomes.forEach(i => { incomeByName[i.name] = i.id; });

        for (let i = 1; i < txData.length; i++) {
          const row = txData[i];
          const dateStr = String(row[col["Date"]] || "").trim();
          if (!dateStr) continue;

          const txDate = new Date(dateStr);
          if (isNaN(txDate.getTime())) continue;
          if (txDate < monthStart || txDate >= monthEnd) continue;

          const type = String(row[col["Type"]] || "").trim();
          const sourceName = String(row[col["Source"]] || "").trim();
          const destinationName = String(row[col["Destination"]] || "").trim();
          const amount = parseFloat(row[col["Amount"]] || 0) || 0;
          const amountUSD = col["Amount USD"] !== undefined ? (parseFloat(row[col["Amount USD"]] || "") || undefined) : undefined;
          const targetAmount = col["Target Amount"] !== undefined ? (parseFloat(row[col["Target Amount"]] || "") || amount) : amount;
          const targetAmountUSD = col["Target USD"] !== undefined ? (parseFloat(row[col["Target USD"]] || "") || undefined) : undefined;
          const tag = col["Tag"] !== undefined ? String(row[col["Tag"]] || "").trim() || undefined : undefined;
          const comment = col["Comment"] !== undefined ? String(row[col["Comment"]] || "").trim() || undefined : undefined;

          // Reconstruct accountId and targetId from names
          let accountId = "";
          let targetId = "";

          if (type === "expense") {
            accountId = accountByName[sourceName] || sourceName;
            targetId = categoryByName[destinationName] || destinationName;
          } else if (type === "income") {
            accountId = incomeByName[sourceName] || sourceName;
            targetId = accountByName[destinationName] || destinationName;
          } else if (type === "transfer") {
            accountId = accountByName[sourceName] || sourceName;
            targetId = accountByName[destinationName] || destinationName;
          }

          // Use ID column if available, fallback to deterministic pseudo-ID
          const idColIdx = col["ID"];
          const rowId = (idColIdx !== undefined && row[idColIdx])
            ? String(row[idColIdx]).trim()
            : `${dateStr}_${sourceName}_${destinationName}_${amount}`;

          data.transactions.push({
            id: rowId,
            type,
            accountId,
            targetId,
            amount,
            amountUSD,
            targetAmount,
            targetAmountUSD,
            date: dateStr,
            tag,
            comment
          });
        }
      }
    } catch (txErr) {
      // Non-fatal: just return empty transactions if any error
      console.error("Transaction fetch error:", txErr);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Обработка синхронизации настроек (Configs)
    if (data.action === "syncSettings") {
      let sheet = ss.getSheetByName("Configs") || ss.insertSheet("Configs");
      sheet.clear();

      const rows = [];
      const colCount = 6; // ID, Name, Balance, Color, Icon, Currency

      rows.push(["Updated", data.timestamp, "", "", "", ""]);
      rows.push(["", "", "", "", "", ""]);

      // 1. Кошельки (Accounts)
      rows.push([" === WALLETS ===", "", "", "", "", ""]);
      rows.push(["ID", "Name", "Balance", "Color", "Icon", "Currency"]);
      if (data.accounts && Array.isArray(data.accounts)) {
        data.accounts.forEach(a => {
          rows.push([a.id || "", a.name || "", a.balance || 0, a.color || "", a.icon || "", a.currency || ""]);
        });
      }
      rows.push(["", "", "", "", "", ""]);

      // 2. Категории (Categories)
      rows.push([" === CATEGORIES ===", "", "", "", "", ""]);
      rows.push(["ID", "Name", "Color", "Icon", "Tags", ""]);
      if (data.categories && Array.isArray(data.categories)) {
        data.categories.forEach(c => {
          rows.push([c.id || "", c.name || "", c.color || "", c.icon || "", c.tags ? (Array.isArray(c.tags) ? c.tags.join(", ") : c.tags) : "", ""]);
        });
      }
      rows.push(["", "", "", "", "", ""]);

      // 3. Доходы (Incomes)
      rows.push([" === INCOMES ===", "", "", "", "", ""]);
      rows.push(["ID", "Name", "Color", "Icon", "", ""]);
      if (data.incomes && Array.isArray(data.incomes)) {
        data.incomes.forEach(i => {
          rows.push([i.id || "", i.name || "", i.color || "", i.icon || "", "", ""]);
        });
      }

      // Записываем всё одним махом — это гораздо надежнее
      if (rows.length > 0) {
        sheet.getRange(1, 1, rows.length, colCount).setValues(rows);
      }
      
      sheet.autoResizeColumns(1, colCount);

      // Автоматический бэкап каждые 10 записей (вместо триггера)
      try {
        const props = PropertiesService.getScriptProperties();
        let syncCount = parseInt(props.getProperty("syncCount") || "0", 10);
        syncCount++;
        
        if (syncCount >= 10) {
          backupConfigs(); // Создаем архив
          props.setProperty("syncCount", "0"); // Сбрасываем счетчик
        } else {
          props.setProperty("syncCount", syncCount.toString());
        }
      } catch (e) {
        // Игнорируем ошибки свойств, чтобы не ломать главную синхронизацию
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Configs updated" })).setMimeType(ContentService.MimeType.JSON);
    }

    
    // Обработка транзакций (Transactions)
    if (data.action === "addTransaction") {
      let sheet = ss.getSheetByName("Transactions") || ss.insertSheet("Transactions");
      
      const defaultHeaders = ["ID", "Date", "Type", "Source", "Destination", "Tag", "Amount", "Amount USD", "Target Amount", "Target USD", "Comment"];
      
      // ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ЗАГОЛОВКОВ (если их меньше 11 — добавляем колонку ID)
      if (sheet.getLastColumn() < 11) {
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(defaultHeaders);
        } else {
          // Обновляем заголовки в 1-й строке
          sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
        }
        sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight("bold");
      }
      
      const lastCol = sheet.getLastColumn();
      const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      const fieldMap = {
        "ID": data.id || "",
        "Date": data.date,
        "Type": data.type,
        "Source": data.sourceName,
        "Destination": data.destinationName,
        "Tag": data.tagName || "",
        "Amount": data.amount,
        "Amount USD": data.amountUSD || "",
        "Target Amount": data.targetAmount || data.amount,
        "Target USD": data.targetAmountUSD || "",
        "Comment": data.comment || ""
      };
      
      const rowData = currentHeaders.map(header => fieldMap[header] !== undefined ? fieldMap[header] : "");
      sheet.appendRow(rowData);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Transaction added" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Обновление существующей транзакции в Transactions
    if (data.action === "updateTransaction") {
      const sheet = ss.getSheetByName("Transactions");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Transactions sheet not found" })).setMimeType(ContentService.MimeType.JSON);
      }

      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      if (lastRow <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No transactions found" })).setMimeType(ContentService.MimeType.JSON);
      }

      const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      const headers = allData[0].map(h => String(h).trim());
      const col = {};
      headers.forEach((h, i) => { col[h] = i; });

      let foundRow = -1;

      // === Primary: find by ID column ===
      if (data.id && col["ID"] !== undefined) {
        for (let i = 1; i < allData.length; i++) {
          const rowId = String(allData[i][col["ID"]] || "").trim();
          if (rowId === data.id) {
            foundRow = i + 1; // 1-indexed
            break;
          }
        }
      }

      // === Fallback: find by date+source+destination+amount (old rows without ID) ===
      if (foundRow === -1) {
        for (let i = 1; i < allData.length; i++) {
          const row = allData[i];
          const rowDate = String(row[col["Date"]] || "").trim();
          const rowSource = String(row[col["Source"]] || "").trim();
          const rowDest = String(row[col["Destination"]] || "").trim();
          const rowAmt = parseFloat(row[col["Amount"]] || 0);
          if (
            rowDate === data.oldDate &&
            rowSource === data.oldSourceName &&
            rowDest === data.oldDestinationName &&
            Math.abs(rowAmt - data.oldAmount) < 0.001
          ) {
            foundRow = i + 1;
            break;
          }
        }
      }

      const fieldMap = {
        "ID": data.id || "",
        "Date": data.date,
        "Type": data.type,
        "Source": data.sourceName,
        "Destination": data.destinationName,
        "Tag": data.tagName || "",
        "Amount": data.amount,
        "Amount USD": data.amountUSD || "",
        "Target Amount": data.targetAmount || data.amount,
        "Target USD": data.targetAmountUSD || "",
        "Comment": data.comment || ""
      };
      const rowData = headers.map(header => fieldMap[header] !== undefined ? fieldMap[header] : "");

      if (foundRow === -1) {
        // Not found — append as new row
        sheet.appendRow(rowData);
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Transaction not found, appended as new" })).setMimeType(ContentService.MimeType.JSON);
      }

      sheet.getRange(foundRow, 1, 1, lastCol).setValues([rowData]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Transaction updated" })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function backupConfigs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("Configs");
  if (!sourceSheet) return;
  
  let targetSheet = ss.getSheetByName("ConfigsArch");
  if (!targetSheet) {
    targetSheet = ss.insertSheet("ConfigsArch");
  } else {
    targetSheet.clear();
  }
  
  const dataRange = sourceSheet.getDataRange();
  const values = dataRange.getValues();
  const backgrounds = dataRange.getBackgrounds();
  const fontColors = dataRange.getFontColors();
  const fontWeights = dataRange.getFontWeights();
  
  if (values.length > 0) {
    const targetRange = targetSheet.getRange(1, 1, values.length, values[0].length);
    targetRange.setValues(values);
    targetRange.setBackgrounds(backgrounds);
    targetRange.setFontColors(fontColors);
    targetRange.setFontWeights(fontWeights);
    targetSheet.autoResizeColumns(1, values[0].length);
  }
}
