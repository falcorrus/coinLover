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
  const [accessError, setAccessError] = useState<string | null>(null);
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
    setAccessError(null);
  }, [setAccounts, setCategories, setIncomes, setTransactions, setUsers]);

  const pullSettings = useCallback(async () => {
    setSyncStatus("loading");
    try {
      const remote = await googleSheetsService.fetchSettings(ssId);
      if (remote) {
        const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
        const isRemoteEmpty = (!remote.accounts || remote.accounts.length === 0) && (!remote.categories || remote.categories.length === 0);
        const isLocalEmpty = accounts.length === 0 && categories.length === 0;
        
        if (isRemoteEmpty && !isLocalEmpty) {
          setSyncStatus("success");
          return true;
        }

        if (remote.timestamp && localLastSync) {
          const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
          const localDate = new Date(localLastSync.replace(/-/g, '/').replace('T', ' '));
          const isNewer = localLastSync && (remoteDate.getTime() > localDate.getTime() + 5000);
          const remoteSnap = getSettingsSnapshot(remote);
          const isDifferentFromSnapshot = lastRemoteSnapshot.current && remoteSnap !== lastRemoteSnapshot.current;

          if (isNewer || isDifferentFromSnapshot) {
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
    } catch (e: any) {
      if (e.statusCode === 403) {
        setAccessError(e.message || "Доступ ограничен");
        setSyncStatus("error");
        return false;
      }
    }
    setSyncStatus("error");
    return false;
  }, [updateLocalFromRemote, ssId, accounts.length, categories.length]);

  const checkConflicts = useCallback(async () => {
    if (syncStatus === "loading" || !!conflictData || !!accessError) return;
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
        setConflictData(remote);
      }
    } catch (e: any) { 
      if (e.statusCode === 403) setAccessError(e.message);
    }
  }, [updateLocalFromRemote, ssId, syncStatus, conflictData, accessError, accounts.length, categories.length]);

  const pushSettings = useCallback((a: Account[], c: Category[], i: IncomeSource[], immediate = false) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (accessError) return Promise.resolve(false);
    
    const performPush = async () => {
      setSyncStatus("loading");
      try {
        const remote = await googleSheetsService.fetchSettings(ssId);
        if (remote && remote.timestamp) {
          const remoteSnap = getSettingsSnapshot(remote);
          const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
          const localDate = localLastSync ? new Date(localLastSync.replace(/-/g, '/').replace('T', ' ')) : new Date(0);
          const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
          const isCloudNewer = localLastSync && (remoteDate.getTime() > localDate.getTime() + 5000);
          const isCloudChangedSinceLastSync = lastRemoteSnapshot.current && remoteSnap !== lastRemoteSnapshot.current;

          if (isCloudNewer || isCloudChangedSinceLastSync) {
            setConflictData(remote);
            setSyncStatus("success");
            return;
          }
        }
      } catch (e: any) { 
        if (e.statusCode === 403) {
          setAccessError(e.message);
          setSyncStatus("error");
          return;
        }
      }

      const ts = getLocalTimeString();
      const baseCurrency = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";
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
    syncStatus, setSyncStatus, conflictData, setConflictData, accessError, setAccessError,
    pullSettings, pushSettings, checkConflicts, updateLocalFromRemote
  };
};
