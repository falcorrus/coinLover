import { Account } from "../types";
import { RatesService } from "../services/RatesService";

export const safeParseDate = (dateStr?: string): Date => {
  if (!dateStr) return new Date();
  const s = String(dateStr).trim();
  
  // 1. Try native ISO
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  
  // 2. Try M/D/YYYY (Google Sheets US Format)
  if (s.includes('/')) {
    const p = s.split(/[ /:]/); // Split by space, slash or colon
    if (p.length >= 3) {
      const month = parseInt(p[0]) - 1;
      const day = parseInt(p[1]);
      let year = parseInt(p[2]);
      if (year < 100) year += 2000;
      const hour = p[3] ? parseInt(p[3]) : 12;
      const min = p[4] ? parseInt(p[4]) : 0;
      d = new Date(year, month, day, hour, min, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  // 3. Try DD.MM.YYYY (Local formats)
  const p = s.split(/[.-]/);
  if (p.length >= 3) {
    let year = parseInt(p[2]);
    if (year < 100) year += 2000;
    d = new Date(year, parseInt(p[1]) - 1, parseInt(p[0]), 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }
  
  return new Date(); // Fallback to now
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
