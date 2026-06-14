import { useState, useCallback, useRef } from "react";
import { APP_SETTINGS } from "../constants/settings";
import { Account, Transaction, Category, IncomeSource, SyncSettingsFields } from "../types";
import { googleSheetsService } from "../services/googleSheets";
import { RatesService } from "../services/RatesService";
import { getLocalTimeString, enrichAccountsWithUSD } from "./utils";

export type SyncStatus = "idle" | "loading" | "error" | "success";

interface SyncStateProps {
  accounts: Account[];
  setAccounts: (a: Account[]) => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;
  incomes: IncomeSource[];
  setIncomes: (i: IncomeSource[]) => void;
  setTransactions: (t: Transaction[]) => void;
  setUsers: (u: { name: string; id: string }[]) => void;
  setTariff?: (t: string) => void;
  ssId?: string;
}

export const useSync = ({
  accounts, setAccounts, categories, setCategories, incomes, setIncomes, setTransactions, setUsers, setTariff, ssId
}: SyncStateProps) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [accessError, setAccessError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastRemoteSnapshot = useRef<string>("");

  const lang = (typeof window !== "undefined" && localStorage.getItem("cl_lang") === "en") ? "en" : "ru";

  const getSettingsSnapshot = (data: any) => {
    try {
      const acc = (data.accounts || []).map((a: any) => ({ 
        id: String(a.id).trim(), 
        name: String(a.name).trim(), 
        balance: Math.round(Number(a.balance) * 100) / 100 
      })).sort((a: any, b: any) => a.id.localeCompare(b.id));
      
      const cat = (data.categories || []).map((c: any) => ({ 
        id: String(c.id).trim(), 
        name: String(c.name).trim() 
      })).sort((a: any, b: any) => a.id.localeCompare(b.id));
      
      const inc = (data.incomes || []).map((i: any) => ({ 
        id: String(i.id).trim(), 
        name: String(i.name).trim() 
      })).sort((a: any, b: any) => a.id.localeCompare(b.id));
      
      return JSON.stringify({ acc, cat, inc });
    } catch (e) { return ""; }
  };

  const updateLocalFromRemote = useCallback((data: SyncSettingsFields & { transactions?: Transaction[], users?: { name: string; id: string }[] }) => {
    if (data.accounts) {
      const sanitized = data.accounts.map(a => ({ ...a, balance: Number(a.balance) || 0 }));
      setAccounts(sanitized);
    }
    if (data.categories) setCategories(data.categories);
    if (data.incomes) setIncomes(data.incomes);
    if (data.users) setUsers(data.users);
    
    if (data.tariff) {
      localStorage.setItem("cl_user_tariff", data.tariff);
      if (setTariff) setTariff(data.tariff);
    } else {
      // Default to Free if not specified
      const defaultTariff = "Free";
      localStorage.setItem("cl_user_tariff", defaultTariff);
      if (setTariff) setTariff(defaultTariff);
    }
    
    if (data.baseCurrency) {
      const oldBase = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY);
      if (oldBase && oldBase !== data.baseCurrency) {
        // Базовая валюта изменилась - сбрасываем курсы, чтобы они пересчитались
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES);
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.RATES_LAST_SYNC);
        RatesService.clearMemoryCache();
      }
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY, data.baseCurrency);
    }
    if (data.timestamp) {
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, data.timestamp);
      lastRemoteSnapshot.current = getSettingsSnapshot(data);
    }
    if (data.transactions && Array.isArray(data.transactions)) {
      setTransactions([...data.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
    setAccessError(null);
  }, [setAccounts, setCategories, setIncomes, setTransactions, setUsers, setTariff, ssId]);

  const pullSettings = useCallback(async () => {
    if (!ssId) {
      setSyncStatus("idle");
      return false;
    }
    setSyncStatus("loading");

    try {
      const remote = await googleSheetsService.fetchSettings(ssId);
      if (remote) {
        const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
        
        if (remote.timestamp && localLastSync) {
          const remoteDate = new Date(remote.timestamp);
          const localDate = new Date(localLastSync);
          const isNewer = localLastSync && (remoteDate.getTime() > localDate.getTime() + 10000);
          const remoteSnap = getSettingsSnapshot(remote);
          const isDifferentFromSnapshot = lastRemoteSnapshot.current && remoteSnap !== lastRemoteSnapshot.current;

          if (isNewer || isDifferentFromSnapshot) {
            updateLocalFromRemote(remote);
            setSyncStatus("success");
            return true;
          }
        }

        updateLocalFromRemote(remote);
        setSyncStatus("success");
        return true;
      }
    } catch (e: any) {
      console.error("Pull settings error:", e);
      if (e.statusCode === 403 || (e.code && e.code === "access_denied")) {
        setAccessError(e.message || "Доступ ограничен");
        setSyncStatus("error");
        return false;
      }
      setAccessError(lang === "ru" ? "Ошибка загрузки данных. Проверьте соединение." : "Failed to load data. Check connection.");
    }
    setSyncStatus("error");
    return false;
  }, [updateLocalFromRemote, ssId, accounts.length, categories.length, lang]);

  const checkConflicts = useCallback(async () => {
    if (syncStatus === "loading" || !!accessError) return;
    if (!ssId) return;
    try {
      const remote = await googleSheetsService.fetchSettings(ssId);
      if (!remote || !remote.timestamp) return;
      const remoteSnap = getSettingsSnapshot(remote);
      const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
      
      if (!localLastSync) {
        if (accounts.length === 0 && categories.length === 0) updateLocalFromRemote(remote);
        return;
      }

      const remoteDate = new Date(remote.timestamp);
      const localDate = new Date(localLastSync);
      const isNewer = remoteDate.getTime() > localDate.getTime() + 10000;
      const isDifferentFromSnapshot = lastRemoteSnapshot.current && remoteSnap !== lastRemoteSnapshot.current;

      if (isNewer || isDifferentFromSnapshot) {
        updateLocalFromRemote(remote);
      }
    } catch (e: any) { 
      if (e.statusCode === 403) setAccessError(e.message);
    }
  }, [updateLocalFromRemote, ssId, syncStatus, accessError, accounts.length, categories.length]);

  const pushSettings = useCallback((a: Account[], c: Category[], i: IncomeSource[], immediate = false) => {
    if (!ssId) {
      setSyncStatus("success");
      return true;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (accessError) return Promise.resolve(false);
    
    const performPush = async () => {
      setSyncStatus("loading");

      const ts = getLocalTimeString();
      const baseCurrency = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";
      
      // Safeguard: don't push if all entities are empty (likely a race condition or error)
      if (a.length === 0 && c.length === 0 && i.length === 0) {
        console.warn("Sync: Attempted to push empty settings, skipping to prevent data loss.");
        setSyncStatus("success");
        return;
      }

      const ok = await googleSheetsService.syncToSheets({ 
        action: "syncSettings", targetSheet: "Configs", 
        accounts: enrichAccountsWithUSD(a), categories: c, incomes: i, 
        baseCurrency, timestamp: ts, ssId 
      });
      
      if (ok) { 
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, ts);
        lastRemoteSnapshot.current = getSettingsSnapshot({ accounts: a, categories: c, incomes: i });
        setSyncStatus("success"); 
      } else {
        setSyncStatus("error");
      }
    };

    if (immediate) performPush();
    else debounceTimer.current = setTimeout(performPush, 2000);
    return true;
  }, [ssId, accounts, categories, incomes, accessError]);

  return {
    syncStatus, setSyncStatus, accessError, setAccessError,
    pullSettings, pushSettings, checkConflicts, updateLocalFromRemote
  };
};
