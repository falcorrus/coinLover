import { useCallback } from "react";
import { Account, Transaction, Category, IncomeSource, TransactionType } from "../types";
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
  ssId?: string;
}

export const useTransactions = ({
  accounts, setAccounts, categories, incomes, transactions, setTransactions, setSyncStatus, ssId
}: TransactionStateProps) => {

  const addTransaction = useCallback(async (type: TransactionType, source: Account | IncomeSource, destination: Account | Category, sourceAmount: number, targetAmount?: number, tag?: string, customDate?: string, comment?: string, customCurrency?: string) => {
    const date = customDate ? getLocalTimeString(customDate) : getLocalTimeString();
    const finalTargetAmount = targetAmount ?? sourceAmount;
    let sCurr: string, tCurr: string;
    
    if (type === "expense") { 
      sCurr = (source as Account).currency; 
      tCurr = customCurrency || RatesService.getBaseCurrency(); 
    } else if (type === "income") { 
      tCurr = (destination as Account).currency;
      sCurr = customCurrency || tCurr; 
    } else { 
      sCurr = (source as Account).currency; 
      tCurr = (destination as Account).currency; 
    }

    const baseCur = RatesService.getBaseCurrency();
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
        sourceCurrency: sCurr, 
        sourceAmountUSD: newTx.sourceAmountUSD, 
        targetAmount: finalTargetAmount, 
        targetCurrency: tCurr, 
        targetAmountUSD: newTx.targetAmountUSD, 
        comment: comment || undefined, 
        accounts: enrichAccountsWithUSD(updatedAccounts), 
        categories, 
        incomes, 
        timestamp: date,
        ssId
    });
    setSyncStatus(ok ? "success" : "error");
  }, [accounts, categories, incomes, setAccounts, setTransactions, setSyncStatus, ssId]);

  const updateTransaction = useCallback(async (txId: string, type: TransactionType, source: Account | IncomeSource, destination: Account | Category, sourceAmount: number, targetAmount?: number, tag?: string, customDate?: string, comment?: string, customCurrency?: string) => {
    const oldTx = transactions.find(t => t.id === txId); if (!oldTx) return;
    const date = customDate ? getLocalTimeString(customDate) : oldTx.date;
    const finalTargetAmount = targetAmount ?? sourceAmount;
    let sCurr: string, tCurr: string;
    
    if (type === "expense") { 
      sCurr = (source as Account).currency; 
      tCurr = customCurrency || oldTx.targetCurrency; 
    } else if (type === "income") { 
      tCurr = (destination as Account).currency;
      sCurr = customCurrency || oldTx.sourceCurrency;
    } else { 
      sCurr = (source as Account).currency; 
      tCurr = (destination as Account).currency; 
    }

    const baseCur = RatesService.getBaseCurrency();
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
        sourceCurrency: sCurr, 
        sourceAmountUSD: updatedTx.sourceAmountUSD, 
        targetAmount: finalTargetAmount, 
        targetCurrency: tCurr, 
        targetAmountUSD: updatedTx.targetAmountUSD, 
        comment: comment || undefined, 
        accounts: enrichAccountsWithUSD(updatedAccounts), 
        categories, 
        incomes, 
        timestamp: date,
        ssId
    });
    setSyncStatus(ok ? "success" : "error");
  }, [accounts, categories, incomes, transactions, setAccounts, setTransactions, setSyncStatus, ssId]);

  const deleteTransaction = useCallback(async (txId: string) => {
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
    const timestamp = getLocalTimeString();
    const ok = await googleSheetsService.syncToSheets({ 
        action: "deleteTransaction", 
        targetSheet: "Transactions", 
        id: txId, 
        timestamp, 
        accounts: enrichAccountsWithUSD(updatedAccounts), 
        categories, 
        incomes,
        ssId
    });
    setSyncStatus(ok ? "success" : "error");
  }, [accounts, categories, incomes, transactions, setAccounts, setTransactions, setSyncStatus, ssId]);

  return { addTransaction, updateTransaction, deleteTransaction };
};
