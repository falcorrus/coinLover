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
        localStorage.clear(); // Полная очистка для безопасности новой сессии
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, ssIdFromUrl);
      }
      return ssIdFromUrl;
    }

    // 2. Фолбек на localStorage
    return localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID) || "";
  });

  useEffect(() => {
    if (activeTableId) {
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, activeTableId);
    }
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
