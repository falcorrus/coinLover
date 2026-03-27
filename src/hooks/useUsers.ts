import { useState, useCallback, useEffect } from "react";
import { APP_SETTINGS } from "../constants/settings";

export const useUsers = () => {
  const [activeTableId, setActiveTableId] = useState<string>(() => {
    // 1. Приоритет URL-параметрам
    const urlParams = new URLSearchParams(window.location.search);
    const ssIdFromUrl = urlParams.get("ssId");
    const isDemoParam = urlParams.get("demo") === "true";
    
    if (ssIdFromUrl || isDemoParam) {
      console.log(isDemoParam ? "Demo mode requested via URL" : "New ssId detected in URL, clearing old data...");
      
      // Очищаем старые данные при смене режима или таблицы
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.ACCOUNTS);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.CATEGORIES);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.INCOMES);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
      
      if (isDemoParam) {
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "true");
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID);
        localStorage.removeItem("cl_onboarding_completed");
      } else {
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, ssIdFromUrl!);
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
      }

      // Очищаем URL
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);

      return isDemoParam ? "" : ssIdFromUrl!;
    }

    // 2. Фолбек на localStorage
    return localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID) || "";
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
