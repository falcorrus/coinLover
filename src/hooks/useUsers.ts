import { useState, useCallback, useEffect } from "react";
import { APP_SETTINGS } from "../constants/settings";

export const useUsers = () => {
  const [activeTableId, setActiveTableId] = useState<string>(() => {
    // 1. Приоритет URL-параметру ?ssId=...
    const urlParams = new URLSearchParams(window.location.search);
    const ssIdFromUrl = urlParams.get("ssId");
    
    if (ssIdFromUrl) {
      const currentStored = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID);
      // Если ID из URL отличается от сохраненного, нужно сбросить старые данные
      if (ssIdFromUrl !== currentStored) {
        console.log("New ssId detected in URL, clearing old data...");
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.ACCOUNTS);
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.CATEGORIES);
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.INCOMES);
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.TRANSACTIONS);
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
        
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, ssIdFromUrl);
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
      } else {
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
      }

      // Очищаем URL, чтобы параметр ssId не мешал ручному переключению в будущем
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);

      return ssIdFromUrl;
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
