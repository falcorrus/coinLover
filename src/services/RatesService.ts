import { APP_SETTINGS } from "../constants/settings";

export class RatesService {
    static getCachedRates(): Record<string, number> | null {
        const cached = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES);
        if (!cached) return null;

        try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, number>;
            }
            return null;
        } catch {
            return null;
        }
    }

    static getBaseCurrency(): string {
        return localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";
    }

    static shouldSyncRates(): boolean {
        const lastSync = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.RATES_LAST_SYNC);
        if (!lastSync) return true;

        try {
            const syncDate = new Date(parseInt(lastSync, 10));
            const now = new Date();
            const hoursSinceSync = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60);
            
            return hoursSinceSync > APP_SETTINGS.RATES.SYNC_INTERVAL_HOURS;
        } catch {
            return true;
        }
    }

    static async syncRatesInBackground(): Promise<void> {
        if (!this.shouldSyncRates()) return;

        const baseCurrency = this.getBaseCurrency();
        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.rates) {
                    const rates = data.rates;
                    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(rates));
                    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.RATES_LAST_SYNC, Date.now().toString());
                    console.log(`Exchange rates for ${baseCurrency} updated successfully`);
                }
            }
        } catch (error) {
            console.error("Error syncing exchange rates", error);
        }
    }

    static convert(amount: number, fromCurrency: string, toCurrency: string): number {
        if (!amount || isNaN(amount)) return 0;
        if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;

        // Defensive check: sometimes "12" or other numbers might leak as currency codes
        if (typeof fromCurrency !== 'string' || typeof toCurrency !== 'string') {
            console.error(`Invalid currency types: from=${typeof fromCurrency}(${fromCurrency}), to=${typeof toCurrency}(${toCurrency})`);
            return amount;
        }

        const from = fromCurrency.toUpperCase();
        const to = toCurrency.toUpperCase();
        const base = this.getBaseCurrency();

        const rates = this.getCachedRates() || { [base]: 1 };

        const rateFrom = rates[from] || (from === base ? 1 : null);
        const rateTo = rates[to] || (to === base ? 1 : null);

        if (!rateFrom || !rateTo) {
            // Enhanced logging to catch the "12" or "100" mystery
            if (typeof fromCurrency === 'string' && fromCurrency.length > 5) {
                // If it's a long string, it might be a date or error message leaking into currency field
                console.warn(`Suspicious currency code: "${fromCurrency}". Check data mapping.`);
            } else {
                console.warn(`Missing rate for ${from} or ${to} relative to ${base}. (amount: ${amount}, from: ${fromCurrency}, to: ${toCurrency})`);
            }
            
            // If conversion fails, return original amount instead of 0 to avoid "disappearing" data
            return amount;
        }

        const amountInBase = amount / rateFrom;
        return amountInBase * rateTo;
    }
}
