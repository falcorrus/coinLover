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
    const remote = await googleSheetsService.fetchSettings(ssId);
    
    if (remote) {
      const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
      
      // Если в облаке ПУСТО, а у нас ЕСТЬ данные — не затираем (защита новой таблицы)
      const isRemoteEmpty = (!remote.accounts || remote.accounts.length === 0) && (!remote.categories || remote.categories.length === 0);
      const isLocalEmpty = accounts.length === 0 && categories.length === 0;
      
      if (isRemoteEmpty && !isLocalEmpty) {
        console.log("[Sync] Remote is empty but local has data. Skipping pull to protect local setup.");
        setSyncStatus("success");
        return true;
      }

      // ПРОВЕРКА КОНФЛИКТА ПРИ ЗАГРУЗКЕ
      if (localLastSync && remote.timestamp) {
        const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
        const localDate = new Date(localLastSync.replace(/-/g, '/').replace('T', ' '));
        
        // Если в облаке данные НОВЕЕ, чем наша последняя синхронизация — показываем модалку
        if (remoteDate.getTime() > localDate.getTime() + 1000) { // +1s buffer
          console.log("[Sync] Conflict detected during pull! Remote is newer.");
          setConflictData(remote);
          setSyncStatus("success");
          return true;
        }
      }

      updateLocalFromRemote(remote);
      if (ssId) localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
      setSyncStatus("success");
      return true;
    }
    setSyncStatus("error");
    return false;
  }, [updateLocalFromRemote, ssId, accounts.length, categories.length]);

  const checkConflicts = useCallback(async () => {
    if (syncStatus === "loading" || !!conflictData) return;
    try {
      const remote = await googleSheetsService.fetchSettings(ssId);
      if (!remote || !remote.timestamp) return;
      const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
      
      if (!localLastSync) {
        // Если синхронизаций еще не было — просто берем данные из облака
        if (accounts.length === 0 && categories.length === 0) updateLocalFromRemote(remote);
        return;
      }

      const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
      const localDate = new Date(localLastSync.replace(/-/g, '/').replace('T', ' '));
      
      if (remoteDate.getTime() > localDate.getTime() + 2000) { // 2s buffer for periodic check
        console.log("[Sync] Periodic check found newer data in cloud!");
        setConflictData(remote);
      }
    } catch (e) { console.error("Conflict check failed:", e); }
  }, [updateLocalFromRemote, ssId, syncStatus, conflictData, accounts.length, categories.length]);

  const pushSettings = useCallback((a: Account[], c: Category[], i: IncomeSource[], immediate = false) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    const performPush = async () => {
      setSyncStatus("loading");
      const ts = getLocalTimeString();
      const baseCurrency = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";
      console.log("[Sync] Pushing settings to cloud...", { accounts: a.length, categories: c.length, ssId });
      
      const ok = await googleSheetsService.syncToSheets({ 
        action: "syncSettings", 
        targetSheet: "Configs", 
        accounts: enrichAccountsWithUSD(a), 
        categories: c, 
        incomes: i, 
        baseCurrency, 
        timestamp: ts, 
        ssId 
      });
      
      if (ok) { 
        console.log("[Sync] Push success!");
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, ts); 
        setSyncStatus("success"); 
      } else {
        console.error("[Sync] Push failed!");
        setSyncStatus("error");
      }
    };

    if (immediate) {
      performPush();
    } else {
      setSyncStatus("loading");
      debounceTimer.current = setTimeout(performPush, 2000);
    }
    return true;
  }, [ssId]);

  return {
    syncStatus, setSyncStatus, conflictData, setConflictData, 
    pullSettings, pushSettings, checkConflicts, updateLocalFromRemote
  };
};
