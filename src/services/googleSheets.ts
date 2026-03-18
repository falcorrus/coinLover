import { GOOGLE_SCRIPT_URL } from "../constants";
import { APP_SETTINGS } from "../constants/settings";
import { SyncPayload } from "../types";

/**
 * Service for communicating with Google Sheets via Google Apps Script Web App.
 * Handles data persistence and retrieval with an offline-first approach.
 */
export const googleSheetsService = {
  async fetchSettings(ssId?: string, retries = 2): Promise<any> {
    try {
      const isDemo = window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false";
      let url = isDemo ? `${GOOGLE_SCRIPT_URL}?demo=true` : GOOGLE_SCRIPT_URL;
      
      if (ssId) {
        url += (url.includes('?') ? '&' : '?') + `ssId=${ssId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      if (result.status === "success") return result.data;
      throw new Error(result.message || "Failed to fetch settings from GAS");
    } catch (error) {
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
      const isDemo = window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false";
      let url = `${GOOGLE_SCRIPT_URL}?month=${month}${isDemo ? '&demo=true' : ''}`;
      
      if (ssId) {
        url += `&ssId=${ssId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      if (result.status === "success") return result.data;
      throw new Error(result.message || "Failed to fetch month data from GAS");
    } catch (error) {
      console.error("Fetch month data failed:", error);
      return null;
    }
  },

  /**
   * Pushes data to Google Sheets. 
   */
  async syncToSheets(data: SyncPayload): Promise<boolean> {
    try {
      const isDemo = window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false";
      const payload = { ...data, demo: isDemo };
      
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      
      return true;
    } catch (error) {
      console.error("Sync to Sheets failed:", error);
      return false;
    }
  },

  async initTable(ssId: string): Promise<boolean> {
    return this.syncToSheets({ action: "initTable", ssId });
  }
};
