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
      incomes: []
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
          icon: rows[i][4] || "wallet"
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
      const colCount = 5; // ID, Name, Balance, Color, Icon

      rows.push(["Updated", data.timestamp, "", "", ""]);
      rows.push(["", "", "", "", ""]);

      // 1. Кошельки (Accounts)
      rows.push([" === WALLETS ===", "", "", "", ""]);
      rows.push(["ID", "Name", "Balance", "Color", "Icon"]);
      if (data.accounts && Array.isArray(data.accounts)) {
        data.accounts.forEach(a => {
          rows.push([a.id || "", a.name || "", a.balance || 0, a.color || "", a.icon || ""]);
        });
      }
      rows.push(["", "", "", "", ""]);

      // 2. Категории (Categories)
      rows.push([" === CATEGORIES ===", "", "", "", ""]);
      rows.push(["ID", "Name", "Color", "Icon", "Tags"]);
      if (data.categories && Array.isArray(data.categories)) {
        data.categories.forEach(c => {
          rows.push([c.id || "", c.name || "", c.color || "", c.icon || "", c.tags ? (Array.isArray(c.tags) ? c.tags.join(", ") : c.tags) : ""]);
        });
      }
      rows.push(["", "", "", "", ""]);

      // 3. Доходы (Incomes)
      rows.push([" === INCOMES ===", "", "", "", ""]);
      rows.push(["ID", "Name", "Color", "Icon", ""]);
      if (data.incomes && Array.isArray(data.incomes)) {
        data.incomes.forEach(i => {
          rows.push([i.id || "", i.name || "", i.color || "", i.icon || "", ""]);
        });
      }

      // Записываем всё одним махом — это гораздо надежнее
      if (rows.length > 0) {
        sheet.getRange(1, 1, rows.length, colCount).setValues(rows);
      }
      
      sheet.autoResizeColumns(1, colCount);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Configs updated" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Обработка транзакций (Transactions)
    if (data.action === "addTransaction") {
      let sheet = ss.getSheetByName("Transactions") || ss.insertSheet("Transactions");
      
      const defaultHeaders = ["Date", "Type", "Source", "Destination", "Tag", "Amount", "Target Amount"];
      
      // ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ЗАГОЛОВКОВ (если их меньше 7)
      if (sheet.getLastColumn() < 7) {
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(defaultHeaders);
        } else {
          // Если данные уже есть, но колонок мало — вставляем заголовки в 1-ю строку
          sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
        }
        sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight("bold");
      }
      
      const lastCol = sheet.getLastColumn();
      const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      const fieldMap = {
        "Date": data.date,
        "Type": data.type,
        "Source": data.sourceName,
        "Destination": data.destinationName,
        "Tag": data.tagName || "",
        "Amount": data.amount,
        "Target Amount": data.targetAmount || data.amount
      };
      
      const rowData = currentHeaders.map(header => fieldMap[header] !== undefined ? fieldMap[header] : "");
      sheet.appendRow(rowData);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Transaction added" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function backupConfigsDaily() {
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
