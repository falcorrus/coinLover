import { Account } from "../types";
import { RatesService } from "../services/RatesService";

export const safeParseDate = (dateStr?: string): Date => {
  if (!dateStr) return new Date();
  const s = String(dateStr).trim();
  
  // 1. Try ISO Format (2026-04-01...) - ALWAYS FIRST if it looks like ISO
  if (s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-') {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  
  // 2. Try D/M/YYYY or M/D/YYYY (Slashes)
  if (s.includes('/')) {
    const p = s.split(/[ /:]/);
    if (p.length >= 3) {
      let day, month, year;
      const v1 = parseInt(p[0]);
      const v2 = parseInt(p[1]);
      const v3 = parseInt(p[2]);

      // If first is > 12, it's definitely D/M/Y
      // If second is > 12, it's definitely M/D/Y
      // If both <= 12, we prefer D/M/Y for non-US users (CoinLover default)
      if (v1 > 12) { day = v1; month = v2 - 1; }
      else if (v2 > 12) { month = v1 - 1; day = v2; }
      else { day = v1; month = v2 - 1; } // Preference for D/M/Y
      
      year = v3 < 100 ? 2000 + v3 : v3;
      const hour = p[3] ? parseInt(p[3]) : 12;
      const min = p[4] ? parseInt(p[4]) : 0;
      const sec = p[5] ? parseInt(p[5]) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  // 3. Try DD.MM.YYYY (Dots/Dashes)
  const p = s.split(/[.-]/);
  if (p.length >= 3) {
    const v1 = parseInt(p[0]);
    const v2 = parseInt(p[1]);
    let year = parseInt(p[2]);
    if (year < 100) year += 2000;
    const d = new Date(year, v2 - 1, v1, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Last resort: native
  const lastResort = new Date(s);
  return isNaN(lastResort.getTime()) ? new Date() : lastResort;
};

export const getLocalTimeString = (dateInput?: string) => {
  return safeParseDate(dateInput).toISOString();
};

export const enrichAccountsWithUSD = (accs: Account[]): Account[] => {
  const baseCur = RatesService.getBaseCurrency();
  return accs.map(a => ({
    ...a,
    balanceUSD: Math.round(RatesService.convert(a.balance, a.currency || "USD", baseCur) * 100) / 100
  }));
};
