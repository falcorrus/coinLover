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
    const aCurr = (a.currency && isNaN(Number(a.currency))) ? a.currency : "USD";
    return s + RatesService.convert(a.balance, aCurr, baseCurrency);
  }, 0)), [accounts, baseCurrency]);
  
  const totalSpentBase = React.useMemo(() => Math.round(currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "expense").reduce((s, t) => {
    const sCurr = (t.sourceCurrency && isNaN(Number(t.sourceCurrency))) ? t.sourceCurrency : "USD";
    const val = (t.sourceAmountUSD && t.sourceAmountUSD !== 0 && baseCurrency === 'USD') 
      ? t.sourceAmountUSD 
      : RatesService.convert(t.sourceAmount || 0, sCurr, baseCurrency);
    return s + val;
  }, 0)), [currentMonthTransactions, baseCurrency]);

  const totalEarnedBase = React.useMemo(() => Math.round(currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "income").reduce((s, t) => {
    const tCurr = (t.targetCurrency && isNaN(Number(t.targetCurrency))) ? t.targetCurrency : "USD";
    const val = (t.targetAmountUSD && t.targetAmountUSD !== 0 && baseCurrency === 'USD')
      ? t.targetAmountUSD
      : RatesService.convert(t.targetAmount || 0, tCurr, baseCurrency);
    return s + val;
  }, 0)), [currentMonthTransactions, baseCurrency]);

  const stats = React.useMemo(() => {
    const localCur = localStorage.getItem("cl_numpad_pref_currency") || baseCurrency;
    const localSym = getSymbol(localCur);
    
    const isBase = categoryCurrencyMode === 'base';
    const spent = isBase ? totalSpentBase : Math.round(RatesService.convert(totalSpentBase, baseCurrency, localCur));
    const earned = isBase ? totalEarnedBase : Math.round(RatesService.convert(totalEarnedBase, baseCurrency, localCur));
    const balance = isBase ? totalBalanceBase : Math.round(RatesService.convert(totalBalanceBase, baseCurrency, localCur));
    const symbol = isBase ? baseSymbol : localSym;
    
    return { displaySpent: spent, displayEarned: earned, displayBalance: balance, currentSymbol: symbol, localCurrencyCode: localCur, localSymbol: localSym };
  }, [categoryCurrencyMode, totalSpentBase, totalEarnedBase, totalBalanceBase, baseCurrency, baseSymbol, getSymbol]);

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
