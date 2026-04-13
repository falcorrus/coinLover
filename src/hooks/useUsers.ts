import { useState, useCallback, useEffect } from "react";
import { APP_SETTINGS } from "../constants/settings";

export const useUsers = () => {
  const [activeTableId, setActiveTableId] = useState<string>(() => {
    // 1. Приоритет URL-пути (e.g. /s/ID) и параметрам
    const urlParams = new URLSearchParams(window.location.search);
    const ssIdFromUrl = urlParams.get("ssId");
    const isDemoParam = urlParams.get("demo") === "true";
    
    // Check for path-based ID: /s/ABC
    // Упрощаем регулярку и убираем жесткую проверку длины
    const pathMatch = window.location.pathname.match(/\/s\/([-\w]+)/);
    const ssIdFromPath = pathMatch ? pathMatch[1] : null;

    const targetSsId = ssIdFromPath || ssIdFromUrl;
    
    if (targetSsId || isDemoParam) {
      console.log(isDemoParam ? "Demo mode requested via URL" : "New ssId detected in URL/Path, clearing old data...");
      
      // Очищаем старые данные при смене режима или таблицы
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.ACCOUNTS);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.CATEGORIES);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.INCOMES);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
      localStorage.removeItem("cl_onboarding_completed");
      
      if (isDemoParam) {
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "true");
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, "");
        return "";
      } else {
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, targetSsId!);
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
        
        // ВАЖНО: Мы НЕ делаем replaceState сразу, чтобы Safari мог сохранить URL с ID на экран Домой.
        // Мы сделаем это позже или оставим как есть - /s/ID не мешает работе приложения.
        // Если очень хочется очистить, можно сделать это через useEffect.
        
        return targetSsId!;
      }
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
