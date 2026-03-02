import { GOOGLE_SCRIPT_URL } from "../constants";

export const googleSheetsService = {
  async getData() {
    // Note: GET requests to Apps Script often hit CORS if not handled with JSONP
    // Since we are doing one-way sync, this might not be needed.
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getData`);
      if (!response.ok) throw new Error("Failed to fetch data");
      return response.json();
    } catch (e) {
      console.error("getData failed:", e);
      throw e;
    }
  },

  async syncToSheets(data: any) {
    try {
      // Using text/plain and no-cors is the most reliable way to push data 
      // to Google Apps Script from a browser without CORS issues.
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
  }
};
