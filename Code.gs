function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Обработка синхронизации настроек (Configs)
    if (data.action === "syncSettings") {
      let sheet = ss.getSheetByName("Configs");
      
      // Создаем лист, если его нет
      if (!sheet) {
        sheet = ss.insertSheet("Configs");
      }
      
      // Очищаем существующие данные
      sheet.clear();
      
      // Пишем заголовки и данные
      sheet.appendRow(["Timestamp", data.timestamp]);
      sheet.appendRow([]); // Пустая строка для отступа
      
      // 1. Кошельки (Accounts)
      sheet.appendRow(["=== WALLETS ==="]);
      sheet.appendRow(["ID", "Name", "Balance", "Color", "Icon"]);
      if (data.accounts && data.accounts.length > 0) {
        const accountRows = data.accounts.map(a => [a.id, a.name, a.balance, a.color, a.icon]);
        sheet.getRange(sheet.getLastRow() + 1, 1, accountRows.length, accountRows[0].length).setValues(accountRows);
      }
      
      sheet.appendRow([]); // Пустая строка
      
      // 2. Категории (Categories)
      sheet.appendRow(["=== CATEGORIES ==="]);
      sheet.appendRow(["ID", "Name", "Color", "Icon", "Tags"]);
      if (data.categories && data.categories.length > 0) {
        const categoryRows = data.categories.map(c => [c.id, c.name, c.color, c.icon, c.tags ? c.tags.join(", ") : ""]);
        sheet.getRange(sheet.getLastRow() + 1, 1, categoryRows.length, categoryRows[0].length).setValues(categoryRows);
      }
      
      sheet.appendRow([]); // Пустая строка
      
      // 3. Доходы (Incomes)
      sheet.appendRow(["=== INCOMES ==="]);
      sheet.appendRow(["ID", "Name", "Color", "Icon"]);
      if (data.incomes && data.incomes.length > 0) {
        const incomeRows = data.incomes.map(i => [i.id, i.name, i.color, i.icon]);
        sheet.getRange(sheet.getLastRow() + 1, 1, incomeRows.length, incomeRows[0].length).setValues(incomeRows);
      }
      
      // Оформление: автоподбор ширины столбцов
      sheet.autoResizeColumns(1, 5);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Configs saved" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Обработка транзакций (Transactions)
    if (data.action === "addTransaction") {
      let sheet = ss.getSheetByName("Transactions") || ss.insertSheet("Transactions");
      
      // Добавляем заголовки, если таблица пустая
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["Date", "Type", "Source", "Destination", "Tag", "Amount"]);
        sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
      }
      
      // Добавляем новую транзакцию
      sheet.appendRow([
        data.date,
        data.type,
        data.sourceName,
        data.destinationName,
        data.tagName || "",
        data.amount
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Transaction added" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
