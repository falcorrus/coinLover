import { useState, useEffect, useCallback } from "react";
import { Account, Transaction, Category, IncomeSource, TransactionType } from "../types";
import { googleSheetsService } from "../services/googleSheets";
import { DEFAULT_CATEGORIES, INITIAL_INCOMES } from "../constants";
import { INITIAL_ACCOUNTS } from "../constants";

export type SyncStatus = "idle" | "loading" | "error" | "success";

export const useFinance = () => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem("cl_accounts");
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("cl_categories");
    const data: Category[] = saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    // Sanitize: Ensure tags exists for all categories (prevents crashes with old data)
    return data.map(c => ({ ...c, tags: c.tags || [] }));
  });

  const [incomes, setIncomes] = useState<IncomeSource[]>(() => {
    const saved = localStorage.getItem("cl_incomes");
    return saved ? JSON.parse(saved) : INITIAL_INCOMES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("cl_transactions");
    return saved ? JSON.parse(saved) : [];
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  // ── Auto-save to localStorage ─────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("cl_accounts", JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem("cl_categories", JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem("cl_incomes", JSON.stringify(incomes)); }, [incomes]);
  useEffect(() => { localStorage.setItem("cl_transactions", JSON.stringify(transactions)); }, [transactions]);

  const pushSettings = useCallback(
    async (
      latestAccounts: Account[],
      latestCategories: Category[],
      latestIncomes: IncomeSource[]
    ) => {
      setSyncStatus("loading");
      const timestamp = new Date().toISOString();
      const ok = await googleSheetsService.syncToSheets({
        action: "syncSettings",
        targetSheet: "Configs",
        accounts: latestAccounts,
        categories: latestCategories,
        incomes: latestIncomes,
        timestamp,
      });
      setSyncStatus(ok ? "success" : "error");
    },
    []
  );

  // ── Transactions ───────────────────────────────────────────────────────────
  const addTransaction = async (
    type: TransactionType,
    source: Account | IncomeSource,
    destination: Account | Category,
    amount: number,
    tag?: string
  ) => {
    const date = new Date().toISOString();
    const newTx: Transaction = {
      id: Date.now().toString(),
      type,
      accountId: type === "income" ? (destination as Account).id : (source as Account).id,
      targetId: type === "income" ? source.id : destination.id,
      amount,
      date,
      tag,
    };

    setTransactions((prev) => [newTx, ...prev]);

    const updatedAccounts = accounts.map((a) => {
      if (type === "expense" && a.id === source.id) return { ...a, balance: a.balance - amount };
      if (type === "income" && a.id === (destination as Account).id) return { ...a, balance: a.balance + amount };
      if (type === "transfer") {
        if (a.id === source.id) return { ...a, balance: a.balance - amount };
        if (a.id === destination.id) return { ...a, balance: a.balance + amount };
      }
      return a;
    });
    setAccounts(updatedAccounts);

    setSyncStatus("loading");
    const ok = await googleSheetsService.syncToSheets({
      action: "addTransaction",
      targetSheet: "Transactions",
      date,
      type,
      sourceName: source.name,
      destinationName: destination.name,
      tagName: tag ?? "",
      amount,
    });

    // Also background sync updated balances to Configs
    await googleSheetsService.syncToSheets({
      action: "syncSettings",
      targetSheet: "Configs",
      accounts: updatedAccounts,
      categories,
      incomes,
      timestamp: date,
    });

    setSyncStatus(ok ? "success" : "error");
  };

  // ── Accounts ───────────────────────────────────────────────────────────────
  const saveAccount = async (account: Partial<Account>) => {
    const updated = account.id
      ? accounts.map((a) => (a.id === account.id ? { ...a, ...account } : a))
      : [...accounts, { ...account, id: `acc-${Date.now()}` } as Account];
    setAccounts(updated);
    await pushSettings(updated, categories, incomes);
  };

  const deleteAccount = async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    await pushSettings(updated, categories, incomes);
  };

  // ── Settings: categories & incomes ────────────────────────────────────────
  /** Called from App when categories order/content changes via D&D or edit */
  const syncCategories = async (updated: Category[]) => {
    setCategories(updated);
    await pushSettings(accounts, updated, incomes);
  };

  /** Called from App when incomes order/content changes via D&D or edit */
  const syncIncomes = async (updated: IncomeSource[]) => {
    setIncomes(updated);
    await pushSettings(accounts, categories, updated);
  };

  /** Called from App when accounts order changes via D&D */
  const syncAccountsOrder = async (updated: Account[]) => {
    setAccounts(updated);
    await pushSettings(updated, categories, incomes);
  };

  return {
    accounts, setAccounts,
    categories, setCategories,
    incomes, setIncomes,
    transactions,
    syncStatus,
    addTransaction,
    saveAccount,
    deleteAccount,
    syncCategories,
    syncIncomes,
    syncAccountsOrder,
  };
};
