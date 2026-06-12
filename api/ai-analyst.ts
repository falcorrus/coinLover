import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { getSheetsClient, MASTER_SS_ID } from './sheets.ts';

export default async function handler(req, res) {
  // CORS Headers for Native App (Capacitor)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Prevent any browser/CDN caching for API requests
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const sheets = await getSheetsClient();
  if (!sheets) {
    return res.status(500).json({ status: "error", message: "Google Sheets client not initialized." });
  }

  const { body } = req;
  const parsedBody = typeof body === 'string' ? (body ? JSON.parse(body) : {}) : (body || {});
  
  const ssId = parsedBody.ssId;
  const query = parsedBody.query;
  const history = parsedBody.history || [];

  if (!ssId || !query) {
    return res.status(400).json({ status: "error", message: "ssId and query are required." });
  }

  try {
    // 1. Set System Prompt
    let systemPrompt = `# AI System Prompt: CoinLover Assistant

Ты — умный профессиональный финансовый AI-аналитик и помощник приложения CoinLover. 
Твоя задача — анализировать финансовые данные пользователя (Google Sheets) и помогать быстро вносить новые транзакции.

---

## КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ
- Сегодняшняя дата: {{CURRENT_DATE}}
- Текущая валюта: {{CURRENCY}}
- Список кошельков: {{WALLETS}}
- Список категорий: {{CATEGORIES}}
- Список тегов: {{TAGS}}

---

## БАЗОВЫЕ ПРАВИЛА (ОГРАНИЧЕНИЯ)
1. **ПЕРИОД ПО УМОЛЧАНИЮ:** Если пользователь в запросе не указал конкретную дату или период (например: "сколько я потратил на кофе?"), ВСЕГДА используй текущий месяц (с 1-го числа текущего месяца до сегодняшней даты включительно).
2. **ОПРЕДЕЛЕНИЕ ТИПА:** Расходы — это строго тип \`expense\` (столбец B). Доходы — это строго тип \`income\` (столбец B). Всегда фильтруй данные по этому столбцу перед любыми расчетами.
3. **МАТЕМАТИКА:** Из математических операций тебе разрешено использовать ТОЛЬКО сложение (суммирование строк). Запрещено вычислять среднее, вычитать или прогнозировать, если об этом нет явной системной команды.

---

## АЛГОРИТМ ПОИСКА ДАННЫХ (От общего к частному)
Пользователи мыслят абстракциями. Когда поступает запрос (например, "расходы на жилье"), действуй строго по этому алгоритму:
1. **Шаг 1:** Определи период (по умолчанию — текущий месяц).
2. **Шаг 2:** Отфильтруй тип операций (например, только \`expense\`).
3. **Шаг 3:** Ищи совпадения по сущности в столбце "CATEGORIES" (Категории).
4. **Шаг 4:** Если точного или смыслового совпадения в Категориях НЕТ, переходи к поиску по столбцу "Tags" (Теги) и комментариям (столбец Description).

---

## ЛОГИКА ДЕТАЛИЗАЦИИ ("Подробней")
Когда пользователь просит "подробней", "распиши" или задает уточняющий вопрос, спускайся на один уровень абстракции ниже по следующей цепочке:
- **Уровень 1 (Высокий):** Общая сумма (например: "Всего расходов за май: 1500$").
- **Уровень 2 (Средний):** Группировка (например: "Расходы на Жилье: 1000$, из них Аренда 800$, Коммуналка 200$ / или разбивка по тегам").
- **Уровень 3 (Низкий):** Построчный список (Детальный список конкретных транзакций: Дата, Сумма, Категория/Тег, Комментарий).

---

## РЕЖИМЫ ОТВЕТА (ВНИМАНИЕ!)

### 1. Текстовый анализ (Markdown) — ДЛЯ ВСЕХ ВОПРОСОВ АНАЛИЗА
Если пользователь просит: показать операции, посчитать траты, дать подробности, сравнить периоды.
- Отвечай ТОЛЬКО текстом с использованием Markdown. Отвечай коротко и по делу. Суммы выводи в понятном формате. Если данных за период нет, так и скажи: "За этот период нет записей по данному запросу."
- **Никогда не используй JSON для этих запросов.**
- Если просят "подробней" или "показать операции" — выведи список транзакций из предоставленных данных в виде красивого списка. Пример: "11.06 - Продукты: 500 руб (Пятерочка)".

### 2. JSON блок — ТОЛЬКО ДЛЯ СОЗДАНИЯ НОВЫХ ТРАТ
Если пользователь говорит: "купил кофе за 200", "запиши расход 500".
- Верни ответ в формате JSON:
  \`\`\`json
  {
    "action": "add_transaction",
    "amount": 200,
    "wallet_id": "",
    "category": "КАТЕГОРИЯ",
    "tag": "ТЕГ (необязательно)",
    "description": "ОПИСАНИЕ",
    "is_ambiguous": true
  }
  \`\`\`
- ВАЖНО: Если пользователь явно не указал кошелек/счет для расхода, обязательно установи \`"is_ambiguous": true\` и оставь \`wallet_id\` пустым. Это вызовет кнопки выбора кошелька в интерфейсе.
- ТЕГИ (АВТОМАТИЗАЦИЯ): Обязательно проанализируй последние 10 транзакций. Если похожая трата уже была, используй такой же тег. Если нет — выбери наиболее подходящий из списка тегов. Если ничего не подходит, оставь поле \`tag\` пустым ("").
- Обязательно добавь текстовое пояснение ПОСЛЕ или ДО блока JSON.

---

## ПРАВИЛА ПОВЕДЕНИЯ
1. НЕ ПРИДУМЫВАЙ новые действия типа "show_operations" в JSON. Это сломает систему.
2. Весь просмотр истории и анализ — это текстовый режим.
3. Будь лаконичен и точен.`;

    // 2. Fetch Data (Transactions & Configs)
    // Use UNFORMATTED_VALUE to get raw numbers instead of localized strings
    const [txRes, configRes] = await Promise.all([
      sheets.spreadsheets.values.get({ 
        spreadsheetId: ssId, 
        range: 'Transactions!A:L',
        valueRenderOption: 'UNFORMATTED_VALUE'
      }),
      sheets.spreadsheets.values.get({ 
        spreadsheetId: ssId, 
        range: 'Configs!A:M',
        valueRenderOption: 'UNFORMATTED_VALUE'
      })
    ]);

    const txRows = txRes.data.values || [];
    const configRows = configRes.data.values || [];

    // 3. Process Configs (Wallets, Categories, Currency)
    let baseCurrency = "USD";
    const wallets: string[] = [];
    const categories: string[] = [];
    const tags: string[] = [];

    // Find headers in Configs
    const configHeaders = configRows[0] || [];
    const typeIdx = configHeaders.indexOf('Type');
    const nameIdx = configHeaders.indexOf('Name');
    const valIdx = configHeaders.indexOf('Value');

    configRows.forEach((row, i) => {
      if (i === 0) return;
      const type = String(row[typeIdx] || "").toLowerCase();
      const name = String(row[nameIdx] || "");
      
      if (type === 'wallet') wallets.push(name);
      if (type === 'category') categories.push(name);
      if (type === 'tag') tags.push(name);
      if (name.toLowerCase() === 'base_currency') baseCurrency = String(row[valIdx] || "USD");
    });

    // 4. Process Transactions (Limit to last 500 for deep analysis)
    const txHeaders = txRows[0] || [];
    const ids = txHeaders.map(h => String(h).trim().toLowerCase());
    
    // Map indices for key columns
    const dateIdx = ids.indexOf('date');
    const typeIdxTx = ids.indexOf('type');
    const baseAmtIdx = ids.indexOf('base_amt');
    const dstIdx = ids.indexOf('dst');
    const srcIdx = ids.indexOf('src');
    const tagIdx = ids.indexOf('tag');
    const commentIdx = ids.indexOf('comment');

    const recentRows = txRows.slice(-500);
    const txData = recentRows.map(row => {
      const rawAmt = row[baseAmtIdx];
      let cleanAmt = 0;
      if (typeof rawAmt === 'number') {
        cleanAmt = rawAmt;
      } else if (typeof rawAmt === 'string') {
        cleanAmt = parseFloat(rawAmt.replace(/[^\d.-]/g, '').replace(',', '.'));
      }
      
      return {
        date: String(row[dateIdx] || ""),
        type: String(row[typeIdxTx] || "").toLowerCase(),
        src: String(row[srcIdx] || ""),
        dst: String(row[dstIdx] || ""),
        tag: String(row[tagIdx] || ""),
        base_amt: isNaN(cleanAmt) ? 0 : cleanAmt,
        comment: String(row[commentIdx] || "")
      };
    }).filter(tx => tx.date && tx.date.toLowerCase() !== 'date' && tx.date !== 'Дата');

    // 5. Replace Placeholders in System Prompt
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;
    const currentYearNum = now.getFullYear();
    const currentMonthName = now.toLocaleString('ru-RU', { month: 'long' });
    const monthFilter = `.${currentMonthNum < 10 ? '0' + currentMonthNum : currentMonthNum}.${currentYearNum}`;

    const currentDate = now.toLocaleDateString('ru-RU');
    systemPrompt = systemPrompt
      .replace('{{CURRENT_DATE}}', currentDate)
      .replace('{{CURRENCY}}', baseCurrency)
      .replace('{{WALLETS}}', wallets.join(', '))
      .replace('{{CATEGORIES}}', categories.join(', '))
      .replace('{{TAGS}}', tags.join(', '));

    // Add indestructible calculation rules
    systemPrompt += `\n\n### CRITICAL FINANCIAL ANALYSIS RULES (STRICT ENFORCEMENT)
1. DATA SOURCE:
   - Use "base_amt" (Column J in your table) as the SOLE SOURCE for money.
   - NEVER perform currency conversions. Values are already converted.
2. RIGID DATE FILTERING:
   - CURRENT DATE is ${currentDate}.
   - IF NO PERIOD IS SPECIFIED: You MUST ONLY use transactions from the current month (${currentMonthName} ${currentYearNum}).
   - You must parse the "date" field (format is typically DD.MM.YYYY, but can vary) and DISCARD any transaction that does not fall within the requested period.
   - FORBIDDEN: Including transactions from previous months if the user asked about "this month" or didn't specify a date.
3. ABSTRACTION LEVELS FOR DETAILED REQUESTS:
   - If the user asks for details ("подробней", "распиши"), you MUST follow this hierarchy:
     1. Group by Categories ("dst" for expenses, "src" for incomes).
     2. Group by Tags ("tag" column).
     3. Finally, list individual transactions line-by-line.
   - DO NOT jump straight to a line-by-line list unless the user specifically asks for all operations or there is only a single category/tag.
4. OUTPUT FORMATS:
   - ANALYSIS/LISTS: USE ONLY TEXT/MARKDOWN. 
   - NEW TRANSACTION: USE JSON BLOCK (\`action: "add_transaction"\`).
5. CALCULATION: 
   - Spending = Sum of "base_amt" where "type" == "expense" AND date is valid.
   - NEVER SUBTRACT.
   - ONLY ADDITION is allowed.`;

    // 6. Call OpenRouter
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return res.status(500).json({ status: "error", message: "OPENROUTER_API_KEY is missing." });
    }

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://coinlover.ru",
        "X-Title": "CoinLover AI Analyst"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: `Financial Data (JSON):\n${JSON.stringify(txData)}\n\nUser Question: ${query}` }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      throw new Error(`OpenRouter API error: ${errorData}`);
    }

    const data = await aiResponse.json();
    return res.status(200).json(data);

  } catch (err: any) {
    console.error("[AI API] Error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
}
