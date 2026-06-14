import { useState, useCallback, useEffect } from "react";
import { APP_SETTINGS } from "../constants/settings";

export const useUsers = () => {
  const [activeTableId, setActiveTableId] = useState<string>(() => {
    // 1. Приоритет URL-пути (e.g. /s/ID) и параметрам
    const urlParams = new URLSearchParams(window.location.search);
    const ssIdFromUrl = urlParams.get("ssId");
    
    // Check for path-based ID: /s/ABC
    const pathMatch = window.location.pathname.match(/\/s\/([-\w]+)/);
    const ssIdFromPath = pathMatch ? pathMatch[1] : null;

    const targetSsId = ssIdFromPath || ssIdFromUrl;
    
    const currentId = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID);

    // Очищаем старые данные ТОЛЬКО если таблица реально изменилась
    const isNewTable = targetSsId && targetSsId !== currentId;

    if (isNewTable) {
      console.log("New ssId detected, clearing old data...");
      
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.ACCOUNTS);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.CATEGORIES);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.INCOMES);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
      localStorage.removeItem("cl_onboarding_completed");
      
      if (targetSsId) {
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, targetSsId);
        document.cookie = `cl_active_table_id=${targetSsId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
        
        // Очищаем URL от ssId (превращаем /s/ID в /)
        const cleanUrl = window.location.origin + "/";
        window.history.replaceState({}, "", cleanUrl);
        
        return targetSsId;
      }
    }

    // Если ID тот же самый — просто чистим URL без удаления данных
    if (targetSsId === currentId && (ssIdFromUrl || ssIdFromPath)) {
      const cleanUrl = window.location.origin + "/";
      window.history.replaceState({}, "", cleanUrl);
    }

    // 2. Фолбек на localStorage или Cookie
    const localId = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID);
    if (localId) return localId;

    // Пытаемся достать из Cookie (важно для первого запуска PWA на iPhone)
    const cookieMatch = document.cookie.match(/cl_active_table_id=([^;]+)/);
    if (cookieMatch && cookieMatch[1]) {
      const cookieId = cookieMatch[1];
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, cookieId);
      return cookieId;
    }

    return "";
  });

  useEffect(() => {
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, activeTableId);
  }, [activeTableId]);

  const switchTable = useCallback((id: string) => {
    setActiveTableId(id);
  }, []);

  return {
    activeTableId,
    switchTable,
    setActiveTableId
  };
};
