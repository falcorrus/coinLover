import { GOOGLE_SCRIPT_URL } from "../constants";
import { SyncPayload } from "../types";

// Push-only sync service. No getData() — app is the single source of truth.
export const googleSheetsService = {
  async syncToSheets(data: SyncPayload): Promise<boolean> {
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data),
      });
      return true;
    } catch (error) {
      console.error("Sync to Sheets failed:", error);
      return false;
    }
  },
};
