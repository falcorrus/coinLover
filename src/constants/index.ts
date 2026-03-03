import {
  Wallet, CreditCard, PiggyBank, Utensils, Bus, Coffee, Home,
  PlaySquare, ShoppingBag, HeartPulse, MoreHorizontal, Briefcase,
  Gift, TrendingUp, Laptop, Baby, Activity, Bitcoin,
  DollarSign, Euro, RussianRuble, Coins, Banknote
} from "lucide-react";
import React from "react";
import { Account, Category, IncomeSource } from "../types";

export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby8YLfhf6FBR8Xm8IM8lAxu0htA4v7mmpdF-pUHOUYhHr4jSAzh4vKcRSd_W_0YYsGV/exec";

export const IconMap: Record<string, React.FC<any>> = {
  wallet: Wallet, card: CreditCard, savings: PiggyBank,
  food: Utensils, transit: Bus, cafe: Coffee,
  rent: Home, subs: PlaySquare, shop: ShoppingBag,
  health: HeartPulse, more: MoreHorizontal, business: Briefcase,
  gift: Gift, trendingUp: TrendingUp, laptop: Laptop,
  baby: Baby, activity: Activity, bitcoin: Bitcoin,
  usd: DollarSign, eur: Euro, rub: RussianRuble, brl: Coins, ars: Banknote
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
  { id: "cat-1", name: "Магазины", color: "#f59e0b", icon: "shop", tags: ["еда", "покупки", "туризм"] },
  { id: "cat-2", name: "Жилье", color: "#f43f5e", icon: "rent", tags: ["квартира", "туризм"] },
  { id: "cat-3", name: "Развлечения", color: "#ec4899", icon: "cafe", tags: ["транспорт", "такси", "кафе", "туризм", "разовое"] },
  { id: "cat-4", name: "Дети", color: "#fbbf24", icon: "baby", tags: ["разовое", "занятия", "няня"] },
  { id: "cat-5", name: "Разное", color: "#64748b", icon: "more", tags: ["разовое", "медицина", "IT", "корр", "фондовый"] },
  { id: "cat-6", name: "Здоровье", color: "#10b981", icon: "health", tags: ["аптека", "врач"] },
  { id: "cat-7", name: "Инвестиции", color: "#06b6d4", icon: "activity", tags: ["акции", "крипта"] },
  { id: "cat-8", name: "Работа", color: "#6d5dfc", icon: "business", tags: ["софт", "обучение"] },
];

export const INITIAL_INCOMES: IncomeSource[] = [
  { id: "inc-1", name: "Зарплата", color: "#10b981", icon: "business" },
  { id: "inc-2", name: "Фриланс", color: "#3b82f6", icon: "laptop" },
  { id: "inc-3", name: "Подарки", color: "#f43f5e", icon: "gift" },
  { id: "inc-4", name: "Дивиденды", color: "#8b5cf6", icon: "trendingUp" },
];
