import { Account, Category, IncomeSource, Transaction } from "../types";
import { formatDateTime } from "../hooks/utils";

export const DEMO_ACCOUNTS: Account[] = [
  { id: "acc-demo-card", name: "Т-Банк Карта", balance: 64300, currency: "RUB", color: "#facc15", icon: "card", balanceUSD: 714.44 },
  { id: "acc-demo-wallet", name: "Наличные", balance: 8400, currency: "RUB", color: "#10b981", icon: "wallet", balanceUSD: 93.33 },
  { id: "acc-demo-crypto", name: "Крипто-кошелек", balance: 2500, currency: "USD", color: "#6d5dfc", icon: "bitcoin", balanceUSD: 2500.00 }
];

export const DEMO_CATEGORIES: Category[] = [
  { id: "cat-demo-food", name: "Продукты", color: "#f59e0b", icon: "food", tags: ["Продукты", "Кафе", "Доставка"] },
  { id: "cat-demo-transit", name: "Транспорт", color: "#3b82f6", icon: "transit", tags: ["Такси", "Бензин", "Метро"] },
  { id: "cat-demo-cafe", name: "Досуг", color: "#ec4899", icon: "cafe", tags: ["Кофе", "Рестораны", "Кино"] },
  { id: "cat-demo-shop", name: "Покупки", color: "#06b6d4", icon: "shop", tags: ["Одежда", "Техника"] },
  { id: "cat-demo-laptop", name: "Подписки & Книги", color: "#8b5cf6", icon: "laptop", tags: ["Книги", "Подписки"] }
];

export const DEMO_INCOMES: IncomeSource[] = [
  { id: "inc-demo-salary", name: "Зарплата", color: "#10b981", icon: "business", tags: [] },
  { id: "inc-demo-freelance", name: "Фриланс", color: "#3b82f6", icon: "laptop", tags: [] }
];

// Генерирует массив транзакций для текущего месяца с шагом в несколько дней
export const getDemoTransactions = (): Transaction[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Помощник для создания даты в текущем месяце
  const createDateStr = (day: number, hour: number, minute: number): string => {
    const d = new Date(year, month, day, hour, minute);
    return formatDateTime(d);
  };

  return [
    {
      id: "tx-demo-1",
      type: "income",
      accountId: "acc-demo-card",
      targetId: "inc-demo-salary",
      sourceAmount: 95000,
      sourceCurrency: "RUB",
      sourceAmountUSD: 1055.56,
      targetAmount: 95000,
      targetCurrency: "RUB",
      targetAmountUSD: 1055.56,
      date: createDateStr(5, 10, 0),
      tag: "Аванс"
    },
    {
      id: "tx-demo-2",
      type: "expense",
      accountId: "acc-demo-card",
      targetId: "cat-demo-food",
      sourceAmount: 2450,
      sourceCurrency: "RUB",
      sourceAmountUSD: 27.22,
      targetAmount: 2450,
      targetCurrency: "RUB",
      targetAmountUSD: 27.22,
      date: createDateStr(6, 18, 30),
      tag: "Продукты",
      comment: "Закупка во ВкусВилл"
    },
    {
      id: "tx-demo-3",
      type: "expense",
      accountId: "acc-demo-card",
      targetId: "cat-demo-transit",
      sourceAmount: 650,
      sourceCurrency: "RUB",
      sourceAmountUSD: 7.22,
      targetAmount: 650,
      targetCurrency: "RUB",
      targetAmountUSD: 7.22,
      date: createDateStr(7, 9, 15),
      tag: "Такси"
    },
    {
      id: "tx-demo-4",
      type: "expense",
      accountId: "acc-demo-card",
      targetId: "cat-demo-cafe",
      sourceAmount: 380,
      sourceCurrency: "RUB",
      sourceAmountUSD: 4.22,
      targetAmount: 380,
      targetCurrency: "RUB",
      targetAmountUSD: 4.22,
      date: createDateStr(7, 14, 20),
      tag: "Кофе",
      comment: "Капучино на миндальном"
    },
    {
      id: "tx-demo-5",
      type: "income",
      accountId: "acc-demo-crypto",
      targetId: "inc-demo-freelance",
      sourceAmount: 500,
      sourceCurrency: "USD",
      sourceAmountUSD: 500.00,
      targetAmount: 500,
      targetCurrency: "USD",
      targetAmountUSD: 500.00,
      date: createDateStr(10, 16, 0),
      tag: "Разработка сайта",
      comment: "Оплата от клиента"
    },
    {
      id: "tx-demo-6",
      type: "transfer",
      accountId: "acc-demo-card",
      targetId: "acc-demo-wallet",
      sourceAmount: 5000,
      sourceCurrency: "RUB",
      sourceAmountUSD: 55.56,
      targetAmount: 5000,
      targetCurrency: "RUB",
      targetAmountUSD: 55.56,
      date: createDateStr(11, 12, 0)
    },
    {
      id: "tx-demo-7",
      type: "expense",
      accountId: "acc-demo-wallet",
      targetId: "cat-demo-food",
      sourceAmount: 1200,
      sourceCurrency: "RUB",
      sourceAmountUSD: 13.33,
      targetAmount: 1200,
      targetCurrency: "RUB",
      targetAmountUSD: 13.33,
      date: createDateStr(12, 19, 45),
      tag: "Продукты",
      comment: "Свежие овощи на рынке"
    },
    {
      id: "tx-demo-8",
      type: "expense",
      accountId: "acc-demo-card",
      targetId: "cat-demo-laptop",
      sourceAmount: 199,
      sourceCurrency: "RUB",
      sourceAmountUSD: 2.21,
      targetAmount: 199,
      targetCurrency: "RUB",
      targetAmountUSD: 2.21,
      date: createDateStr(15, 8, 0),
      tag: "Подписки",
      comment: "Яндекс Плюс"
    },
    {
      id: "tx-demo-9",
      type: "expense",
      accountId: "acc-demo-card",
      targetId: "cat-demo-shop",
      sourceAmount: 5400,
      sourceCurrency: "RUB",
      sourceAmountUSD: 60.00,
      targetAmount: 5400,
      targetCurrency: "RUB",
      targetAmountUSD: 60.00,
      date: createDateStr(16, 15, 30),
      tag: "Одежда",
      comment: "Худи"
    },
    {
      id: "tx-demo-10",
      type: "expense",
      accountId: "acc-demo-card",
      targetId: "cat-demo-cafe",
      sourceAmount: 2100,
      sourceCurrency: "RUB",
      sourceAmountUSD: 23.33,
      targetAmount: 2100,
      targetCurrency: "RUB",
      targetAmountUSD: 23.33,
      date: createDateStr(18, 21, 0),
      tag: "Рестораны",
      comment: "Ужин в Osteria"
    }
  ];
};
