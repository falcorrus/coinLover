import { GOOGLE_SCRIPT_URL } from "../constants";
import { SyncPayload } from "../types";

// Push & Pull sync service.
export const googleSheetsService = {
  async fetchSettings(): Promise<any> {
    try {
      const isDemo = window.localStorage.getItem("coinlover_demo") !== "false";
      const url = isDemo ? `${GOOGLE_SCRIPT_URL}?demo=true` : GOOGLE_SCRIPT_URL;
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === "success") return result.data;
      throw new Error(result.message);
    } catch (error) {
      console.error("Fetch from Sheets failed:", error);
      return null;
    }
  },

  async fetchMonthData(month: string): Promise<any> {
    try {
      const isDemo = window.localStorage.getItem("coinlover_demo") !== "false";
      const url = `${GOOGLE_SCRIPT_URL}?month=${month}${isDemo ? '&demo=true' : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === "success") return result.data;
      throw new Error(result.message);
    } catch (error) {
      console.error("Fetch month data failed:", error);
      return null;
    }
  },

  async syncToSheets(data: SyncPayload): Promise<boolean> {
    try {
      const isDemo = window.localStorage.getItem("coinlover_demo") !== "false";
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
};
