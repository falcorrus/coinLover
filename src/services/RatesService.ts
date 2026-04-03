import { APP_SETTINGS } from "../constants/settings";

export class RatesService {
    private static memoryRates: Record<string, number> | null = null;

    static getCachedRates(): Record<string, number> | null {
        // 1. Try memory cache first (instant)
        if (this.memoryRates) return this.memoryRates;

        // 2. Try localStorage
        const cached = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES);
        if (!cached) return null;

        try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                this.memoryRates = parsed; // Save to memory for next time
                return this.memoryRates;
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
        if (!this.shouldSyncRates() && this.memoryRates) return;

        const baseCurrency = this.getBaseCurrency();
        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.rates) {
                    const rates = data.rates;
                    this.memoryRates = rates; // Update memory cache
                    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(rates));
                    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.RATES_LAST_SYNC, Date.now().toString());
                    console.log(`Exchange rates for ${baseCurrency} updated successfully`);
                }
            }
        } catch (error) {
            console.error("Error syncing exchange rates", error);
        }
    }

    static async ensureRates(): Promise<void> {
        const cached = this.getCachedRates();
        if (!cached || this.shouldSyncRates()) {
            await this.syncRatesInBackground();
        }
    }

    static convert(amount: number, fromCurrency: string, toCurrency: string): number {
        if (!amount || isNaN(amount)) return 0;
        if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;

        const from = String(fromCurrency).toUpperCase();
        const to = String(toCurrency).toUpperCase();
        const base = this.getBaseCurrency();

        const rates = this.getCachedRates();
        
        // CRITICAL FIX: If rates are missing, return 0 instead of 'amount'.
        // Returning 'amount' causes 100 RUB to look like 100 USD (a 100x error).
        // Returning 0 is safe because the UI will show 0 while loading.
        if (!rates) {
            console.warn("Exchange rates not found. Conversion deferred.");
            return 0; 
        }

        const rateFrom = rates[from] ?? (from === base ? 1 : null);
        const rateTo = rates[to] ?? (to === base ? 1 : null);

        if (rateFrom === null || rateTo === null) {
            // If one of the currencies is unknown, returning 0 is safer than raw amount
            console.warn(`Missing rate for ${from} or ${to}.`);
            return 0;
        }

        return (amount / rateFrom) * rateTo;
    }
}
