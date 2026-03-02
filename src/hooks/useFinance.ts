import React, { useState, useEffect } from "react";
import { Account, Transaction, Category, IncomeSource } from "../types";
import { googleSheetsService } from "../services/googleSheets";
import { DEFAULT_CATEGORIES, INITIAL_INCOMES } from "../constants";

export const useFinance = (initialAccounts: Account[]) => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem("cl_accounts");
    return saved ? JSON.parse(saved) : initialAccounts;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("cl_categories");
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [incomes, setIncomes] = useState<IncomeSource[]>(() => {
    const saved = localStorage.getItem("cl_incomes");
    return saved ? JSON.parse(saved) : INITIAL_INCOMES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("cl_transactions");
    return saved ? JSON.parse(saved) : [];
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [conflictData, setConflictData] = useState<any>(null);

  // Auto-save
  useEffect(() => { localStorage.setItem("cl_accounts", JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem("cl_categories", JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem("cl_incomes", JSON.stringify(incomes)); }, [incomes]);
  useEffect(() => { localStorage.setItem("cl_transactions", JSON.stringify(transactions)); }, [transactions]);

  // Sync
  useEffect(() => {
    const sync = async () => {
      setSyncStatus('loading');
      try {
        const cloud = await googleSheetsService.getData();
        if (cloud.accounts && (JSON.stringify(cloud.accounts) !== JSON.stringify(accounts))) {
          setConflictData(cloud);
        }
        setSyncStatus('success');
      } catch { setSyncStatus('error'); }
    };
    sync();
  }, []);

  const addTransaction = async (type: any, source: any, destination: any, amount: number, tag?: string) => {
    const date = new Date().toISOString();
    const newTx: Transaction = {
      id: Date.now().toString(),
      type,
      accountId: type === 'income' ? destination.id : source.id,
      targetId: type === 'income' ? source.id : destination.id,
      amount,
      date,
      tag
    };

    setTransactions([newTx, ...transactions]);
    const updatedAccounts = accounts.map(a => {
      if (type === 'expense' && a.id === source.id) return { ...a, balance: a.balance - amount };
      if (type === 'income' && a.id === destination.id) return { ...a, balance: a.balance + amount };
      if (type === 'transfer') {
        if (a.id === source.id) return { ...a, balance: a.balance - amount };
        if (a.id === destination.id) return { ...a, balance: a.balance + amount };
      }
      return a;
    });
    setAccounts(updatedAccounts);

    await googleSheetsService.syncToSheets({
      action: "addTransaction", date, type, sourceName: source.name,
      destinationName: destination.name, tagName: tag || "", amount, allAccounts: updatedAccounts
    });
  };

  const saveAccount = async (account: Partial<Account>) => {
    let updated = account.id ? accounts.map(a => a.id === account.id ? { ...a, ...account } : a) : [...accounts, { ...account, id: `acc-${Date.now()}` } as Account];
    setAccounts(updated);
    await googleSheetsService.syncToSheets({ action: "syncAccounts", accounts: updated });
  };

  const deleteAccount = async (id: string) => {
    const updated = accounts.filter(a => a.id !== id);
    setAccounts(updated);
    await googleSheetsService.syncToSheets({ action: "syncAccounts", accounts: updated });
  };

  const resolveConflict = (src: 'cloud' | 'local') => {
    if (src === 'cloud' && conflictData) {
      setAccounts(conflictData.accounts);
      setTransactions(conflictData.transactions);
    } else {
      googleSheetsService.syncToSheets({ action: "syncFullState", accounts, transactions });
    }
    setConflictData(null);
  };

  return {
    accounts, setAccounts,
    categories, setCategories,
    incomes, setIncomes,
    transactions,
    syncStatus, conflictData,
    addTransaction, saveAccount, deleteAccount, resolveConflict
  };
};
