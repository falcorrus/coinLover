import * as React from "react";
import { RatesService } from "../services/RatesService";
import { Account, Transaction, Category, IncomeSource } from "../types";
import { findAccount } from "./utils";

export function useCurrencyCalculations(
  accounts: Account[],
  currentMonthTransactions: Transaction[],
  categories: Category[],
  incomes: IncomeSource[],
  categoryCurrencyMode: "base" | "local"
) {
  const baseCurrency = RatesService.getBaseCurrency();
  
  const getSymbol = React.useCallback((code: string) => {
    if (!code || !isNaN(Number(code))) return "$";
    const symbols: Record<string, string> = { "USD": "$", "EUR": "€", "GBP": "£" };
    return symbols[code.toUpperCase()] || code.toUpperCase();
  }, []);

  const baseSymbol = getSymbol(baseCurrency);

  const totalBalanceBase = React.useMemo(() => Math.round(accounts.reduce((s, a) => {
    const aCurr = a.currency || baseCurrency;
    const balance = isNaN(Number(a.balance)) ? 0 : a.balance;
    return s + RatesService.convert(balance, aCurr, baseCurrency);
  }, 0)), [accounts, baseCurrency]);
  
  const totalSpentBase = React.useMemo(() => Math.round(currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "expense").reduce((s, t) => {
    const account = findAccount(accounts, t.accountId);
    const sCurr = t.sourceCurrency || account?.currency || baseCurrency;
    const amount = isNaN(Number(t.sourceAmount)) ? 0 : t.sourceAmount;

    // Приоритет столбца J (sourceAmountUSD) при базовой валюте USD (синхронизировано с аналитикой)
    const val = (t.sourceAmountUSD && t.sourceAmountUSD !== 0 && baseCurrency === 'USD')
      ? t.sourceAmountUSD
      : RatesService.convert(amount || 0, sCurr, baseCurrency);
    return s + val;
  }, 0)), [currentMonthTransactions, baseCurrency, accounts]);

  const totalEarnedBase = React.useMemo(() => Math.round(currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "income").reduce((s, t) => {
    const account = findAccount(accounts, t.accountId);
    const tCurr = t.targetCurrency || account?.currency || baseCurrency;
    const amount = isNaN(Number(t.targetAmount)) ? 0 : t.targetAmount;

    // Приоритет столбца J (targetAmountUSD) при базовой валюте USD (синхронизировано с аналитикой)
    const val = (t.targetAmountUSD && t.targetAmountUSD !== 0 && baseCurrency === 'USD')
      ? t.targetAmountUSD
      : RatesService.convert(amount || 0, tCurr, baseCurrency);
    return s + val;
  }, 0)), [currentMonthTransactions, baseCurrency, accounts]);

  const stats = React.useMemo(() => {
    const localCur = localStorage.getItem("cl_numpad_pref_currency") || baseCurrency;
    const localSym = getSymbol(localCur);
    const isBase = categoryCurrencyMode === 'base';

    const getSafeCurr = (t: Transaction) => {
      const account = findAccount(accounts, t.accountId);
      return t.sourceCurrency || account?.currency || localCur;
    };

    if (isBase) {
      return { 
        displaySpent: totalSpentBase, 
        displayEarned: totalEarnedBase, 
        displayBalance: totalBalanceBase, 
        currentSymbol: baseSymbol, 
        localCurrencyCode: localCur, 
        localSymbol: localSym 
      };
    }

    // Расчет в ЛОКАЛЬНОЙ ВАЛЮТЕ
    const spentLocal = Math.round(currentMonthTransactions
      .filter(t => String(t.type).toLowerCase() === "expense")
      .reduce((s, t) => {
        if (t.targetCurrency === localCur && t.targetAmount) return s + t.targetAmount;
        
        const sCurr = getSafeCurr(t);
        const valBase = (t.sourceAmountUSD && t.sourceAmountUSD !== 0 && baseCurrency === 'USD')
          ? t.sourceAmountUSD
          : RatesService.convert(t.sourceAmount || 0, sCurr, baseCurrency);
        return s + RatesService.convert(valBase, baseCurrency, localCur);
      }, 0));

    const earnedLocal = Math.round(currentMonthTransactions
      .filter(t => String(t.type).toLowerCase() === "income")
      .reduce((s, t) => {
        if (t.targetCurrency === localCur && t.targetAmount) return s + t.targetAmount;
        
        const tCurr = getSafeCurr(t);
        const valBase = (t.targetAmountUSD && t.targetAmountUSD !== 0 && baseCurrency === 'USD')
          ? t.targetAmountUSD
          : RatesService.convert(t.targetAmount || 0, tCurr, baseCurrency);
        return s + RatesService.convert(valBase, baseCurrency, localCur);
      }, 0));

    const balanceLocal = Math.round(RatesService.convert(totalBalanceBase, baseCurrency, localCur));

    return { 
      displaySpent: spentLocal, 
      displayEarned: earnedLocal, 
      displayBalance: balanceLocal, 
      currentSymbol: localSym, 
      localCurrencyCode: localCur, 
      localSymbol: localSym 
    };
  }, [categoryCurrencyMode, totalSpentBase, totalEarnedBase, totalBalanceBase, baseCurrency, baseSymbol, getSymbol, currentMonthTransactions, accounts]);

  return {
    ...stats,
    baseCurrency,
    baseSymbol,
    getSymbol,
    totalSpentBase,
    totalEarnedBase,
    totalBalanceBase
  };
}
