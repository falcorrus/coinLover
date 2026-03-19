import { useState, useCallback } from "react";
import { APP_SETTINGS } from "../constants/settings";
import { Account, Transaction, Category, IncomeSource, SyncSettingsFields } from "../types";
import { googleSheetsService } from "../services/googleSheets";
import { DEFAULT_CATEGORIES, INITIAL_INCOMES, INITIAL_ACCOUNTS } from "../constants";
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
  ssId?: string;
}

export const useSync = ({
  accounts, setAccounts, categories, setCategories, incomes, setIncomes, setTransactions, setUsers, ssId
}: SyncStateProps) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [conflictData, setConflictData] = useState<SyncSettingsFields | null>(null);

  const updateLocalFromRemote = useCallback((data: SyncSettingsFields & { transactions?: Transaction[], users?: { name: string; id: string }[] }) => {
    if (data.accounts) setAccounts(data.accounts);
    if (data.categories) setCategories(data.categories);
    if (data.incomes) setIncomes(data.incomes);
    if (data.users) setUsers(data.users);
    if (data.baseCurrency) localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY, data.baseCurrency);
    if (data.timestamp) localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, data.timestamp);
    if (data.transactions && Array.isArray(data.transactions)) {
      setTransactions([...data.transactions].sort((a, b) => new Date(b.date.replace(/-/g, '/').replace('T', ' ')).getTime() - new Date(a.date.replace(/-/g, '/').replace('T', ' ')).getTime()));
    }
    setConflictData(null);
  }, [setAccounts, setCategories, setIncomes, setTransactions, setUsers]);

  const pullSettings = useCallback(async () => {
    setSyncStatus("loading");
    const data = await googleSheetsService.fetchSettings(ssId);
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
  }, [updateLocalFromRemote, accounts.length, setAccounts, setCategories, setIncomes, ssId]);

  const checkConflicts = useCallback(async () => {
    try {
      const remote = await googleSheetsService.fetchSettings(ssId);
      if (!remote || !remote.timestamp) return;
      
      const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
      if (!localLastSync) {
        updateLocalFromRemote(remote);
        return;
      }

      const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
      const localDate = new Date(localLastSync.replace(/-/g, '/').replace('T', ' '));

      if (remoteDate.getTime() > localDate.getTime()) {
        setConflictData(remote);
      }
    } catch (e) {
      console.error("Conflict check failed:", e);
    }
  }, [updateLocalFromRemote, ssId]);

  const pushSettings = useCallback(async (a: Account[], c: Category[], i: IncomeSource[]) => {
    setSyncStatus("loading");
    const ts = getLocalTimeString();
    const bc = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";
    const ok = await googleSheetsService.syncToSheets({ action: "syncSettings", targetSheet: "Configs", accounts: enrichAccountsWithUSD(a), categories: c, incomes: i, timestamp: ts, ssId, baseCurrency: bc });
    if (ok) { 
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, ts); 
      setSyncStatus("success"); 
      return true;
    } else {
      setSyncStatus("error");
      return false;
    }
  }, [ssId]);

  return {
    syncStatus, setSyncStatus, conflictData, setConflictData, 
    pullSettings, pushSettings, checkConflicts, updateLocalFromRemote
  };
};
