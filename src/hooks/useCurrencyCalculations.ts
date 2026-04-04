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
    const amountUSD = isNaN(Number(t.sourceAmountUSD)) ? 0 : t.sourceAmountUSD;

    const val = (amountUSD && amountUSD !== 0 && baseCurrency === 'USD') 
      ? amountUSD 
      : RatesService.convert(amount || 0, sCurr, baseCurrency);
    return s + val;
  }, 0)), [currentMonthTransactions, baseCurrency, accounts]);

  const totalEarnedBase = React.useMemo(() => Math.round(currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "income").reduce((s, t) => {
    const aid = String(t.accountId || "").trim().toLowerCase();
    const account = accounts.find(a => String(a.id).trim().toLowerCase() === aid || String(a.name).trim().toLowerCase() === aid);
    const tCurr = t.targetCurrency || account?.currency || baseCurrency;
    const amount = isNaN(Number(t.targetAmount)) ? 0 : t.targetAmount;
    const amountUSD = isNaN(Number(t.targetAmountUSD)) ? 0 : t.targetAmountUSD;

    const val = (amountUSD && amountUSD !== 0 && baseCurrency === 'USD')
      ? amountUSD
      : RatesService.convert(amount || 0, tCurr, baseCurrency);
    return s + val;
  }, 0)), [currentMonthTransactions, baseCurrency, accounts]);

  const stats = React.useMemo(() => {
    const localCur = localStorage.getItem("cl_numpad_pref_currency") || baseCurrency;
    const localSym = getSymbol(localCur);
    const isBase = categoryCurrencyMode === 'base';

    const getSafeCurr = (t: Transaction) => {
      const aid = String(t.accountId || "").trim().toLowerCase();
      const account = accounts.find(a => String(a.id).trim().toLowerCase() === aid || String(a.name).trim().toLowerCase() === aid);
      // SAFETY: If lookup fails, default to localCur (RSD) instead of baseCurrency (EUR/USD)
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

    // Расчет в ЛОКАЛЬНОЙ ВАЛЮТЕ с приоритетом targetAmount
    const spentLocal = Math.round(currentMonthTransactions
      .filter(t => String(t.type).toLowerCase() === "expense")
      .reduce((s, t) => {
        // Если валюта цели совпадает с локальной - берем прямую цифру
        if (t.targetCurrency === localCur && t.targetAmount) {
          return s + t.targetAmount;
        }
        // Иначе конвертируем из базы (которая уже рассчитана с учетом sourceAmountUSD)
        const sCurr = getSafeCurr(t);
        const valBase = (t.sourceAmountUSD && t.sourceAmountUSD !== 0 && baseCurrency === 'USD') 
          ? t.sourceAmountUSD 
          : RatesService.convert(t.sourceAmount || 0, sCurr, baseCurrency);
        
        return s + RatesService.convert(valBase, baseCurrency, localCur);
      }, 0));

    const earnedLocal = Math.round(currentMonthTransactions
      .filter(t => String(t.type).toLowerCase() === "income")
      .reduce((s, t) => {
        // Для доходов targetAmount - это сумма, пришедшая на счет
        if (t.targetCurrency === localCur && t.targetAmount) {
          return s + t.targetAmount;
        }
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
