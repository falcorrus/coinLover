import { useState, useCallback, useRef } from "react";
import { APP_SETTINGS } from "../constants/settings";
import { Account, Transaction, Category, IncomeSource, SyncSettingsFields } from "../types";
import { googleSheetsService } from "../services/googleSheets";
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
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const updateLocalFromRemote = useCallback((data: SyncSettingsFields & { transactions?: Transaction[], users?: { name: string; id: string }[] }) => {
    // Если в облаке пусто, а у нас локально уже что-то есть — не затираем наше, 
    // скорее всего мы сейчас в процессе настройки первого кошелька
    const isRemoteEmpty = (!data.accounts || data.accounts.length === 0) && (!data.categories || data.categories.length === 0);
    const isLocalEmpty = accounts.length === 0 && categories.length === 0;
    
    if (isRemoteEmpty && !isLocalEmpty) {
      console.log("[Sync] Remote is empty but local has data. Skipping overwrite.");
      return;
    }

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
      if (ssId) localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
      setSyncStatus("success");
      return true;
    }
    setSyncStatus("error");
    return false;
  }, [updateLocalFromRemote, ssId]);

  const checkConflicts = useCallback(async () => {
    if (syncStatus === "loading") return;
    try {
      const remote = await googleSheetsService.fetchSettings(ssId);
      if (!remote || !remote.timestamp) return;
      const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
      if (!localLastSync) {
        if (accounts.length === 0 && categories.length === 0) updateLocalFromRemote(remote);
        return;
      }
      const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
      const localDate = new Date(localLastSync.replace(/-/g, '/').replace('T', ' '));
      if (remoteDate.getTime() > localDate.getTime()) setConflictData(remote);
    } catch (e) { console.error("Conflict check failed:", e); }
  }, [updateLocalFromRemote, ssId, syncStatus, accounts.length, categories.length]);

  const pushSettings = useCallback((a: Account[], c: Category[], i: IncomeSource[]) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    setSyncStatus("loading");
    debounceTimer.current = setTimeout(async () => {
      const ts = getLocalTimeString();
      const baseCurrency = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";
      const ok = await googleSheetsService.syncToSheets({ action: "syncSettings", targetSheet: "Configs", accounts: enrichAccountsWithUSD(a), categories: c, incomes: i, baseCurrency, timestamp: ts, ssId });
      if (ok) { 
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, ts); 
        setSyncStatus("success"); 
      } else {
        setSyncStatus("error");
      }
    }, 2000); // 2 second debounce for settings sync
    return true;
  }, [ssId]);

  return {
    syncStatus, setSyncStatus, conflictData, setConflictData, 
    pullSettings, pushSettings, checkConflicts, updateLocalFromRemote
  };
};
