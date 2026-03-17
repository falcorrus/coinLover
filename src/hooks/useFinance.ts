import { useState, useEffect, useRef } from "react";
import { APP_SETTINGS } from "../constants/settings";
import { Account, Transaction, Category, IncomeSource } from "../types";
import { useSync } from "./useSync";
import { useTransactions } from "./useTransactions";
import { useEntities } from "./useEntities";

export const useFinance = () => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.ACCOUNTS);
    return saved ? JSON.parse(saved) : [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.CATEGORIES);
    return saved ? JSON.parse(saved) : [];
  });
  const [incomes, setIncomes] = useState<IncomeSource[]>(() => {
    const saved = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.INCOMES);
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const isInitialLoad = useRef(true);

  // 1. Hook: Sync logic
  const {
    syncStatus, setSyncStatus, conflictData, setConflictData,
    pullSettings, pushSettings, checkConflicts, updateLocalFromRemote
  } = useSync({
    accounts, setAccounts, categories, setCategories, incomes, setIncomes, setTransactions
  });

  // 2. Hook: Transaction CRUD
  const { addTransaction, updateTransaction, deleteTransaction } = useTransactions({
    accounts, setAccounts, categories, incomes, transactions, setTransactions, setSyncStatus
  });

  // 3. Hook: Entity CRUD
  const {
    saveAccount, deleteAccount, syncCategories, saveCategory, deleteCategory,
    syncIncomes, syncAccountsOrder, saveIncome, deleteIncome
  } = useEntities({
    accounts, setAccounts, categories, setCategories, incomes, setIncomes, pushSettings
  });

  // Initial load effect
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      const hasData = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.ACCOUNTS);
      if (!hasData) {
        pullSettings();
      }
    }
  }, [pullSettings]);

  // Persistent storage effects
  useEffect(() => { if (accounts.length > 0) localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { if (categories.length > 0) localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)); }, [categories]);
  useEffect(() => { if (incomes.length > 0) localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.INCOMES, JSON.stringify(incomes)); }, [incomes]);
  useEffect(() => { if (transactions.length > 0) localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)); }, [transactions]);

  return {
    accounts, setAccounts, categories, setCategories, incomes, setIncomes, transactions, syncStatus,
    addTransaction, updateTransaction, deleteTransaction, saveAccount, deleteAccount, saveCategory, deleteCategory, saveIncome, deleteIncome,
    syncCategories, syncIncomes, syncAccountsOrder, pullSettings, checkConflicts, conflictData, setConflictData, updateLocalFromRemote,
    pushSettings: () => pushSettings(accounts, categories, incomes)
  };
};
