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

    static clearMemoryCache(): void {
        this.memoryRates = null;
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES);
        localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.RATES_LAST_SYNC);
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
        
        const from = String(fromCurrency || "").trim().toUpperCase();
        const to = String(toCurrency || "").trim().toUpperCase();
        
        if (!from || !to) {
            console.warn("Conversion failed: Missing currency code.");
            return 0;
        }
        
        if (from === to) return amount;

        const base = this.getBaseCurrency();
        const rates = this.getCachedRates();
        
        if (!rates) {
            console.warn("Exchange rates not found. Conversion deferred.");
            this.syncRatesInBackground(); // Trigger fetch if missing
            return 0; 
        }

        const rateFrom = rates[from] ?? (from === base ? 1 : null);
        const rateTo = rates[to] ?? (to === base ? 1 : null);

        if (rateFrom === null || rateTo === null) {
            console.warn(`Missing rate for ${from} or ${to}. Base: ${base}`);
            return 0;
        }

        return (amount / rateFrom) * rateTo;
    }
}
