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
3. **МАТЕМАТИКА:** Тебе ЗАПРЕЩЕНО самостоятельно вычислять любые суммы. Все итоги уже посчитаны на сервере и переданы тебе в поле \`PRE-COMPUTED FINANCIAL DATA\`. Используй только эти цифры.

---

## АЛГОРИТМ РАБОТЫ С PRE-COMPUTED DATA
Тебе передаётся готовая структура данных:
- \`period_total_expense\` — итоговая сумма расходов за период (ТОЧНАЯ)
- \`period_total_income\` — итоговая сумма доходов за период (ТОЧНАЯ)
- \`expenses_by_category\` — расходы по категориям, каждая содержит \`total\` и \`tags\` с их \`total\` и списком транзакций
- \`income_by_category\` — аналогично для доходов
- \`recent_transactions\` — последние 10 транзакций (для контекста при записи новой)

**Правила работы:**
1. Все поля \`total\` в данных — 100% точные числа, вычисленные на сервере. НИКОГДА не пересчитывай их.
2. При ответе на вопрос о сумме — бери значение из \`total\` соответствующей группы напрямую.
3. При перечислении транзакций — бери из поля \`transactions\` внутри нужного \`tag\`.

---

## АЛГОРИТМ ПОИСКА ПО ЗАПРОСУ
Когда пользователь спрашивает о чём-то (например, "расходы на детей"):
1. Найди нужную категорию в \`expenses_by_category\` по смыслу (category).
2. Выведи \`total\` этой категории как итог.
3. Если просят подробней — покажи разбивку по тегам (\`tags\`), используя их \`total\`.
4. Если просят ещё подробней — покажи транзакции из \`transactions\`.

---

## ЛОГИКА ДЕТАЛИЗАЦИИ ("Подробней")
- **Уровень 1:** Итог по категории: взять \`category.total\`
- **Уровень 2:** Разбивка по тегам: взять \`tag.total\` для каждого тега
- **Уровень 3:** Построчный список: взять \`transactions[]\` из нужного тега

---

## РЕЖИМЫ ОТВЕТА (ВНИМАНИЕ!)

### 1. Текстовый анализ (Markdown) — ДЛЯ ВСЕХ ВОПРОСОВ АНАЛИЗА
- Отвечай ТОЛЬКО текстом с Markdown. Коротко и по делу.
- Суммы бери ТОЛЬКО из pre-computed полей \`total\`. Не складывай и не вычитай.
- **Никогда не используй JSON для аналитических запросов.**
- Пример вывода транзакций: "04.06 - 39.76 USD (Даниэле за транспорт)"

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
- ВАЖНО: Если пользователь явно не указал кошелек, установи \`"is_ambiguous": true\` и оставь \`wallet_id\` пустым.
- ТЕГИ: Посмотри на \`recent_transactions\` — если похожая трата уже была с тегом, используй тот же тег.
- Добавь текстовое пояснение ДО или ПОСЛЕ блока JSON.

---

## ПРАВИЛА ПОВЕДЕНИЯ
1. НЕ ПРИДУМЫВАЙ новые действия в JSON (только \`add_transaction\`).
2. Весь просмотр истории и анализ — это текстовый режим.
3. Будь лаконичен и точен.
4. Никогда не говори "я не могу посчитать" — данные уже посчитаны, просто читай их.`;


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

    // Helper: convert Excel serial date OR string date to DD.MM.YYYY
    const parseToDateStr = (rawDate: any): string => {
      if (!rawDate) return "";
      // If it's a number, it's an Excel serial date (days since 1899-12-30)
      if (typeof rawDate === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const d = new Date(excelEpoch.getTime() + rawDate * 86400000);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
      }
      // If it's already a string in recognizable format, return as-is
      return String(rawDate);
    };

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
        date: parseToDateStr(row[dateIdx]),
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
    const currentMonthStr = `${String(currentMonthNum).padStart(2, '0')}.${currentYearNum}`;
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

    // 6. Server-side pre-filtering by period
    const queryLower = query.toLowerCase();
    
    let targetMonth = currentMonthNum;
    let targetYear = currentYearNum;
    let isSpecificMonth = false;
    let isAllTime = false;
    
    const monthsMap: Record<string, number> = {
      'январ': 1, 'феврал': 2, 'март': 3, 'апрел': 4, 'май': 5, 'мая': 5, 'мае': 5,
      'июн': 6, 'июл': 7, 'август': 8, 'сентябр': 9, 'октябр': 10, 'ноябр': 11, 'декабр': 12
    };

    // Check for explicit month mentions
    for (const [key, val] of Object.entries(monthsMap)) {
      if (queryLower.includes(key)) {
        targetMonth = val;
        isSpecificMonth = true;
        break;
      }
    }

    // Check for explicit year mentions (e.g. 2024, 2025, 2026)
    const yearMatch = queryLower.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      targetYear = parseInt(yearMatch[1]);
      isSpecificMonth = true;
    } else if (isSpecificMonth) {
      // If month was mentioned but no year, assume current or previous year
      if (targetMonth > currentMonthNum) {
        targetYear = currentYearNum - 1;
      } else {
        targetYear = currentYearNum;
      }
    }

    // Check for relative periods
    if (queryLower.includes('прошл') && queryLower.includes('месяц')) {
      targetMonth = currentMonthNum - 1;
      targetYear = currentYearNum;
      if (targetMonth === 0) {
        targetMonth = 12;
        targetYear = currentYearNum - 1;
      }
      isSpecificMonth = true;
    } else if (queryLower.includes('позапрошл') && queryLower.includes('месяц')) {
      targetMonth = currentMonthNum - 2;
      targetYear = currentYearNum;
      if (targetMonth <= 0) {
        targetMonth = 12 + targetMonth;
        targetYear = currentYearNum - 1;
      }
      isSpecificMonth = true;
    } else if ((queryLower.includes('текущ') && queryLower.includes('месяц')) || queryLower.includes('этот месяц')) {
      targetMonth = currentMonthNum;
      targetYear = currentYearNum;
      isSpecificMonth = true;
    }

    if (queryLower.includes('за год') || queryLower.includes('всего') || queryLower.includes('за всё время') || queryLower.includes('за все время') || queryLower.includes('истори') || queryLower.includes('history')) {
      isAllTime = true;
    }

    let filteredTxData: typeof txData;
    let datasetDescription: string;

    if (isAllTime) {
      filteredTxData = txData;
      datasetDescription = `You are receiving up to ${txData.length} transactions (last 12 months) because the user requested all-time or yearly data.`;
    } else {
      const targetMonthStr = String(targetMonth).padStart(2, '0');
      const suffix = `.${targetMonthStr}.${targetYear}`;
      filteredTxData = txData.filter(tx => tx.date.endsWith(suffix) || tx.date.includes(`.${targetMonthStr}.${targetYear}`));
      datasetDescription = `IMPORTANT: You are receiving ONLY transactions for the specific period: ${targetMonthStr}.${targetYear}. All totals and transactions are pre-filtered for this month.`;
    }

    // 7. Server-side aggregation — all math is done here, AI only formats
    type TxRow = { date: string; type: string; src: string; dst: string; tag: string; base_amt: number; comment: string; };
    
    const buildAggregates = (txs: TxRow[]) => {
      // Round helper to avoid floating point drift
      const round2 = (n: number) => Math.round(n * 100) / 100;

      const expenseTxs = txs.filter(tx => tx.type === 'expense');
      const incomeTxs  = txs.filter(tx => tx.type === 'income');

      const groupByCategory = (rows: TxRow[], categoryField: 'dst' | 'src') => {
        const catMap: Record<string, TxRow[]> = {};
        rows.forEach(tx => {
          const cat = tx[categoryField] || 'Без категории';
          if (!catMap[cat]) catMap[cat] = [];
          catMap[cat].push(tx);
        });

        return Object.entries(catMap).map(([category, catTxs]) => {
          const tagMap: Record<string, TxRow[]> = {};
          catTxs.forEach(tx => {
            const tag = tx.tag || 'Без тега';
            if (!tagMap[tag]) tagMap[tag] = [];
            tagMap[tag].push(tx);
          });

          const tags = Object.entries(tagMap).map(([tag, tagTxs]) => ({
            tag,
            total: round2(tagTxs.reduce((s, t) => s + t.base_amt, 0)),
            transactions: tagTxs.map(t => ({
              date: t.date,
              amount: round2(t.base_amt),
              comment: t.comment
            }))
          }));

          return {
            category,
            total: round2(catTxs.reduce((s, t) => s + t.base_amt, 0)),
            tags
          };
        }).sort((a, b) => b.total - a.total);
      };

      return {
        period_total_expense: round2(expenseTxs.reduce((s, t) => s + t.base_amt, 0)),
        period_total_income:  round2(incomeTxs.reduce((s, t) => s + t.base_amt, 0)),
        expenses_by_category: groupByCategory(expenseTxs, 'dst'),
        income_by_category:   groupByCategory(incomeTxs, 'src'),
        // Also keep recent raw transactions for add_transaction tag suggestion
        recent_transactions: txs.slice(-10).map(t => ({
          date: t.date, type: t.type, category: t.dst || t.src, tag: t.tag, amount: round2(t.base_amt), comment: t.comment
        }))
      };
    };

    const aggregates = buildAggregates(filteredTxData);

    const userMessageContent = [
      `=== DATA CONTEXT ===`,
      `Today: ${currentDate}`,
      `Current month: ${currentMonthStr}`,
      datasetDescription,
      `Currency: ${baseCurrency}`,
      `===================`,
      ``,
      `## PRE-COMPUTED FINANCIAL DATA`,
      `CRITICAL: All totals below are 100% accurate — computed server-side. DO NOT recalculate them.`,
      `Use ONLY these numbers in your response. Copy them exactly as-is.`,
      ``,
      JSON.stringify(aggregates, null, 2),
      ``,
      `User Question: ${query}`
    ].join('\n');


    // 7. Call OpenRouter
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: userMessageContent }
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
