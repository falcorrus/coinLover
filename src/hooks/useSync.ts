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
  const lastRemoteSnapshot = useRef<string>("");

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
    if (data.accounts) setAccounts(data.accounts);
    if (data.categories) setCategories(data.categories);
    if (data.incomes) setIncomes(data.incomes);
    if (data.users) setUsers(data.users);
    if (data.baseCurrency) localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY, data.baseCurrency);
    if (data.timestamp) {
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, data.timestamp);
      lastRemoteSnapshot.current = getSettingsSnapshot(data);
    }
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
      
      // Защита новой таблицы
      const isRemoteEmpty = (!remote.accounts || remote.accounts.length === 0) && (!remote.categories || remote.categories.length === 0);
      const isLocalEmpty = accounts.length === 0 && categories.length === 0;
      
      if (isRemoteEmpty && !isLocalEmpty) {
        setSyncStatus("success");
        return true;
      }

      // Проверка конфликта при загрузке: если облако изменилось с нашего последнего визита
        if (remote.timestamp && localLastSync) {
          const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
          const localDate = new Date(localLastSync.replace(/-/g, '/').replace('T', ' '));
          
          // Увеличиваем буфер до 5 секунд для стабильности
          const isNewer = remoteDate.getTime() > localDate.getTime() + 5000;
          const remoteSnap = getSettingsSnapshot(remote);
          const isDifferentFromSnapshot = lastRemoteSnapshot.current && remoteSnap !== lastRemoteSnapshot.current;

          if (isNewer || isDifferentFromSnapshot) {
            console.log("[Sync] Conflict detected during pull!", { isNewer, isDifferentFromSnapshot });
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
      
      const remoteSnap = getSettingsSnapshot(remote);
      const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
      
      if (!localLastSync) {
        if (accounts.length === 0 && categories.length === 0) updateLocalFromRemote(remote);
        return;
      }

      const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
      const localDate = new Date(localLastSync.replace(/-/g, '/').replace('T', ' '));
      const isNewer = remoteDate.getTime() > localDate.getTime() + 2000;
      const isDifferentFromSnapshot = lastRemoteSnapshot.current && remoteSnap !== lastRemoteSnapshot.current;

      if (isNewer || isDifferentFromSnapshot) {
        console.log("[Sync] Conflict in background check!", { isNewer, isDifferentFromSnapshot });
        setConflictData(remote);
      }
    } catch (e) { console.error("Conflict check failed:", e); }
  }, [updateLocalFromRemote, ssId, syncStatus, conflictData, accounts.length, categories.length]);

  const pushSettings = useCallback((a: Account[], c: Category[], i: IncomeSource[], immediate = false) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    const performPush = async () => {
      setSyncStatus("loading");
      
      // ПРЕДПОЛЕТНАЯ ПРОВЕРКА: Сравниваем ОБЛАКО с нашим ПОСЛЕДНИМ ИЗВЕСТНЫМ снимком облака
      try {
        const remote = await googleSheetsService.fetchSettings(ssId);
        if (remote && remote.timestamp) {
          const remoteSnap = getSettingsSnapshot(remote);
          const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
          const localDate = localLastSync ? new Date(localLastSync.replace(/-/g, '/').replace('T', ' ')) : new Date(0);
          const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));

          const isCloudNewer = remoteDate.getTime() > localDate.getTime() + 2000;
          // Если данные в облаке отличаются от тех, что мы скачали в прошлый раз — значит был внешний эдит
          const isCloudChangedSinceLastSync = lastRemoteSnapshot.current && remoteSnap !== lastRemoteSnapshot.current;

          if (isCloudNewer || isCloudChangedSinceLastSync) {
            console.log("[Sync] Conflict detected BEFORE push!", { isCloudNewer, isCloudChangedSinceLastSync });
            setConflictData(remote);
            setSyncStatus("success");
            return;
          }
        }
      } catch (e) { console.warn("[Sync] Pre-push check failed", e); }

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
        // Обновляем наш снимок — теперь облако точно такое же, как мы отправили
        lastRemoteSnapshot.current = getSettingsSnapshot({ accounts: a, categories: c, incomes: i });
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
  }, [ssId, accounts, categories, incomes]);

  return {
    syncStatus, setSyncStatus, conflictData, setConflictData, 
    pullSettings, pushSettings, checkConflicts, updateLocalFromRemote
  };
};
