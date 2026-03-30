import { GOOGLE_SCRIPT_URL } from "../constants";
import { APP_SETTINGS } from "../constants/settings";
import { SyncPayload } from "../types";

/**
 * Service for communicating with Google Sheets via Google Apps Script Web App.
 */
export const googleSheetsService = {
  async fetchSettings(ssId?: string, retries = 2): Promise<any> {
    try {
      const isDemo = ssId ? false : (window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false");
      let url = isDemo ? `${GOOGLE_SCRIPT_URL}?demo=true` : GOOGLE_SCRIPT_URL;
      
      if (ssId) {
        url += (url.includes('?') ? '&' : '?') + `ssId=${ssId}`;
      }
      
      const response = await fetch(url);
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
    try {
      const isDemo = ssId ? false : (window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false");
      let url = `${GOOGLE_SCRIPT_URL}?month=${month}${isDemo ? '&demo=true' : ''}`;
      
      if (ssId) {
        url += `&ssId=${ssId}`;
      }
      
      const response = await fetch(url);
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
    try {
      const isDemo = data.ssId ? false : (window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false");
      const payload = { ...data, demo: isDemo };
      
      const response = await fetch(GOOGLE_SCRIPT_URL, {
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

  async initTable(ssId: string): Promise<boolean> {
    return this.syncToSheets({ action: "initTable", ssId });
  },

  async fetchTemplate(): Promise<{ accounts?: any[], categories?: any[], incomes?: any[] } | null> {
    try {
      const url = `${GOOGLE_SCRIPT_URL}?action=template`;
      const response = await fetch(url);
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
