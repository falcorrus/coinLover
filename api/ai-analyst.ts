import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { getSheetsClient, MASTER_SS_ID } from './sheets.ts';

function extractPeriod(text: string, currentMonthNum: number, currentYearNum: number): any {
  const textLower = text.toLowerCase();
  
  const monthPatterns = [
    { month: 1, regex: /янв/ },
    { month: 2, regex: /фев/ },
    { month: 3, regex: /мар/ },
    { month: 4, regex: /апр/ },
    { month: 5, regex: /ма[йяею]/ },
    { month: 6, regex: /июн/ },
    { month: 7, regex: /июл/ },
    { month: 8, regex: /авг/ },
    { month: 9, regex: /сен/ },
    { month: 10, regex: /окт/ },
    { month: 11, regex: /ноя/ },
    { month: 12, regex: /дек/ }
  ];

  // 1. Поиск упомянутых месяцев и их позиций в строке
  const foundMonths: { month: number; index: number }[] = [];
  monthPatterns.forEach(pattern => {
    const idx = textLower.search(pattern.regex);
    if (idx !== -1) {
      foundMonths.push({ month: pattern.month, index: idx });
    }
  });

  // Сортируем по порядку появления в тексте
  foundMonths.sort((a, b) => a.index - b.index);

  // Проверяем наличие годов (2024, 2025, 2026...)
  const years = [...textLower.matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1]));

  // Относительные периоды
  const isRelativePrev = textLower.includes('прошл') && textLower.includes('месяц');
  const isRelativePrevPrev = textLower.includes('позапрошл') && textLower.includes('месяц');
  const isRelativeCurrent = (textLower.includes('текущ') && textLower.includes('месяц')) || textLower.includes('этот месяц');
  
  const isAllTime = textLower.includes('за год') || 
                    textLower.includes('всего') || 
                    textLower.includes('за всё время') || 
                    textLower.includes('за все время') || 
                    textLower.includes('истори') || 
                    textLower.includes('history') || 
                    textLower.includes('по месяцам') || 
                    textLower.includes('динамик') || 
                    textLower.includes('тренд') || 
                    textLower.includes('график') || 
                    textLower.includes('сравн');

  const hasRelative = isRelativePrev || isRelativePrevPrev || isRelativeCurrent || isAllTime;
  const hasPeriod = foundMonths.length > 0 || hasRelative || years.length > 0;

  if (!hasPeriod) {
    return { hasPeriod: false };
  }

  // Сценарий 1: Диапазон "с ... по/до ..." (два месяца найдены)
  const isRange = foundMonths.length >= 2 && (
    textLower.includes(' по ') || 
    textLower.includes(' до ') || 
    textLower.includes(' - ') || 
    textLower.includes('—')
  );

  if (isRange) {
    const startMonth = foundMonths[0].month;
    const endMonth = foundMonths[1].month;
    let startYear = currentYearNum;
    let endYear = currentYearNum;

    if (years.length === 2) {
      startYear = years[0];
      endYear = years[1];
    } else if (years.length === 1) {
      startYear = years[0];
      endYear = years[0];
    } else {
      if (startMonth > currentMonthNum) startYear = currentYearNum - 1;
      if (endMonth > currentMonthNum) endYear = currentYearNum - 1;
      if (endMonth < startMonth && startYear === endYear) {
        endYear = startYear + 1;
      }
    }

    return {
      hasPeriod: true,
      isRange: true,
      isStartingFrom: false,
      isAllTime: false,
      startMonth,
      startYear,
      endMonth,
      endYear
    };
  }

  // Сценарий 2: Диапазон "начиная с ..." (один месяц + триггер "с" / "начиная")
  const isStartingFrom = foundMonths.length === 1 && (
    textLower.includes('начиная') || 
    /\b(с|от)\s+(янв|фев|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек)/.test(textLower)
  );

  if (isStartingFrom) {
    const startMonth = foundMonths[0].month;
    let startYear = currentYearNum;
    if (years.length > 0) {
      startYear = years[0];
    } else if (startMonth > currentMonthNum) {
      startYear = currentYearNum - 1;
    }

    return {
      hasPeriod: true,
      isRange: false,
      isStartingFrom: true,
      isAllTime: false,
      startMonth,
      startYear,
      endMonth: currentMonthNum,
      endYear: currentYearNum
    };
  }

  // Сценарий 3: Относительный период
  if (isRelativePrev) {
    let targetMonth = currentMonthNum - 1;
    let targetYear = currentYearNum;
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear = currentYearNum - 1;
    }
    return { hasPeriod: true, isRange: false, isStartingFrom: false, isAllTime: false, targetMonth, targetYear };
  }

  if (isRelativePrevPrev) {
    let targetMonth = currentMonthNum - 2;
    let targetYear = currentYearNum;
    if (targetMonth <= 0) {
      targetMonth = 12 + targetMonth;
      targetYear = currentYearNum - 1;
    }
    return { hasPeriod: true, isRange: false, isStartingFrom: false, isAllTime: false, targetMonth, targetYear };
  }

  if (isRelativeCurrent) {
    return { hasPeriod: true, isRange: false, isStartingFrom: false, isAllTime: false, targetMonth: currentMonthNum, targetYear: currentYearNum };
  }

  if (isAllTime) {
    return { hasPeriod: true, isRange: false, isStartingFrom: false, isAllTime: true };
  }

  // Сценарий 4: Конкретный месяц (один месяц найден)
  if (foundMonths.length === 1) {
    const targetMonth = foundMonths[0].month;
    let targetYear = currentYearNum;
    if (years.length > 0) {
      targetYear = years[0];
    } else if (targetMonth > currentMonthNum) {
      targetYear = currentYearNum - 1;
    }

    return {
      hasPeriod: true,
      isRange: false,
      isStartingFrom: false,
      isAllTime: false,
      targetMonth,
      targetYear
    };
  }

  // Сценарий 5: Указан только год
  if (years.length > 0) {
    return {
      hasPeriod: true,
      isRange: true,
      isStartingFrom: false,
      isAllTime: false,
      startMonth: 1,
      startYear: years[0],
      endMonth: 12,
      endYear: years[0]
    };
  }

  return { hasPeriod: false };
}

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
- \`expenses_by_category\` — расходы по категориям (каждая содержит \`total\` и \`tags\` с их \`total\`)
- \`income_by_category\` — аналогично для доходов
- \`expenses_by_tag\` — расходы, сгруппированные глобально по тегам (содержит \`tag\`, \`total\` и \`transactions\`)
- \`income_by_tag\` — аналогично для доходов
- \`expenses_by_month\` — расходы по месяцам (содержит хронологический список месяцев: \`month\` (MM.YYYY), \`total\`, \`categories\` (категория и ее total в этом месяце), \`tags\` (тег и его total в этом месяце))
- \`income_by_month\` — аналогично для доходов по месяцам
- \`recent_transactions\` — последние 10 транзакций (для контекста при записи новой)

**Правила работы:**
1. Все поля \`total\` в данных — 100% точные числа, вычисленные на сервере. НИКОГДА не пересчитывай их.
2. При ответе на вопрос о сумме — бери значение из \`total\` соответствующей категории или тега напрямую.
3. При перечислении транзакций — бери из поля \`transactions\` внутри нужного \`tag\` (или из глобальных тегов).

---

## АЛГОРИТМ ПОИСКА ПО ЗАПРОСУ
Когда пользователь спрашивает о чём-то (например, "расходы на детей"):
1. Если запрос просит динамику по месяцам (например, "по месяцам", "тренд", "динамика", "сравнение по месяцам"):
   - Найди нужную категорию или тег в списке \`expenses_by_month\` / \`income_by_month\`.
   - Выведи хронологический список месяцев и сумм для этой категории/тега (например: "Май 2026: 1408.11 USD, Июнь 2026: 1090.09 USD"). Не показывай транзакции!
2. В остальных случаях:
   - Найди нужную категорию в \`expenses_by_category\` по смыслу (category) или нужный тег.
   - Выведи \`total\` этой категории/тега как итог. Никаких транзакций не перечисляй!
   - Только если пользователь в запросе явно использует слова-триггеры детализации (подробней, распиши, операции, транзакции, покажи записи), покажи разбивку:
     - Если спросили про категорию: покажи разбивку по тегам (\`tags\`), используя их \`total\`.
     - Если спросили про тег или просят максимальную детализацию: покажи построчный список транзакций из \`transactions\`.

---

## ЛОГИКА ДЕТАЛИЗАЦИИ ("Подробней")
- **По умолчанию (Общий вопрос):** Выводится ТОЛЬКО общая сумма (\`total\`) или список месяцев (при запросе "по месяцам"). Построчные операции скрыты!
- **При явном запросе детализации (подробней, операции):**
  - **Уровень 1 (Категория):** Разбивка по тегам: взять \`tag.total\` для каждого тега.
  - **Уровень 2 (Тег):** Построчный список: взять \`transactions[]\` (дата, сумма, комментарий).

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
3. СТРОГИЕ УРОВНИ ДЕТАЛИЗАЦИИ И АБСТРАКЦИИ:
   - На ЛЮБОЙ первый или общий вопрос (например: "сколько потратил на жилье", "расходы на туризм в мае", "какие траты на еду") ты должен вывести ТОЛЬКО общую сводную сумму (итоговую цифру категории или тега).
   - ТЕБЕ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выводить построчный список транзакций (с датами, комментариями, отдельными суммами), если пользователь явно не попросил об этом в текущем сообщении (используя слова: "подробно", "подробней", "детализация", "распиши", "транзакции", "операции", "покажи записи").
   - Даже если в категории/теге всего одна транзакция, ты всё равно должен вывести ТОЛЬКО общую сумму и НЕ показывать построчную транзакцию без явного запроса детализации!
   - Если пользователь явно запросил детализацию (слова "подробно", "транзакции" и т.д.):
     1. Если X — категория: покажи разбивку по тегам внутри неё.
     2. Если просят ещё подробней (или X — тег): покажи список транзакций (дата - сумма - комментарий).
4. OUTPUT FORMATS:
   - ANALYSIS/LISTS: USE ONLY TEXT/MARKDOWN. 
   - NEW TRANSACTION: USE JSON BLOCK (\`action: "add_transaction"\`).
5. CALCULATION: 
   - Spending = Sum of "base_amt" where "type" == "expense" AND date is valid.
   - NEVER SUBTRACT.
   - ONLY ADDITION is allowed.`;

    // 6. Server-side pre-filtering by period
    let period = extractPeriod(query, currentMonthNum, currentYearNum);
    
    // Если в текущем запросе период не определен, пытаемся унаследовать его из истории сообщений пользователя
    if (!period.hasPeriod && history && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role === 'user' && msg.content) {
          const historicalPeriod = extractPeriod(msg.content, currentMonthNum, currentYearNum);
          if (historicalPeriod.hasPeriod) {
            period = historicalPeriod;
            console.log(`[AI API] Inherited period from user history message: "${msg.content}"`);
            break;
          }
        }
      }
    }

    let filteredTxData: typeof txData;
    let datasetDescription: string;

    if (!period.hasPeriod || period.isAllTime) {
      filteredTxData = txData;
      datasetDescription = `You are receiving up to ${txData.length} transactions (last 12 months) because the user requested all-time or yearly data or no period was resolved.`;
    } else if (period.isRange || period.isStartingFrom) {
      const startValue = period.startYear * 12 + period.startMonth;
      const endValue = period.endYear * 12 + period.endMonth;
      
      filteredTxData = txData.filter(tx => {
        const parts = tx.date.split(' ')[0].split('.');
        if (parts.length < 3) return false;
        const txM = parseInt(parts[1], 10);
        const txY = parseInt(parts[2], 10);
        if (isNaN(txM) || isNaN(txY)) return false;
        const txValue = txY * 12 + txM;
        return txValue >= startValue && txValue <= endValue;
      });
      
      const startMonthStr = String(period.startMonth).padStart(2, '0');
      const endMonthStr = String(period.endMonth).padStart(2, '0');
      datasetDescription = `IMPORTANT: You are receiving transactions for the range: ${startMonthStr}.${period.startYear} to ${endMonthStr}.${period.endYear}. Please provide the breakdown by month for the requested categories/tags in your response.`;
    } else {
      const targetMonthStr = String(period.targetMonth).padStart(2, '0');
      const suffix = `.${targetMonthStr}.${period.targetYear}`;
      filteredTxData = txData.filter(tx => tx.date.endsWith(suffix) || tx.date.includes(`.${targetMonthStr}.${period.targetYear}`));
      datasetDescription = `IMPORTANT: You are receiving ONLY transactions for the specific period: ${targetMonthStr}.${period.targetYear}. All totals and transactions are pre-filtered for this month.`;
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

      const groupByTag = (rows: TxRow[]) => {
        const tagMap: Record<string, TxRow[]> = {};
        rows.forEach(tx => {
          const tag = tx.tag || 'Без тега';
          if (!tagMap[tag]) tagMap[tag] = [];
          tagMap[tag].push(tx);
        });

        return Object.entries(tagMap).map(([tag, tagTxs]) => ({
          tag,
          total: round2(tagTxs.reduce((s, t) => s + t.base_amt, 0)),
          transactions: tagTxs.map(t => ({
            date: t.date,
            amount: round2(t.base_amt),
            comment: t.comment,
            category: t.dst || t.src
          }))
        })).sort((a, b) => b.total - a.total);
      };

      const groupByMonth = (rows: TxRow[]) => {
        const monthMap: Record<string, TxRow[]> = {};
        rows.forEach(tx => {
          if (!tx.date) return;
          const parts = tx.date.split(' ')[0].split('.');
          if (parts.length < 3) return;
          const monthStr = `${parts[1]}.${parts[2]}`; // MM.YYYY
          if (!monthMap[monthStr]) monthMap[monthStr] = [];
          monthMap[monthStr].push(tx);
        });

        return Object.entries(monthMap).map(([month, monthTxs]) => {
          const catMap: Record<string, number> = {};
          const tagMap: Record<string, number> = {};

          monthTxs.forEach(tx => {
            const cat = tx.dst || tx.src || 'Без категории';
            const tag = tx.tag || 'Без тега';
            catMap[cat] = round2((catMap[cat] || 0) + tx.base_amt);
            tagMap[tag] = round2((tagMap[tag] || 0) + tx.base_amt);
          });

          const categories = Object.entries(catMap).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
          const tags = Object.entries(tagMap).map(([tag, total]) => ({ tag, total })).sort((a, b) => b.total - a.total);

          return {
            month,
            total: round2(monthTxs.reduce((s, t) => s + t.base_amt, 0)),
            categories,
            tags
          };
        }).sort((a, b) => {
          const [aM, aY] = a.month.split('.').map(Number);
          const [bM, bY] = b.month.split('.').map(Number);
          return (aY * 12 + aM) - (bY * 12 + bM);
        });
      };

      return {
        period_total_expense: round2(expenseTxs.reduce((s, t) => s + t.base_amt, 0)),
        period_total_income:  round2(incomeTxs.reduce((s, t) => s + t.base_amt, 0)),
        expenses_by_category: groupByCategory(expenseTxs, 'dst'),
        income_by_category:   groupByCategory(incomeTxs, 'src'),
        expenses_by_tag:      groupByTag(expenseTxs),
        income_by_tag:        groupByTag(incomeTxs),
        expenses_by_month:    groupByMonth(expenseTxs),
        income_by_month:      groupByMonth(incomeTxs),
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
