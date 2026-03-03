import { useState, useEffect, useCallback } from "react";
import { Account, Transaction, Category, IncomeSource, TransactionType } from "../types";
import { googleSheetsService } from "../services/googleSheets";
import { DEFAULT_CATEGORIES, INITIAL_INCOMES } from "../constants";
import { INITIAL_ACCOUNTS } from "../constants";

export type SyncStatus = "idle" | "loading" | "error" | "success";

const getLocalTimeString = (dateInput?: string) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

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
  const [conflictData, setConflictData] = useState<any | null>(null);

  // ── Sync Helpers ────────────────────────────────────────────────────────
  const updateLocalFromRemote = useCallback((data: any) => {
    if (data.accounts) setAccounts(data.accounts);
    if (data.categories) setCategories(data.categories);
    if (data.incomes) setIncomes(data.incomes);
    if (data.timestamp) localStorage.setItem("cl_last_sync", data.timestamp);
    setConflictData(null);
  }, []);

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
      const timestamp = getLocalTimeString();
      const ok = await googleSheetsService.syncToSheets({
        action: "syncSettings",
        targetSheet: "Configs",
        accounts: latestAccounts,
        categories: latestCategories,
        incomes: latestIncomes,
        timestamp,
      });

      if (ok) {
        localStorage.setItem("cl_last_sync", timestamp);
        setSyncStatus("success");
      } else {
        setSyncStatus("error");
      }
    },
    []
  );

  // ── Transactions ───────────────────────────────────────────────────────────
  const addTransaction = async (
    type: TransactionType,
    source: Account | IncomeSource,
    destination: Account | Category,
    amount: number,
    targetAmount?: number,
    tag?: string,
    customDate?: string,
    comment?: string
  ) => {
    const date = customDate ? getLocalTimeString(customDate) : getLocalTimeString();

    const newTx: Transaction = {
      id: Date.now().toString(),
      type,
      accountId: type === "income" ? (destination as Account).id : (source as Account).id,
      targetId: type === "income" ? source.id : (destination as Category).id,
      amount,
      targetAmount: targetAmount ?? amount,
      date,
      tag,
      comment: comment || undefined,
    };

    setTransactions((prev) => [newTx, ...prev]);

    const finalTargetAmount = targetAmount ?? amount;

    const updatedAccounts = accounts.map((a) => {
      if (type === "expense" && a.id === source.id) return { ...a, balance: a.balance - amount };
      if (type === "income" && a.id === (destination as Account).id) return { ...a, balance: a.balance + (targetAmount ?? amount) };
      if (type === "transfer") {
        if (a.id === source.id) return { ...a, balance: a.balance - amount };
        if (a.id === (destination as Account).id) return { ...a, balance: a.balance + finalTargetAmount };
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
      targetAmount: finalTargetAmount,
      comment: comment || undefined,
    });

    // Also background sync updated balances to Configs
    const configsOk = await googleSheetsService.syncToSheets({
      action: "syncSettings",
      targetSheet: "Configs",
      accounts: updatedAccounts,
      categories,
      incomes,
      timestamp: date,
    });

    if (ok && configsOk) {
      localStorage.setItem("cl_last_sync", date);
      setSyncStatus("success");
    } else {
      setSyncStatus("error");
    }
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

  const saveCategory = async (category: Partial<Category>) => {
    const updated = category.id
      ? categories.map((c) => (c.id === category.id ? { ...c, ...category } : c))
      : [...categories, { ...category, id: `cat-${Date.now()}`, tags: category.tags ?? [] } as Category];
    setCategories(updated);
    await pushSettings(accounts, updated, incomes);
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter((c) => c.id !== id);
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

  const saveIncome = async (income: Partial<IncomeSource>) => {
    const updated = income.id
      ? incomes.map((i) => (i.id === income.id ? { ...i, ...income } : i))
      : [...incomes, { ...income, id: `inc-${Date.now()}` } as IncomeSource];
    setIncomes(updated);
    await pushSettings(accounts, categories, updated);
  };

  const deleteIncome = async (id: string) => {
    const updated = incomes.filter((i) => i.id !== id);
    setIncomes(updated);
    await pushSettings(accounts, categories, updated);
  };

  const pullSettings = useCallback(async () => {
    setSyncStatus("loading");
    const data = await googleSheetsService.fetchSettings();
    if (data) {
      updateLocalFromRemote(data);
      setSyncStatus("success");
      return true;
    }
    setSyncStatus("error");
    return false;
  }, [updateLocalFromRemote]);

  const checkConflicts = useCallback(async () => {
    const remote = await googleSheetsService.fetchSettings();
    if (!remote || !remote.timestamp) return;

    const localLastSync = localStorage.getItem("cl_last_sync");

    if (localLastSync && remote.timestamp !== localLastSync) {
      setConflictData(remote);
    } else if (!localLastSync) {
      updateLocalFromRemote(remote);
    }
  }, [updateLocalFromRemote]);

  return {
    accounts, setAccounts,
    categories, setCategories,
    incomes, setIncomes,
    transactions,
    syncStatus,
    addTransaction,
    saveAccount,
    deleteAccount,
    saveCategory,
    deleteCategory,
    saveIncome,
    deleteIncome,
    syncCategories,
    syncIncomes,
    syncAccountsOrder,
    pullSettings,
    checkConflicts,
    conflictData,
    updateLocalFromRemote,
    pushSettings: () => pushSettings(accounts, categories, incomes)
  };
};
