import { useState, useEffect, useCallback, useRef } from "react";
import { Account, Transaction, Category, IncomeSource, TransactionType } from "../types";
import { googleSheetsService } from "../services/googleSheets";
import { DEFAULT_CATEGORIES, INITIAL_INCOMES, INITIAL_ACCOUNTS } from "../constants";
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
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem("cl_accounts");
    return saved ? JSON.parse(saved) : [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("cl_categories");
    return saved ? JSON.parse(saved) : [];
  });
  const [incomes, setIncomes] = useState<IncomeSource[]>(() => {
    const saved = localStorage.getItem("cl_incomes");
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("cl_transactions");
    return saved ? JSON.parse(saved) : [];
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [conflictData, setConflictData] = useState<any | null>(null);
  const isInitialLoad = useRef(true);

  const updateLocalFromRemote = useCallback((data: any) => {
    if (data.accounts) setAccounts(data.accounts);
    if (data.categories) setCategories(data.categories);
    if (data.incomes) setIncomes(data.incomes);
    if (data.timestamp) localStorage.setItem("cl_last_sync", data.timestamp);
    if (data.transactions && Array.isArray(data.transactions)) {
      setTransactions([...data.transactions].sort((a, b) => new Date(b.date.replace(/-/g, '/').replace('T', ' ')).getTime() - new Date(a.date.replace(/-/g, '/').replace('T', ' ')).getTime()));
    }
    setConflictData(null);
  }, []);

  const pullSettings = useCallback(async () => {
    setSyncStatus("loading");
    const data = await googleSheetsService.fetchSettings();
    if (data) {
      updateLocalFromRemote(data);
      setSyncStatus("success");
      return true;
    }
    // Fallback to defaults if network/sheet fails and no local data
    if (accounts.length === 0) {
        setAccounts(INITIAL_ACCOUNTS);
        setCategories(DEFAULT_CATEGORIES);
        setIncomes(INITIAL_INCOMES);
    }
    setSyncStatus("error");
    return false;
  }, [updateLocalFromRemote, accounts.length]);

  // Initial load effect
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      const hasData = localStorage.getItem("cl_accounts");
      if (!hasData) {
        pullSettings();
      }
    }
  }, [pullSettings]);

  // Persistent storage effects
  useEffect(() => { if (accounts.length > 0) localStorage.setItem("cl_accounts", JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { if (categories.length > 0) localStorage.setItem("cl_categories", JSON.stringify(categories)); }, [categories]);
  useEffect(() => { if (incomes.length > 0) localStorage.setItem("cl_incomes", JSON.stringify(incomes)); }, [incomes]);
  useEffect(() => { if (transactions.length > 0) localStorage.setItem("cl_transactions", JSON.stringify(transactions)); }, [transactions]);

  const addTransaction = async (type: TransactionType, source: Account | IncomeSource, destination: Account | Category, sourceAmount: number, targetAmount?: number, tag?: string, customDate?: string, comment?: string, customCurrency?: string) => {
    const date = customDate ? getLocalTimeString(customDate) : getLocalTimeString();
    const finalTargetAmount = targetAmount ?? sourceAmount;
    let sCurr: string, tCurr: string;
    if (type === "expense") { sCurr = (source as Account).currency; tCurr = customCurrency || "USD"; }
    else if (type === "income") { sCurr = customCurrency || "USD"; tCurr = (destination as Account).currency; }
    else { sCurr = (source as Account).currency; tCurr = (destination as Account).currency; }
    const sAmountUSD = RatesService.convert(sourceAmount, sCurr, "USD");
    const tAmountUSD = RatesService.convert(finalTargetAmount, tCurr, "USD");
    const newTx: Transaction = { id: Date.now().toString(), type, accountId: type === "income" ? (destination as Account).id : (source as Account).id, targetId: type === "income" ? source.id : (destination as Category).id, sourceAmount, sourceCurrency: sCurr, sourceAmountUSD: Math.round(sAmountUSD * 100) / 100, targetAmount: finalTargetAmount, targetCurrency: tCurr, targetAmountUSD: Math.round(tAmountUSD * 100) / 100, date, tag, comment: comment || undefined };
    setTransactions((prev) => [newTx, ...prev]);
    const updatedAccounts = accounts.map((a) => {
      if (type === "expense" && a.id === source.id) return { ...a, balance: a.balance - sourceAmount };
      if (type === "income" && a.id === (destination as Account).id) return { ...a, balance: a.balance + finalTargetAmount };
      if (type === "transfer") { if (a.id === source.id) return { ...a, balance: a.balance - sourceAmount }; if (a.id === (destination as Account).id) return { ...a, balance: a.balance + finalTargetAmount }; }
      return a;
    });
    setAccounts(updatedAccounts);
    setSyncStatus("loading");
    const ok = await googleSheetsService.syncToSheets({ action: "addTransaction", targetSheet: "Transactions", id: newTx.id, date, type, sourceName: source.name, destinationName: destination.name, tagName: tag ?? "", sourceAmount, sourceCurrency: sCurr, sourceAmountUSD: newTx.sourceAmountUSD, targetAmount: finalTargetAmount, targetCurrency: tCurr, targetAmountUSD: newTx.targetAmountUSD, comment: comment || undefined, accounts: enrichAccountsWithUSD(updatedAccounts), categories, incomes, timestamp: date });
    setSyncStatus(ok ? "success" : "error");
  };

  const updateTransaction = async (txId: string, type: TransactionType, source: Account | IncomeSource, destination: Account | Category, sourceAmount: number, targetAmount?: number, tag?: string, customDate?: string, comment?: string, customCurrency?: string) => {
    const oldTx = transactions.find(t => t.id === txId); if (!oldTx) return;
    const date = customDate ? getLocalTimeString(customDate) : oldTx.date;
    const finalTargetAmount = targetAmount ?? sourceAmount;
    let sCurr: string, tCurr: string;
    if (type === "expense") { sCurr = (source as Account).currency; tCurr = customCurrency || oldTx.targetCurrency; }
    else if (type === "income") { sCurr = customCurrency || oldTx.sourceCurrency; tCurr = (destination as Account).currency; }
    else { sCurr = (source as Account).currency; tCurr = (destination as Account).currency; }
    const sAmountUSD = RatesService.convert(sourceAmount, sCurr, "USD");
    const tAmountUSD = RatesService.convert(finalTargetAmount, tCurr, "USD");
    const updatedTx: Transaction = { ...oldTx, type, accountId: type === "income" ? (destination as Account).id : (source as Account).id, targetId: type === "income" ? source.id : (destination as Category).id, sourceAmount, sourceCurrency: sCurr, sourceAmountUSD: Math.round(sAmountUSD * 100) / 100, targetAmount: finalTargetAmount, targetCurrency: tCurr, targetAmountUSD: Math.round(tAmountUSD * 100) / 100, date, tag, comment: comment || undefined };
    setTransactions(prev => prev.map(t => t.id === txId ? updatedTx : t));
    const updatedAccounts = accounts.map(a => {
      let balance = a.balance;
      if (oldTx.type === "expense" && a.id === oldTx.accountId) balance += oldTx.sourceAmount;
      if (oldTx.type === "income" && a.id === oldTx.accountId) balance -= oldTx.targetAmount;
      if (oldTx.type === "transfer") { if (a.id === oldTx.accountId) balance += oldTx.sourceAmount; if (a.id === oldTx.targetId) balance -= oldTx.targetAmount; }
      if (type === "expense" && a.id === (source as Account).id) balance -= sourceAmount;
      if (type === "income" && a.id === (destination as Account).id) balance += finalTargetAmount;
      if (type === "transfer") { if (a.id === (source as Account).id) balance -= sourceAmount; if (a.id === (destination as Account).id) balance += finalTargetAmount; }
      return a.balance !== balance ? { ...a, balance } : a;
    });
    setAccounts(updatedAccounts);
    setSyncStatus("loading");
    const ok = await googleSheetsService.syncToSheets({ action: "updateTransaction", targetSheet: "Transactions", id: txId, date, type, sourceName: source.name, destinationName: destination.name, tagName: tag ?? "", sourceAmount, sourceCurrency: sCurr, sourceAmountUSD: updatedTx.sourceAmountUSD, targetAmount: finalTargetAmount, targetCurrency: tCurr, targetAmountUSD: updatedTx.targetAmountUSD, comment: comment || undefined, accounts: enrichAccountsWithUSD(updatedAccounts), categories, incomes, timestamp: date });
    setSyncStatus(ok ? "success" : "error");
  };

  const deleteTransaction = async (txId: string) => {
    const tx = transactions.find((t) => t.id === txId); if (!tx) return;
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    const updatedAccounts = accounts.map((a) => {
      let balance = a.balance;
      if (tx.type === "expense" && a.id === tx.accountId) balance += tx.sourceAmount;
      if (tx.type === "income" && a.id === tx.accountId) balance -= tx.targetAmount;
      if (tx.type === "transfer") { if (a.id === tx.accountId) balance += tx.sourceAmount; if (a.id === tx.targetId) balance -= tx.targetAmount; }
      return a.balance !== balance ? { ...a, balance } : a;
    });
    setAccounts(updatedAccounts);
    setSyncStatus("loading");
    const timestamp = getLocalTimeString();
    const ok = await googleSheetsService.syncToSheets({ action: "deleteTransaction", targetSheet: "Transactions", id: txId, timestamp, accounts: enrichAccountsWithUSD(updatedAccounts), categories, incomes });
    setSyncStatus(ok ? "success" : "error");
  };

  const saveAccount = async (account: Partial<Account>) => {
    const updated = account.id ? accounts.map((a) => (a.id === account.id ? { ...a, ...account } : a)) : [...accounts, { ...account, id: `acc-${Date.now()}` } as Account];
    setAccounts(updated);
    await pushSettingsInternal(updated, categories, incomes);
  };
  const deleteAccount = async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    await pushSettingsInternal(updated, categories, incomes);
  };
  const syncCategories = async (updated: Category[]) => {
    setCategories(updated);
    await pushSettingsInternal(accounts, updated, incomes);
  };
  const saveCategory = async (category: Partial<Category>) => {
    const updated = category.id ? categories.map((c) => (c.id === category.id ? { ...c, ...category } : c)) : [...categories, { ...category, id: `cat-${Date.now()}`, tags: category.tags ?? [] } as Category];
    setCategories(updated);
    await pushSettingsInternal(accounts, updated, incomes);
  };
  const deleteCategory = async (id: string) => {
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await pushSettingsInternal(accounts, updated, incomes);
  };
  const syncIncomes = async (updated: IncomeSource[]) => {
    setIncomes(updated);
    await pushSettingsInternal(accounts, categories, updated);
  };
  const syncAccountsOrder = async (updated: Account[]) => {
    setAccounts(updated);
    await pushSettingsInternal(updated, categories, incomes);
  };
  const saveIncome = async (income: Partial<IncomeSource>) => {
    const updated = income.id ? incomes.map((i) => (i.id === income.id ? { ...i, ...income } : i)) : [...incomes, { ...income, id: `inc-${Date.now()}` } as IncomeSource];
    setIncomes(updated);
    await pushSettingsInternal(accounts, categories, updated);
  };
  const deleteIncome = async (id: string) => {
    const updated = incomes.filter((i) => i.id !== id);
    setIncomes(updated);
    await pushSettingsInternal(accounts, categories, updated);
  };

  const checkConflictsInternal = useCallback(async () => {
    try {
      const remote = await googleSheetsService.fetchSettings();
      if (!remote || !remote.timestamp) return;
      
      const localLastSync = localStorage.getItem("cl_last_sync");
      if (!localLastSync) {
        updateLocalFromRemote(remote);
        return;
      }

      const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
      const localDate = new Date(localLastSync.replace(/-/g, '/').replace('T', ' '));

      // If remote is newer than our last successful sync
      if (remoteDate.getTime() > localDate.getTime()) {
        // If we haven't made any local transactions since last sync, auto-update
        // (This is a simplification, but effective for multi-device usage)
        setConflictData(remote);
      }
    } catch (e) {
      console.error("Conflict check failed:", e);
    }
  }, [updateLocalFromRemote]);

  const pushSettingsInternal = useCallback(async (a: Account[], c: Category[], i: IncomeSource[]) => {
    setSyncStatus("loading");
    const ts = getLocalTimeString();
    const ok = await googleSheetsService.syncToSheets({ action: "syncSettings", targetSheet: "Configs", accounts: enrichAccountsWithUSD(a), categories: c, incomes: i, timestamp: ts });
    if (ok) { localStorage.setItem("cl_last_sync", ts); setSyncStatus("success"); } else setSyncStatus("error");
  }, []);

  return {
    accounts, setAccounts, categories, setCategories, incomes, setIncomes, transactions, syncStatus,
    addTransaction, updateTransaction, deleteTransaction, saveAccount, deleteAccount, saveCategory, deleteCategory, saveIncome, deleteIncome,
    syncCategories, syncIncomes, syncAccountsOrder, pullSettings, checkConflicts: checkConflictsInternal, conflictData, setConflictData, updateLocalFromRemote,
    pushSettings: () => pushSettingsInternal(accounts, categories, incomes)
  };
};
