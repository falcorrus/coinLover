import { describe, it, expect } from "vitest";
import { ReconciliationService } from "../reconciliationService";
import { Account, Transaction } from "../../types";

describe("ReconciliationService", () => {
  const accounts: Account[] = [
    { id: "acc-1", name: "Bybit", balance: 6920, currency: "USD", color: "#6d5dfc", icon: "bitcoin" },
    { id: "acc-2", name: "BRL", balance: 3345, currency: "BRL", color: "#06b6d4", icon: "wallet" },
  ];

  it("should calculate exact balances when replaying transactions from checkpoint", () => {
    const checkpoints = {
      "acc-1": 7557.41,
      "acc-2": 2000,
    };
    const checkpointDate = "2026-09-04 00:00:00";

    const transactions: Transaction[] = [
      // Transfer Bybit -> BRL: 400 USD -> 2052 BRL
      {
        id: "tx-1",
        date: "2026-09-04T09:00:00.000Z",
        type: "transfer",
        accountId: "acc-1",
        targetId: "acc-2",
        sourceAmount: 400,
        sourceCurrency: "USD",
        targetAmount: 2052,
        targetCurrency: "BRL",
        sourceAmountUSD: 400,
        targetAmountUSD: 400,
      },
      // Transfer Bybit -> BRL: 240.05 USD -> 1223 BRL
      {
        id: "tx-2",
        date: "2026-09-04T12:35:00.000Z",
        type: "transfer",
        accountId: "acc-1",
        targetId: "acc-2",
        sourceAmount: 240.05,
        sourceCurrency: "USD",
        targetAmount: 1223,
        targetCurrency: "BRL",
        sourceAmountUSD: 240.05,
        targetAmountUSD: 240.05,
      },
      // Transfer Bybit -> ARS: 782 USD
      {
        id: "tx-3",
        date: "2026-09-04T12:38:00.000Z",
        type: "transfer",
        accountId: "acc-1",
        targetId: "acc-3",
        sourceAmount: 782,
        sourceCurrency: "USD",
        targetAmount: 1179421.08,
        targetCurrency: "ARS",
        sourceAmountUSD: 782,
        targetAmountUSD: 782,
      },
    ];

    const report = ReconciliationService.compute(accounts, transactions, checkpoints, checkpointDate);

    expect(report.hasAnyDiscrepancies).toBe(true);

    const bybit = report.results.find((r) => r.account.id === "acc-1");
    expect(bybit).toBeDefined();
    // 7557.41 - 400 - 240.05 - 782 = 6135.36
    expect(bybit!.reconciledBalance).toBe(6135.36);
    expect(bybit!.currentBalance).toBe(6920);
    expect(bybit!.difference).toBe(-784.64);
    expect(bybit!.hasDiscrepancy).toBe(true);

    const brl = report.results.find((r) => r.account.id === "acc-2");
    expect(brl).toBeDefined();
    // 2000 + 2052 + 1223 = 5275
    expect(brl!.reconciledBalance).toBe(5275);
  });

  it("should report no discrepancies when balances match the ledger", () => {
    const matchingAccounts: Account[] = [
      { id: "acc-1", name: "Bybit", balance: 6135.36, currency: "USD", color: "#6d5dfc", icon: "bitcoin" },
    ];
    const checkpoints = { "acc-1": 7000 };
    const checkpointDate = "2026-09-04T00:00:00.000Z";
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        date: "2026-09-04T10:00:00.000Z",
        type: "expense",
        accountId: "acc-1",
        targetId: "cat-1",
        sourceAmount: 864.64,
        sourceCurrency: "USD",
        targetAmount: 864.64,
        targetCurrency: "USD",
      },
    ];

    const report = ReconciliationService.compute(matchingAccounts, transactions, checkpoints, checkpointDate);
    expect(report.hasAnyDiscrepancies).toBe(false);
    expect(report.totalDiscrepanciesCount).toBe(0);
    expect(report.results[0].difference).toBe(0);
  });
});
