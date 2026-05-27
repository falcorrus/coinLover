import { APP_SETTINGS } from "../constants/settings";
import { SyncPayload } from "../types";
import { CapacitorHttp, Capacitor } from "@capacitor/core";

const getGoogleScriptUrl = () => {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    const isProd = (import.meta as any).env.PROD;
    return isProd ? "https://coinlover.ru/api/sheets" : "https://coin.reloto.ru/api/sheets";
  }
  return "/api/sheets";
};

// Universal fetch that uses native HTTP on mobile to bypass CORS
const universalFetch = async (url: string, options?: any) => {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    try {
      const response = await CapacitorHttp.request({
        url,
        method: options?.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        data: options?.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
        connectTimeout: 10000,
        readTimeout: 10000
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => {
          if (typeof response.data === 'string') {
            try {
              return JSON.parse(response.data);
            } catch (err) {
              return response.data;
            }
          }
          return response.data;
        }
      };
    } catch (e: any) {
      console.error("Native fetch failed:", e);
      throw e;
    }
  }
  
  return fetch(url, options);
};

/**
 * Service for communicating with Google Sheets via Google Apps Script Web App.
 */
export const googleSheetsService = {
  async fetchSettings(ssId?: string, retries = 2): Promise<any> {
    const GOOGLE_SCRIPT_URL = getGoogleScriptUrl();
    try {
      const isDemo = ssId ? false : (window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) === "true");
      let url = isDemo ? `${GOOGLE_SCRIPT_URL}?demo=true` : GOOGLE_SCRIPT_URL;
      
      if (ssId) {
        url += (url.includes('?') ? '&' : '?') + `ssId=${ssId}`;
      }
      url += (url.includes('?') ? '&' : '?') + `t=${Date.now()}`;
      
      const response = await universalFetch(url);
      if (response.status === 403) {
        const errorData = await response.json();
        throw { statusCode: 403, ...errorData };
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      if (result.status === "success") return result.data;
      throw new Error(result.message || "Failed to fetch settings from GAS");
      } catch (error: any) {
      if (error.statusCode === 403) throw error; 
      if (retries > 0) {
        console.warn(`Fetch settings failed, retrying... (${retries} left)`, error);
        await new Promise(res => setTimeout(res, 1000));
        return this.fetchSettings(ssId, retries - 1);
      }
      console.error("Fetch from Sheets failed after retries:", error);
      return null;
    }
  },

  async fetchMonthData(month: string, ssId?: string): Promise<any> {
    const GOOGLE_SCRIPT_URL = getGoogleScriptUrl();
    try {
      const isDemo = ssId ? false : (window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) === "true");
      let url = `${GOOGLE_SCRIPT_URL}?month=${month}${isDemo ? '&demo=true' : ''}`;
      
      if (ssId) {
        url += `&ssId=${ssId}`;
      }
      url += `&t=${Date.now()}`;
      
      const response = await universalFetch(url);
      if (response.status === 403) {
        const errorData = await response.json();
        throw { statusCode: 403, ...errorData };
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      if (result.status === "success") return result.data;
      throw new Error(result.message || "Failed to fetch month data from GAS");
    } catch (error: any) {
      if (error.statusCode === 403) throw error;
      console.error("Fetch month data failed:", error);
      return null;
    }
  },

  async syncToSheets(data: SyncPayload): Promise<boolean> {
    const GOOGLE_SCRIPT_URL = getGoogleScriptUrl();
    try {
      const isDemo = data.ssId ? false : (window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) === "true");
      const payload = { ...data, demo: isDemo };
      
      const response = await universalFetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return true;
    } catch (error) {
      console.error("Sync to Sheets failed:", error);
      return false;
    }
  },

  async findUserByContact(contact: string): Promise<any> {
    const GOOGLE_SCRIPT_URL = getGoogleScriptUrl();
    try {
      const response = await universalFetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "findUserByContact", contact }),
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      return result;
    } catch (error: any) {
      console.error("Find user failed:", error);
      throw error;
    }
  },

  async initTable(ssId: string): Promise<boolean> {
    return this.syncToSheets({ action: "initTable", ssId });
  },

  async fetchTemplate(): Promise<{ accounts?: any[], categories?: any[], incomes?: any[] } | null> {
    const GOOGLE_SCRIPT_URL = getGoogleScriptUrl();
    try {
      const url = `${GOOGLE_SCRIPT_URL}?action=template`;
      const response = await universalFetch(url);
      if (!response.ok) return null;
      
      const result = await response.json();
      if (result.status === "success" && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch template from GAS", error);
      return null;
    }
  }
};
