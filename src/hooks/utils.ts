import { Account } from "../types";
import { RatesService } from "../services/RatesService";

export const safeParseDate = (dateStr?: string): Date => {
  if (!dateStr) return new Date();
  const s = String(dateStr).trim();
  
  // 1. Try ISO Format (2026-04-01...)
  if (s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-') {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  
  // 2. Try DD.MM.YYYY HH:mm or DD.MM.YYYY
  if (s.includes('.')) {
    const parts = s.split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || "";
    
    const p = datePart.split('.');
    if (p.length >= 3) {
      const day = parseInt(p[0]);
      const month = parseInt(p[1]);
      let year = parseInt(p[2]);
      if (year < 100) year += 2000;
      
      let hour = 12, min = 0, sec = 0;
      if (timePart) {
        const t = timePart.split(':');
        hour = parseInt(t[0]) || 0;
        min = parseInt(t[1]) || 0;
        sec = parseInt(t[2]) || 0;
      }
      
      const d = new Date(year, month - 1, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3. Try D/M/YYYY or M/D/YYYY (Slashes)
  if (s.includes('/')) {
    const p = s.split(/[ /:]/);
    if (p.length >= 3) {
      let day, month, year;
      const v1 = parseInt(p[0]);
      const v2 = parseInt(p[1]);
      const v3 = parseInt(p[2]);

      if (v1 > 12) { day = v1; month = v2 - 1; }
      else if (v2 > 12) { month = v1 - 1; day = v2; }
      else { day = v1; month = v2 - 1; }
      
      year = v3 < 100 ? 2000 + v3 : v3;
      const hour = p[3] ? parseInt(p[3]) : 12;
      const min = p[4] ? parseInt(p[4]) : 0;
      const sec = p[5] ? parseInt(p[5]) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  // Last resort: native
  const lastResort = new Date(s);
  return isNaN(lastResort.getTime()) ? new Date() : lastResort;
};

export const formatDateOnly = (dateInput?: string | Date) => {
  const date = dateInput instanceof Date ? dateInput : safeParseDate(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}.${month}.${year}`;
};

export const formatDateTime = (dateInput?: string | Date) => {
  const date = dateInput instanceof Date ? dateInput : safeParseDate(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

export const getLocalTimeString = (dateInput?: string) => {
  return safeParseDate(dateInput).toISOString();
};

export const enrichAccountsWithUSD = (accs: Account[]): Account[] => {
  const baseCur = RatesService.getBaseCurrency();
  return accs.map(a => ({
    ...a,
    balanceUSD: Math.round(RatesService.convert(a.balance, a.currency || baseCur, baseCur) * 100) / 100
  }));
};
