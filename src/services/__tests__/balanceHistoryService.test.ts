import { describe, it, expect } from "vitest";
import { BalanceHistoryService } from "../balanceHistoryService";
import { Account, Transaction } from "../../types";

describe("BalanceHistoryService", () => {
  const mockAccounts: Account[] = [
    {
      id: "acc-main",
      name: "Основная карта",
      balance: 1000,
      currency: "USD",
      color: "#6d5dfc",
      icon: "card"
    },
    {
      id: "acc-cash",
      name: "Наличные",
      balance: 500,
      currency: "USD",
      color: "#10b981",
      icon: "cash"
    }
  ];

  const months = [
    { key: "2026-07", year: 2026, monthIndex: 6, isCurrent: false },
    { key: "2026-08", year: 2026, monthIndex: 7, isCurrent: false },
    { key: "2026-09", year: 2026, monthIndex: 8, isCurrent: true }
  ];

  it("accurately winds back expenses and incomes to compute past month-end balances", () => {
    // Current balances: acc-main = 1000, acc-cash = 500. Total = 1500.
    // Transactions in Sept:
    // - Sept 15: Expense of 200 from acc-main
    // - Sept 10: Income of 500 into acc-main
    // In Aug:
    // - Aug 20: Expense of 100 from acc-cash
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        date: "2026-09-15T10:00:00Z",
        type: "expense",
        accountId: "acc-main",
        targetId: "cat-groceries",
        sourceAmount: 200,
        sourceCurrency: "USD",
        sourceAmountUSD: 200,
        targetAmount: 200,
        targetCurrency: "USD",
        targetAmountUSD: 200
      },
      {
        id: "tx-2",
        date: "2026-09-10T12:00:00Z",
        type: "income",
        accountId: "acc-main",
        targetId: "inc-salary",
        sourceAmount: 500,
        sourceCurrency: "USD",
        sourceAmountUSD: 500,
        targetAmount: 500,
        targetCurrency: "USD",
        targetAmountUSD: 500
      },
      {
        id: "tx-3",
        date: "2026-08-20T15:00:00Z",
        type: "expense",
        accountId: "acc-cash",
        targetId: "cat-coffee",
        sourceAmount: 100,
        sourceCurrency: "USD",
        sourceAmountUSD: 100,
        targetAmount: 100,
        targetCurrency: "USD",
        targetAmountUSD: 100
      }
    ];

    const results = BalanceHistoryService.computeMonthlyBalances(
      mockAccounts,
      transactions,
      months,
      "USD"
    );

    expect(results).toHaveLength(3);

    // 1. Current Month (Sept 2026): Total should be 1000 + 500 = 1500
    const sept = results.find(r => r.monthKey === "2026-09")!;
    expect(sept.totalBase).toBe(1500);

    // 2. End of August 2026:
    // Transactions in Sept are undone:
    // - Expense 200 undone -> +200 to acc-main
    // - Income 500 undone -> -500 to acc-main
    // acc-main on Aug 31: 1000 + 200 - 500 = 700.
    // acc-cash on Aug 31: 500 (no Sept txs on cash)
    // Total on Aug 31: 700 + 500 = 1200.
    const aug = results.find(r => r.monthKey === "2026-08")!;
    expect(aug.totalBase).toBe(1200);
    expect(aug.formattedDate).toBe("31.08.2026");

    const augMain = aug.accountBalances.find(a => a.accountId === "acc-main")!;
    expect(augMain.nativeBalance).toBe(700);

    // Change from Aug to Sept: 1500 - 1200 = +300 (+25%)
    expect(sept.changeFromPrevMonthBase).toBe(300);
    expect(sept.percentChangeFromPrevMonth).toBe(25);

    // 3. End of July 2026:
    // Both Sept txs AND Aug txs are undone:
    // acc-main on July 31: 700
    // acc-cash on July 31: 500 + 100 (Aug 20 expense undone) = 600
    // Total on July 31: 700 + 600 = 1300.
    const july = results.find(r => r.monthKey === "2026-07")!;
    expect(july.totalBase).toBe(1300);
    expect(july.formattedDate).toBe("31.07.2026");

    const julyCash = july.accountBalances.find(a => a.accountId === "acc-cash")!;
    expect(julyCash.nativeBalance).toBe(600);
  });

  it("internal transfers between accounts do not change total wealth", () => {
    // Current balances: A = 1000, B = 500. Total = 1500.
    // On Sept 5: Transfer 300 from A to B
    const transactions: Transaction[] = [
      {
        id: "tx-transfer",
        date: "2026-09-05T10:00:00Z",
        type: "transfer",
        accountId: "acc-main",
        targetId: "acc-cash",
        sourceAmount: 300,
        sourceCurrency: "USD",
        sourceAmountUSD: 300,
        targetAmount: 300,
        targetCurrency: "USD",
        targetAmountUSD: 300
      }
    ];

    const results = BalanceHistoryService.computeMonthlyBalances(
      mockAccounts,
      transactions,
      months,
      "USD"
    );

    const sept = results.find(r => r.monthKey === "2026-09")!;
    const aug = results.find(r => r.monthKey === "2026-08")!;

    // Total remains 1500 in both months!
    expect(sept.totalBase).toBe(1500);
    expect(aug.totalBase).toBe(1500);

    // But individual accounts shift:
    // Aug: acc-main had 1000 + 300 = 1300; acc-cash had 500 - 300 = 200
    const augMain = aug.accountBalances.find(a => a.accountId === "acc-main")!;
    const augCash = aug.accountBalances.find(a => a.accountId === "acc-cash")!;
    expect(augMain.nativeBalance).toBe(1300);
    expect(augCash.nativeBalance).toBe(200);
  });

  it("prioritizes Column J (sourceAmountUSD) for USD accounts", () => {
    // Current balance: USD card = 1000
    // Expense in Sept: 100 EUR, but Column J says exactly 110 USD was charged to the account
    const transactions: Transaction[] = [
      {
        id: "tx-multi",
        date: "2026-09-12T10:00:00Z",
        type: "expense",
        accountId: "acc-main",
        targetId: "cat-foreign",
        sourceAmount: 100,
        sourceCurrency: "EUR",
        sourceAmountUSD: 110, // Column J in Google Sheets
        targetAmount: 100,
        targetCurrency: "EUR",
        targetAmountUSD: 110
      }
    ];

    const results = BalanceHistoryService.computeMonthlyBalances(
      [mockAccounts[0]],
      transactions,
      months,
      "USD"
    );

    const aug = results.find(r => r.monthKey === "2026-08")!;
    // Undoing the Sept expense: 1000 + 110 (from Column J) = 1110
    expect(aug.totalBase).toBe(1110);
    const augAcc = aug.accountBalances.find(a => a.accountId === "acc-main")!;
    expect(augAcc.nativeBalance).toBe(1110);
  });
});
