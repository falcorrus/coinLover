export class RatesService {
    private static STORAGE_KEY = 'cl_exchange_rates';
    private static LAST_SYNC_KEY = 'cl_rates_last_sync';

    static getCachedRates(): Record<string, number> | null {
        const cached = localStorage.getItem(this.STORAGE_KEY);
        if (!cached) return { USD: 1 };

        try {
            return JSON.parse(cached);
        } catch {
            return { USD: 1 };
        }
    }

    static shouldSyncRates(): boolean {
        const lastSync = localStorage.getItem(this.LAST_SYNC_KEY);
        if (!lastSync) return true;

        try {
            const syncDate = new Date(parseInt(lastSync, 10));
            const now = new Date();
            const hoursSinceSync = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60);
            
            // Синхронизируем если прошло больше 6 часов
            return hoursSinceSync > 6;
        } catch {
            return true;
        }
    }

    static async syncRatesInBackground(): Promise<void> {
        if (!this.shouldSyncRates()) return;

        try {
            // Используем надежный и бесплатный API для всех валют сразу
            const response = await fetch("https://open.er-api.com/v6/latest/USD");
            if (response.ok) {
                const data = await response.json();
                if (data && data.rates) {
                    const rates = data.rates;
                    
                    // Сохраняем только те курсы, которые нам интересны для компактности, 
                    // либо весь объект (он небольшой)
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rates));
                    localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());
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

        const rates = this.getCachedRates() || { USD: 1 };

        const rateFrom = rates[from] || (from === "USD" ? 1 : null);
        const rateTo = rates[to] || (to === "USD" ? 1 : null);

        // Если курса нет, мы не можем вернуть 1 к 1, это сломает аналитику.
        // Возвращаем примерный масштаб или 0, чтобы пользователь заметил ошибку.
        if (!rateFrom || !rateTo) {
            console.warn(`Missing rate for ${from} or ${to}. Conversion failed.`);
            // Если мы переводим в USD и нет курса, возвращаем 0
            if (to === "USD") return 0;
            return amount;
        }

        // Переводим в USD (база), затем в целевую валюту
        const amountInUsd = amount / rateFrom;
        return amountInUsd * rateTo;
    }
}
