import { GOOGLE_SCRIPT_URL } from "../constants";
import { APP_SETTINGS } from "../constants/settings";
import { SyncPayload } from "../types";

/**
 * Service for communicating with Google Sheets via Google Apps Script Web App.
 * Handles data persistence and retrieval with an offline-first approach.
 */
export const googleSheetsService = {
  async fetchSettings(retries = 2): Promise<any> {
    try {
      const isDemo = window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false";
      const url = isDemo ? `${GOOGLE_SCRIPT_URL}?demo=true` : GOOGLE_SCRIPT_URL;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      if (result.status === "success") return result.data;
      throw new Error(result.message || "Failed to fetch settings from GAS");
    } catch (error) {
      if (retries > 0) {
        console.warn(`Fetch settings failed, retrying... (${retries} left)`, error);
        await new Promise(res => setTimeout(res, 1000));
        return this.fetchSettings(retries - 1);
      }
      console.error("Fetch from Sheets failed after retries:", error);
      return null;
    }
  },

  async fetchMonthData(month: string): Promise<any> {
    try {
      const isDemo = window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false";
      const url = `${GOOGLE_SCRIPT_URL}?month=${month}${isDemo ? '&demo=true' : ''}`;
      
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
   * NOTE: Using 'no-cors' mode because GAS returns a 302 redirect which 
   * browser fetch blocks if CORS is not perfectly configured on the redirect target.
   * Drawback: We cannot see if the server returned an error (status 0).
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
      
      // In no-cors mode, we assume success if no exception was thrown during fetch setup/execution
      return true;
    } catch (error) {
      console.error("Sync to Sheets failed:", error);
      return false;
    }
  },
};
