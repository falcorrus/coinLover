import {
  Wallet, CreditCard, PiggyBank, Utensils, Bus, Coffee, Home,
  PlaySquare, ShoppingBag, HeartPulse, MoreHorizontal, Briefcase,
  Gift, TrendingUp, Laptop, Baby, Activity, Bitcoin,
  DollarSign, Euro, RussianRuble, Coins, Banknote, List, Calendar
} from "lucide-react";
import React from "react";
import { Account, Category, IncomeSource } from "../types";

export const GOOGLE_SCRIPT_URL = "/api/sheets";

export const IconMap: Record<string, React.FC<{ size?: number; color?: string; className?: string; fill?: string }>> = {
  wallet: Wallet, card: CreditCard, savings: PiggyBank,
  food: Utensils, transit: Bus, cafe: Coffee,
  rent: Home, subs: PlaySquare, shop: ShoppingBag,
  health: HeartPulse, more: MoreHorizontal, business: Briefcase,
  gift: Gift, trendingUp: TrendingUp, laptop: Laptop,
  baby: Baby, activity: Activity, bitcoin: Bitcoin,
  usd: DollarSign, eur: Euro, rub: RussianRuble, brl: Coins, ars: Banknote,
  list: List, calendar: Calendar
};

export const COLORS = ["#6d5dfc", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4"];
export const ACCOUNT_ICONS = ["wallet", "card", "savings", "business", "laptop", "bitcoin", "usd", "eur", "rub", "brl", "ars"];
export const INCOME_ICONS = ["business", "laptop", "gift", "trendingUp", "activity", "wallet"];

/** Default initial accounts — used only if localStorage is empty */
export const INITIAL_ACCOUNTS: Account[] = [
  { id: "acc-1", name: "Основная карта", balance: 2450, currency: "USD", color: "#6d5dfc", icon: "card" },
  { id: "acc-2", name: "Наличные", balance: 320, currency: "RUB", color: "#10b981", icon: "wallet" },
  { id: "acc-3", name: "Сбережения", balance: 10500, currency: "BRL", color: "#8b5cf6", icon: "savings" },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-home", name: "Жилье", color: "#f43f5e", icon: "rent", tags: ["Аренда", "Коммуналка", "Интернет", "Связь", "Быт", "Ремонт"] },
  { id: "cat-food", name: "Еда", color: "#f59e0b", icon: "food", tags: ["Продукты", "Кафе", "Доставка", "Алкоголь"] },
  { id: "cat-transport", name: "Транспорт", color: "#3b82f6", icon: "transit", tags: ["Бензин", "Такси", "Парковка", "ТО", "Страховка", "Общественный"] },
  { id: "cat-kids", name: "Дети", color: "#fbbf24", icon: "baby", tags: ["Даня", "Миша", "Юра", "Максим"] },
  { id: "cat-health", name: "Здоровье", color: "#10b981", icon: "health", tags: ["Аптека", "Врачи", "Анализы", "Стоматолог"] },
  { id: "cat-leisure", name: "Досуг", color: "#ec4899", icon: "cafe", tags: ["Развлечения", "Спорт", "Туризм", "Кино", "Рестораны", "Подарки"] },
  { id: "cat-shopping", name: "Покупки", color: "#06b6d4", icon: "shop", tags: ["Одежда", "Обувь", "Техника", "Аксессуары"] },
  { id: "cat-education", name: "Образование", color: "#6d5dfc", icon: "laptop", tags: ["Курсы", "Книги", "Подписки", "Софт"] },
  { id: "cat-invest", name: "Инвестиции", color: "#8b5cf6", icon: "activity", tags: ["Акции", "Крипта", "Комиссии", "Налоги"] },
  { id: "cat-other", name: "Прочее", color: "#64748b", icon: "more", tags: ["Разное", "Корректировка"] },
];

export const INITIAL_INCOMES: IncomeSource[] = [
  { id: "inc-1", name: "Зарплата", color: "#10b981", icon: "business", tags: [] },
  { id: "inc-2", name: "Фриланс", color: "#3b82f6", icon: "laptop", tags: [] },
  { id: "inc-3", name: "Подарки", color: "#f43f5e", icon: "gift", tags: [] },
  { id: "inc-4", name: "Дивиденды", color: "#8b5cf6", icon: "trendingUp", tags: [] },
];
