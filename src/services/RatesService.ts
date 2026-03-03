export class RatesService {
    private static STORAGE_KEY = 'cl_exchange_rates';
    private static LAST_SYNC_KEY = 'cl_rates_last_sync';

    // Базовая валюта — USD
    // В кэше хранятся курсы N к 1 USD
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

            // Если сегодня после 12 дня, а синхронизация была до 12 дня сегодня
            // или вообще в предыдущие дни — надо синхронизировать.
            const today12PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

            // Если текущее время больше 12:00, а последняя синхронизация была до этого момента
            if (now > today12PM && syncDate < today12PM) {
                return true;
            }

            // Если синхронизация была не сегодня
            if (syncDate.getDate() !== now.getDate() ||
                syncDate.getMonth() !== now.getMonth() ||
                syncDate.getFullYear() !== now.getFullYear()) {

                // Но если сейчас ДО 12:00, то мы не синхронизируем (согласно ТЗ "после 12 дня").
                // Но если прошло больше 24 часов, то, возможно, стоит синхронизировать.
                // Оставим строгое условие 'после 12 дня':
                if (now.getHours() >= 12) {
                    return true;
                }
            }

            return false;
        } catch {
            return true;
        }
    }

    static async syncRatesInBackground(): Promise<void> {
        if (!this.shouldSyncRates()) return;

        try {
            // Инициализируем объект курсов (USD всегда 1)
            const rates: Record<string, number> = { USD: 1 };

            // 1. Прямые запросы к Frankfurter API (BRL, EUR, GBP)
            // Можно запросить сразу несколько через запятую
            const frankfurterRes = await fetch("https://api.frankfurter.app/latest?from=USD&to=BRL,EUR,GBP");
            if (frankfurterRes.ok) {
                const data = await frankfurterRes.json();
                if (data && data.rates) {
                    if (data.rates.BRL) rates.BRL = data.rates.BRL;
                    if (data.rates.EUR) rates.EUR = data.rates.EUR;
                    if (data.rates.GBP) rates.GBP = data.rates.GBP;
                }
            }

            // 2. ARS (Criptoya & Bluelytics)
            // Пытаемся взять Bluelytics "Blue Dollar" (наиболее актуальный для наличных)
            try {
                const blRes = await fetch("https://api.bluelytics.com.ar/v2/latest");
                if (blRes.ok) {
                    const blData = await blRes.json();
                    if (blData && blData.blue && blData.blue.value_sell) {
                        rates.ARS = blData.blue.value_sell;
                    }
                }
            } catch (e) {
                // Fallback to Criptoya if bluelytics fails
                const cpRes = await fetch("https://criptoya.com/api/usdt/ars/0.1");
                if (cpRes.ok) {
                    const cpData = await cpRes.json();
                    if (cpData && cpData.belo && cpData.belo.totalBid) {
                        rates.ARS = cpData.belo.totalBid;
                    }
                }
            }

            // 3. RUB (Tinkoff) через Python Backend (предполагается, что он на порту 8000 или доступен по относительному пути)
            // Можно выставить переменную окружения, чтобы в проде был нужный URL
            try {
                const rubBaseUrl = (import.meta as any).env?.VITE_PY_BACKEND_URL || "http://localhost:8000";
                const rubRes = await fetch(`${rubBaseUrl}/api/rates/rub`);
                if (rubRes.ok) {
                    const rubData = await rubRes.json();
                    if (rubData && rubData.rate) {
                        rates.RUB = rubData.rate;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch RUB rate from python backend", e);
            }

            // Сохраняем в localStorage
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rates));
            localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());

        } catch (error) {
            console.error("Error syncing exchange rates", error);
        }
    }

    // Конвертация из валюты fromCurrency в toCurrency
    static convert(amount: number, fromCurrency: string, toCurrency: string): number {
        if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;

        // Приводим к верхнему регистру
        const from = fromCurrency.toUpperCase();
        const to = toCurrency.toUpperCase();

        const rates = this.getCachedRates() || { USD: 1 };

        // Если какой-то из валют нет в кэше, пропускаем конвертацию
        const rateFrom = rates[from] || (from === "USD" ? 1 : null);
        const rateTo = rates[to] || (to === "USD" ? 1 : null);

        if (!rateFrom || !rateTo) return amount;

        // Переводим в USD, затем в целевую валюту
        const amountInUsd = amount / rateFrom;
        return amountInUsd * rateTo;
    }
}
