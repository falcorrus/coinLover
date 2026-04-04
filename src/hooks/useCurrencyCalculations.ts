import * as React from "react";
import { RatesService } from "../services/RatesService";
import { Account, Transaction, Category, IncomeSource } from "../types";

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
    const symbols: Record<string, string> = { "USD": "$", "EUR": "€", "GBP": "£", "RUB": "₽", "RSD": "din", "BRL": "R$", "ARS": "ARS" };
    return symbols[code.toUpperCase()] || code;
  }, []);

  const baseSymbol = getSymbol(baseCurrency);

  const totalBalanceBase = React.useMemo(() => Math.round(accounts.reduce((s, a) => {
    const aCurr = a.currency || baseCurrency;
    const balance = isNaN(Number(a.balance)) ? 0 : a.balance;
    return s + RatesService.convert(balance, aCurr, baseCurrency);
  }, 0)), [accounts, baseCurrency]);
  
  const totalSpentBase = React.useMemo(() => Math.round(currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "expense").reduce((s, t) => {
    const aid = String(t.accountId || "").trim().toLowerCase();
    const account = accounts.find(a => String(a.id).trim().toLowerCase() === aid || String(a.name).trim().toLowerCase() === aid);
    const sCurr = t.sourceCurrency || account?.currency || baseCurrency;
    const amount = isNaN(Number(t.sourceAmount)) ? 0 : t.sourceAmount;

    // Игнорируем t.sourceAmountUSD из таблицы, так как там могут быть неверные данные (например в USD вместо EUR)
    // Всегда считаем базу сами на лету
    const val = RatesService.convert(amount || 0, sCurr, baseCurrency);
    return s + val;
  }, 0)), [currentMonthTransactions, baseCurrency, accounts]);

  const totalEarnedBase = React.useMemo(() => Math.round(currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "income").reduce((s, t) => {
    const aid = String(t.accountId || "").trim().toLowerCase();
    const account = accounts.find(a => String(a.id).trim().toLowerCase() === aid || String(a.name).trim().toLowerCase() === aid);
    const tCurr = t.targetCurrency || account?.currency || baseCurrency;
    const amount = isNaN(Number(t.targetAmount)) ? 0 : t.targetAmount;

    // Аналогично для доходов
    const val = RatesService.convert(amount || 0, tCurr, baseCurrency);
    return s + val;
  }, 0)), [currentMonthTransactions, baseCurrency, accounts]);

  const stats = React.useMemo(() => {
    const localCur = localStorage.getItem("cl_numpad_pref_currency") || baseCurrency;
    const localSym = getSymbol(localCur);
    const isBase = categoryCurrencyMode === 'base';

    const getSafeCurr = (t: Transaction) => {
      const aid = String(t.accountId || "").trim().toLowerCase();
      const account = accounts.find(a => String(a.id).trim().toLowerCase() === aid || String(a.name).trim().toLowerCase() === aid);
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
        // Считаем из оригинала, игнорируя колонку "USD" в таблице
        const valBase = RatesService.convert(t.sourceAmount || 0, sCurr, baseCurrency);
        return s + RatesService.convert(valBase, baseCurrency, localCur);
      }, 0));

    const earnedLocal = Math.round(currentMonthTransactions
      .filter(t => String(t.type).toLowerCase() === "income")
      .reduce((s, t) => {
        if (t.targetCurrency === localCur && t.targetAmount) return s + t.targetAmount;
        
        const tCurr = getSafeCurr(t);
        const valBase = RatesService.convert(t.targetAmount || 0, tCurr, baseCurrency);
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
