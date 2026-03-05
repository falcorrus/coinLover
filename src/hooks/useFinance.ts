import { useState, useEffect, useCallback } from "react";
import { Account, Transaction, Category, IncomeSource, TransactionType } from "../types";
import { googleSheetsService } from "../services/googleSheets";
import { DEFAULT_CATEGORIES, INITIAL_INCOMES } from "../constants";
import { INITIAL_ACCOUNTS } from "../constants";
import { RatesService } from "../services/RatesService";

export type SyncStatus = "idle" | "loading" | "error" | "success";

const getLocalTimeString = (dateInput?: string) => {
  const d = dateInput ? new Date(dateInput.replace(/-/g, '/').replace('T', ' ')) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const enrichAccountsWithUSD = (accs: Account[]): Account[] => {
  return accs.map(a => ({
    ...a,
    balanceUSD: Math.round(RatesService.convert(a.balance, a.currency || "USD", "USD") * 100) / 100
  }));
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

    if (data.transactions && Array.isArray(data.transactions)) {
      setTransactions(
        [...data.transactions].sort(
          (a, b) => new Date(b.date.replace(/-/g, '/').replace('T', ' ')).getTime() - new Date(a.date.replace(/-/g, '/').replace('T', ' ')).getTime()
        )
      );
    }

    setConflictData(null);
  }, []);

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
        accounts: enrichAccountsWithUSD(latestAccounts),
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
    sourceAmount: number,
    targetAmount?: number,
    tag?: string,
    customDate?: string,
    comment?: string,
    targetCurrency?: string
  ) => {
    const date = customDate ? getLocalTimeString(customDate) : getLocalTimeString();

    const wallet = type === "income" ? (destination as Account) : (source as Account);
    const sourceCurrency = wallet.currency || "USD";

    const localCurrency = targetCurrency || (type === "expense" ? "USD" : ((destination as any).currency || sourceCurrency));

    const sourceAmountUSD = sourceCurrency === "USD" ? sourceAmount : RatesService.convert(sourceAmount, sourceCurrency, "USD");
    const finalTargetAmount = targetAmount ?? sourceAmount;
    const targetAmountUSD = localCurrency === "USD" ? finalTargetAmount : RatesService.convert(finalTargetAmount, localCurrency, "USD");

    const newTx: Transaction = {
      id: Date.now().toString(),
      type,
      accountId: type === "income" ? (destination as Account).id : (source as Account).id,
      targetId: type === "income" ? source.id : (destination as Category).id,
      sourceAmount,
      sourceCurrency,
      sourceAmountUSD: Math.round(sourceAmountUSD * 100) / 100,
      targetAmount: finalTargetAmount,
      targetCurrency: localCurrency,
      targetAmountUSD: Math.round(targetAmountUSD * 100) / 100,
      date,
      tag,
      comment: comment || undefined,
    };

    setTransactions((prev) => [newTx, ...prev]);

    const updatedAccounts = accounts.map((a) => {
      if (type === "expense" && a.id === source.id) return { ...a, balance: a.balance - sourceAmount };
      if (type === "income" && a.id === (destination as Account).id) return { ...a, balance: a.balance + (targetAmount ?? sourceAmount) };
      if (type === "transfer") {
        if (a.id === source.id) return { ...a, balance: a.balance - sourceAmount };
        if (a.id === (destination as Account).id) return { ...a, balance: a.balance + finalTargetAmount };
      }
      return a;
    });
    setAccounts(updatedAccounts);

    setSyncStatus("loading");
    const ok = await googleSheetsService.syncToSheets({
      action: "addTransaction",
      targetSheet: "Transactions",
      id: newTx.id,
      date,
      type,
      sourceName: source.name,
      destinationName: destination.name,
      tagName: tag ?? "",
      sourceAmount,
      sourceCurrency,
      sourceAmountUSD: newTx.sourceAmountUSD,
      targetAmount: finalTargetAmount,
      targetCurrency: localCurrency,
      targetAmountUSD: newTx.targetAmountUSD,
      comment: comment || undefined,
      accounts: enrichAccountsWithUSD(updatedAccounts),
      categories,
      incomes,
      timestamp: date,
    });

    if (ok) {
      localStorage.setItem("cl_last_sync", date);
      setSyncStatus("success");
    } else {
      setSyncStatus("error");
    }
  };

  const updateTransaction = async (
    txId: string,
    type: TransactionType,
    source: Account | IncomeSource,
    destination: Account | Category,
    sourceAmount: number,
    targetAmount?: number,
    tag?: string,
    customDate?: string,
    comment?: string,
    targetCurrency?: string
  ) => {
    const oldTx = transactions.find(t => t.id === txId);
    if (!oldTx) return;

    const date = customDate ? getLocalTimeString(customDate) : oldTx.date;

    const wallet = type === "income" ? (destination as Account) : (source as Account);
    const sourceCurrency = wallet.currency || "USD";

    const localCurrency = targetCurrency || (type === "expense" ? "USD" : ((destination as any).currency || sourceCurrency));
    const sourceAmountUSD = sourceCurrency === "USD" ? sourceAmount : RatesService.convert(sourceAmount, sourceCurrency, "USD");
    const finalTargetAmount = targetAmount ?? sourceAmount;
    const targetAmountUSD = localCurrency === "USD" ? finalTargetAmount : RatesService.convert(finalTargetAmount, localCurrency, "USD");

    const updatedTx: Transaction = {
      ...oldTx,
      type,
      accountId: type === "income" ? (destination as Account).id : (source as Account).id,
      targetId: type === "income" ? source.id : (destination as Category).id,
      sourceAmount,
      sourceCurrency,
      sourceAmountUSD: Math.round(sourceAmountUSD * 100) / 100,
      targetAmount: finalTargetAmount,
      targetCurrency: localCurrency,
      targetAmountUSD: Math.round(targetAmountUSD * 100) / 100,
      date,
      tag,
      comment: comment || undefined,
    };

    setTransactions(prev => prev.map(t => t.id === txId ? updatedTx : t));

    const updatedAccounts = accounts.map(a => {
      let balance = a.balance;
      if (oldTx.type === "expense" && a.id === oldTx.accountId) balance += oldTx.sourceAmount;
      if (oldTx.type === "income" && a.id === oldTx.targetId) balance -= (oldTx.targetAmount ?? oldTx.sourceAmount);
      if (oldTx.type === "transfer") {
        if (a.id === oldTx.accountId) balance += oldTx.sourceAmount;
        if (a.id === oldTx.targetId) balance -= (oldTx.targetAmount ?? oldTx.sourceAmount);
      }

      if (type === "expense" && a.id === (source as Account).id) balance -= sourceAmount;
      if (type === "income" && a.id === (destination as Account).id) balance += finalTargetAmount;
      if (type === "transfer") {
        if (a.id === (source as Account).id) balance -= sourceAmount;
        if (a.id === (destination as Account).id) balance += finalTargetAmount;
      }
      return a.balance !== balance ? { ...a, balance } : a;
    });
    setAccounts(updatedAccounts);

    setSyncStatus("loading");
    const ok = await googleSheetsService.syncToSheets({
      action: "updateTransaction",
      targetSheet: "Transactions",
      id: txId,
      date,
      type,
      sourceName: source.name,
      destinationName: destination.name,
      tagName: tag ?? "",
      sourceAmount,
      sourceCurrency,
      sourceAmountUSD: updatedTx.sourceAmountUSD,
      targetAmount: finalTargetAmount,
      targetCurrency: localCurrency,
      targetAmountUSD: updatedTx.targetAmountUSD,
      comment: comment || undefined,
      accounts: enrichAccountsWithUSD(updatedAccounts),
      categories,
      incomes,
      timestamp: date,
    });

    if (ok) {
      localStorage.setItem("cl_last_sync", date);
      setSyncStatus("success");
    } else {
      setSyncStatus("error");
    }
  };

  const deleteTransaction = async (txId: string) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;

    setTransactions((prev) => prev.filter((t) => t.id !== txId));

    const updatedAccounts = accounts.map((a) => {
      let balance = a.balance;
      if (tx.type === "expense" && a.id === tx.accountId) balance += tx.sourceAmount;
      if (tx.type === "income" && a.id === tx.targetId) balance -= tx.targetAmount ?? tx.sourceAmount;
      if (tx.type === "transfer") {
        if (a.id === tx.accountId) balance += tx.sourceAmount;
        if (a.id === tx.targetId) balance -= tx.targetAmount ?? tx.sourceAmount;
      }
      return a.balance !== balance ? { ...a, balance } : a;
    });
    setAccounts(updatedAccounts);

    setSyncStatus("loading");
    const timestamp = getLocalTimeString();
    const ok = await googleSheetsService.syncToSheets({
      action: "deleteTransaction",
      targetSheet: "Transactions",
      id: txId,
      timestamp,
      accounts: enrichAccountsWithUSD(updatedAccounts),
      categories,
      incomes,
    });

    if (ok) {
      localStorage.setItem("cl_last_sync", timestamp);
      setSyncStatus("success");
    } else {
      setSyncStatus("error");
    }
  };

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

  const syncIncomes = async (updated: IncomeSource[]) => {
    setIncomes(updated);
    await pushSettings(accounts, categories, updated);
  };

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
    try {
      const remote = await googleSheetsService.fetchSettings();
      if (!remote || !remote.timestamp) return;

      const localLastSync = localStorage.getItem("cl_last_sync");
      const hasLocalTransactions = transactions.length > 0;

      if (!localLastSync || (remote.timestamp !== localLastSync && !hasLocalTransactions)) {
        updateLocalFromRemote(remote);
        return;
      }

      if (localLastSync && remote.timestamp !== localLastSync) {
        setConflictData(remote);
      }
    } catch (e) {
      console.error("Conflict check failed:", e);
    }
  }, [updateLocalFromRemote, transactions.length]);

  return {
    accounts, setAccounts,
    categories, setCategories,
    incomes, setIncomes,
    transactions,
    syncStatus,
    addTransaction,
    updateTransaction,
    deleteTransaction,
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
    setConflictData,
    updateLocalFromRemote,
    pushSettings: () => pushSettings(accounts, categories, incomes)
  };
};
