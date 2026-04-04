import { useCallback } from "react";
import { Account, Transaction, Category, IncomeSource, TransactionType } from "../types";
import { APP_SETTINGS } from "../constants/settings";
import { googleSheetsService } from "../services/googleSheets";
import { RatesService } from "../services/RatesService";
import { getLocalTimeString, enrichAccountsWithUSD } from "./utils";
import { trackEvent } from "../services/analytics";

interface TransactionStateProps {
  accounts: Account[];
  setAccounts: (a: Account[]) => void;
  categories: Category[];
  incomes: IncomeSource[];
  transactions: Transaction[];
  setTransactions: (t: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  setSyncStatus: (s: "idle" | "loading" | "error" | "success") => void;
  pushSettings: (a: Account[], c: Category[], i: IncomeSource[], immediate?: boolean) => Promise<boolean>;
  ssId?: string;
}

export const useTransactions = ({
  accounts, setAccounts, categories, incomes, transactions, setTransactions, setSyncStatus, pushSettings, ssId
}: TransactionStateProps) => {

  const addTransaction = useCallback(async (type: TransactionType, source: Account | IncomeSource, destination: Account | Category, sourceAmount: number, targetAmount?: number, tag?: string, customDate?: string, comment?: string, customCurrency?: string) => {
    // Гарантируем наличие курсов перед расчетом
    await RatesService.ensureRates();
    
    const date = customDate ? getLocalTimeString(customDate) : getLocalTimeString();
    const finalTargetAmount = targetAmount ?? sourceAmount;
    let sCurr: string, tCurr: string;
    
    const baseCur = RatesService.getBaseCurrency();
    const cachedNumpadS = localStorage.getItem("cl_numpad_pref_s_curr");
    const cachedNumpadT = localStorage.getItem("cl_numpad_pref_t_curr");
    const localCur = localStorage.getItem("cl_numpad_pref_currency") || cachedNumpadT || baseCur;

    if (type === "expense") { 
      sCurr = (source as Account).currency || cachedNumpadS || localCur; 
      tCurr = customCurrency || sCurr; 
    } else if (type === "income") { 
      tCurr = (destination as Account).currency || cachedNumpadT || localCur;
      sCurr = customCurrency || tCurr; 
    } else { 
      sCurr = (source as Account).currency || cachedNumpadS || localCur; 
      tCurr = (destination as Account).currency || cachedNumpadT || localCur; 
    }

    const sAmountUSD = RatesService.convert(sourceAmount, sCurr, baseCur);
    const tAmountUSD = RatesService.convert(finalTargetAmount, tCurr, baseCur);
    
    const newTx: Transaction = { 
      id: Date.now().toString(), 
      type, 
      accountId: type === "income" ? (destination as Account).id : (source as Account).id, 
      targetId: type === "income" ? source.id : (destination as Category).id, 
      sourceAmount, 
      sourceCurrency: sCurr, 
      sourceAmountUSD: Math.round(sAmountUSD * 100) / 100, 
      targetAmount: finalTargetAmount, 
      targetCurrency: tCurr, 
      targetAmountUSD: Math.round(tAmountUSD * 100) / 100, 
      date, 
      tag, 
      comment: comment || undefined 
    };
    
    setTransactions((prev) => [newTx, ...prev]);
    trackEvent("Transaction", "Add", type);
    const updatedAccounts = accounts.map((a) => {
      if (type === "expense" && a.id === (source as Account).id) return { ...a, balance: a.balance - sourceAmount };
      if (type === "income" && a.id === (destination as Account).id) return { ...a, balance: a.balance + finalTargetAmount };
      if (type === "transfer") { 
        if (a.id === (source as Account).id) return { ...a, balance: a.balance - sourceAmount }; 
        if (a.id === (destination as Account).id) return { ...a, balance: a.balance + finalTargetAmount }; 
      }
      return a;
    });
    setAccounts(updatedAccounts);
    setSyncStatus("loading");

    const ts = getLocalTimeString();
    const baseCurrency = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";

    // Сначала отправляем транзакцию (теперь с балансами для атомарности)
    const txOk = await googleSheetsService.syncToSheets({ 
        action: "addTransaction", 
        targetSheet: "Transactions", 
        id: newTx.id, 
        date, 
        type, 
        sourceName: source.name, 
        destinationName: destination.name, 
        tagName: tag ?? "", 
        sourceAmount, 
        sourceCurrency: sCurr, 
        sourceAmountUSD: newTx.sourceAmountUSD, 
        targetAmount: finalTargetAmount, 
        targetCurrency: tCurr, 
        targetAmountUSD: newTx.targetAmountUSD, 
        comment: comment || undefined,
        ssId,
        accounts: enrichAccountsWithUSD(updatedAccounts),
        categories,
        incomes,
        timestamp: ts,
        baseCurrency
    });

    // Затем всё равно вызываем pushSettings для локальной синхронизации и контроля конфликтов
    if (txOk) {
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, ts);
      await pushSettings(updatedAccounts, categories, incomes, true);
    } else {
      setSyncStatus("error");
    }
  }, [accounts, categories, incomes, setAccounts, setTransactions, setSyncStatus, pushSettings, ssId]);

  const updateTransaction = useCallback(async (txId: string, type: TransactionType, source: Account | IncomeSource, destination: Account | Category, sourceAmount: number, targetAmount?: number, tag?: string, customDate?: string, comment?: string, customCurrency?: string) => {
    // Гарантируем наличие курсов перед расчетом
    await RatesService.ensureRates();

    const oldTx = transactions.find(t => t.id === txId); if (!oldTx) return;
    const date = customDate ? getLocalTimeString(customDate) : oldTx.date;
    const finalTargetAmount = targetAmount ?? sourceAmount;
    let sCurr: string, tCurr: string;
    
    const baseCur = RatesService.getBaseCurrency();

    if (type === "expense") { 
      sCurr = (source as Account).currency; 
      tCurr = customCurrency || oldTx.targetCurrency || sCurr; 
    } else if (type === "income") { 
      tCurr = (destination as Account).currency;
      sCurr = customCurrency || oldTx.sourceCurrency || tCurr;
    } else { 
      sCurr = (source as Account).currency; 
      tCurr = (destination as Account).currency; 
    }

    const sAmountUSD = RatesService.convert(sourceAmount, sCurr, baseCur);
    const tAmountUSD = RatesService.convert(finalTargetAmount, tCurr, baseCur);
    
    const updatedTx: Transaction = { 
      ...oldTx, 
      type, 
      accountId: type === "income" ? (destination as Account).id : (source as Account).id, 
      targetId: type === "income" ? source.id : (destination as Category).id, 
      sourceAmount, 
      sourceCurrency: sCurr, 
      sourceAmountUSD: Math.round(sAmountUSD * 100) / 100, 
      targetAmount: finalTargetAmount, 
      targetCurrency: tCurr, 
      targetAmountUSD: Math.round(tAmountUSD * 100) / 100, 
      date, 
      tag, 
      comment: comment || undefined 
    };

    setTransactions(prev => prev.map(t => t.id === txId ? updatedTx : t));
    trackEvent("Transaction", "Update", type);
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

    const ts = getLocalTimeString();
    const baseCurrency = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";

    const txOk = await googleSheetsService.syncToSheets({ 
        action: "updateTransaction", 
        targetSheet: "Transactions", 
        id: txId, 
        date, 
        type, 
        sourceName: source.name, 
        destinationName: destination.name, 
        tagName: tag ?? "", 
        sourceAmount, 
        sourceCurrency: sCurr, 
        sourceAmountUSD: updatedTx.sourceAmountUSD, 
        targetAmount: finalTargetAmount, 
        targetCurrency: tCurr, 
        targetAmountUSD: updatedTx.targetAmountUSD, 
        comment: comment || undefined,
        ssId,
        accounts: enrichAccountsWithUSD(updatedAccounts),
        categories,
        incomes,
        timestamp: ts,
        baseCurrency
    });

    if (txOk) {
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, ts);
      await pushSettings(updatedAccounts, categories, incomes, true);
    } else {
      setSyncStatus("error");
    }
  }, [accounts, categories, incomes, transactions, setAccounts, setTransactions, setSyncStatus, pushSettings, ssId]);

  const deleteTransaction = useCallback(async (txId: string) => {
    // Гарантируем наличие курсов перед расчетом
    await RatesService.ensureRates();

    const tx = transactions.find((t) => t.id === txId); if (!tx) return;
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    trackEvent("Transaction", "Delete", tx.type);
    const updatedAccounts = accounts.map((a) => {
      let balance = a.balance;
      if (tx.type === "expense" && a.id === tx.accountId) balance += tx.sourceAmount;
      if (tx.type === "income" && a.id === tx.accountId) balance -= tx.targetAmount;
      if (tx.type === "transfer") { if (a.id === tx.accountId) balance += tx.sourceAmount; if (a.id === tx.targetId) balance -= tx.targetAmount; }
      return a.balance !== balance ? { ...a, balance } : a;
    });
    setAccounts(updatedAccounts);
    setSyncStatus("loading");

    const ts = getLocalTimeString();
    const baseCurrency = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";

    const txOk = await googleSheetsService.syncToSheets({ 
        action: "deleteTransaction", 
        targetSheet: "Transactions", 
        id: txId, 
        ssId,
        accounts: enrichAccountsWithUSD(updatedAccounts),
        categories,
        incomes,
        timestamp: ts,
        baseCurrency
    });

    if (txOk) {
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, ts);
      await pushSettings(updatedAccounts, categories, incomes, true);
    } else {
      setSyncStatus("error");
    }
  }, [accounts, categories, incomes, transactions, setAccounts, setTransactions, setSyncStatus, pushSettings, ssId]);

  return { addTransaction, updateTransaction, deleteTransaction };
};
