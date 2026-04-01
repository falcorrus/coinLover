import { Account } from "../types";
import { RatesService } from "../services/RatesService";

export const getLocalTimeString = (dateInput?: string) => {
  const d = dateInput ? new Date(dateInput.replace(/-/g, '/').replace('T', ' ')) : new Date();
  return d.toISOString();
};

export const enrichAccountsWithUSD = (accs: Account[]): Account[] => {
  const baseCur = RatesService.getBaseCurrency();
  return accs.map(a => ({
    ...a,
    balanceUSD: Math.round(RatesService.convert(a.balance, a.currency || "USD", baseCur) * 100) / 100
  }));
};
