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

  const areSettingsDifferent = useCallback((remote: SyncSettingsFields, local: { accounts: Account[], categories: Category[], incomes: IncomeSource[] }) => {
    try {
      const normalizeAcc = (accs: any[]) => (accs || []).map(a => ({
        id: String(a.id).trim(),
        name: String(a.name).trim(),
        balance: Math.round(Number(a.balance) * 100) / 100
      })).sort((a, b) => a.id.localeCompare(b.id));

      const normalizeEntity = (items: any[]) => (items || []).map(i => ({
        id: String(i.id).trim(),
        name: String(i.name).trim()
      })).sort((a, b) => a.id.localeCompare(b.id));

      const rAcc = normalizeAcc(remote.accounts || []);
      const lAcc = normalizeAcc(local.accounts);
      if (JSON.stringify(rAcc) !== JSON.stringify(lAcc)) {
        console.log("[Sync] Difference in accounts detected", { remote: rAcc, local: lAcc });
        return true;
      }

      const rCat = normalizeEntity(remote.categories || []);
      const lCat = normalizeEntity(local.categories);
      if (JSON.stringify(rCat) !== JSON.stringify(lCat)) {
        console.log("[Sync] Difference in categories detected");
        return true;
      }

      const rInc = normalizeEntity(remote.incomes || []);
      const lInc = normalizeEntity(local.incomes);
      if (JSON.stringify(rInc) !== JSON.stringify(lInc)) {
        console.log("[Sync] Difference in incomes detected");
        return true;
      }

      return false;
    } catch (e) { 
      console.error("[Sync] Comparison failed", e);
      return true; 
    }
  }, []);

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
      if (remote.timestamp) {
        const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
        const localDate = localLastSync ? new Date(localLastSync.replace(/-/g, '/').replace('T', ' ')) : new Date(0);
        
        const isNewer = remoteDate.getTime() > localDate.getTime() + 1000;
        const isSameTimeButDifferentData = Math.abs(remoteDate.getTime() - localDate.getTime()) < 2000 && areSettingsDifferent(remote, { accounts, categories, incomes });

        if (isNewer || isSameTimeButDifferentData) {
          console.log("[Sync] Conflict detected during pull!", { isNewer, isSameTimeButDifferentData });
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
  }, [updateLocalFromRemote, ssId, accounts, categories, incomes, areSettingsDifferent]);

  const checkConflicts = useCallback(async () => {
    if (syncStatus === "loading" || !!conflictData) return;
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
      
      const isNewer = remoteDate.getTime() > localDate.getTime() + 2000;
      const isSameTimeButDifferentData = areSettingsDifferent(remote, { accounts, categories, incomes });

      if (isNewer || isSameTimeButDifferentData) {
        console.log("[Sync] Conflict detected during periodic check!", { isNewer, isSameTimeButDifferentData });
        setConflictData(remote);
      }
    } catch (e) { console.error("Conflict check failed:", e); }
  }, [updateLocalFromRemote, ssId, syncStatus, conflictData, accounts, categories, incomes, areSettingsDifferent]);

  const pushSettings = useCallback((a: Account[], c: Category[], i: IncomeSource[], immediate = false) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    const performPush = async () => {
      setSyncStatus("loading");
      
      // ПРЕДПОЛЕТНАЯ ПРОВЕРКА КОНФЛИКТА
      try {
        const remote = await googleSheetsService.fetchSettings(ssId);
        const localLastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
        
        if (remote && remote.timestamp) {
          const remoteDate = new Date(remote.timestamp.replace(/-/g, '/').replace('T', ' '));
          const localDate = localLastSync ? new Date(localLastSync.replace(/-/g, '/').replace('T', ' ')) : new Date(0);
          
          const isNewer = remoteDate.getTime() > localDate.getTime() + 2000;
          const isSameTimeButDifferentData = areSettingsDifferent(remote, { accounts: a, categories: c, incomes: i });

          if (isNewer || isSameTimeButDifferentData) {
            console.log("[Sync] Conflict detected BEFORE push! Aborting overwrite.", { isNewer, isSameTimeButDifferentData });
            setConflictData(remote);
            setSyncStatus("success");
            return;
          }
        }
      } catch (e) {
        console.warn("[Sync] Pre-push check failed, proceeding anyway...", e);
      }

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
