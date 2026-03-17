import { APP_SETTINGS } from "../constants/settings";

export class RatesService {
    static getCachedRates(): Record<string, number> | null {
        const cached = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES);
        if (!cached) return { USD: 1 };

        try {
            return JSON.parse(cached);
        } catch {
            return { USD: 1 };
        }
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

        try {
            const response = await fetch("https://open.er-api.com/v6/latest/USD");
            if (response.ok) {
                const data = await response.json();
                if (data && data.rates) {
                    const rates = data.rates;
                    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(rates));
                    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.RATES_LAST_SYNC, Date.now().toString());
                    console.log("Exchange rates updated successfully");
                }
            }
        } catch (error) {
            console.error("Error syncing exchange rates", error);
        }
    }

    static convert(amount: number, fromCurrency: string, toCurrency: string): number {
        if (!amount || isNaN(amount)) return 0;
        if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;

        const from = fromCurrency.toUpperCase();
        const to = toCurrency.toUpperCase();

        const rates: Record<string, number> = this.getCachedRates() || { USD: 1 };

        const rateFrom = rates[from] || (from === "USD" ? 1 : null);
        const rateTo = rates[to] || (to === "USD" ? 1 : null);

        if (!rateFrom || !rateTo) {
            console.warn(`Missing rate for ${from} or ${to}. Conversion failed.`);
            if (to === "USD") return 0;
            return amount;
        }

        const amountInUsd = amount / rateFrom;
        return amountInUsd * rateTo;
    }
}
