import {
  Wallet, CreditCard, PiggyBank, Utensils, Bus, Coffee, Home,
  PlaySquare, ShoppingBag, HeartPulse, MoreHorizontal, Briefcase,
  Gift, TrendingUp, Laptop, Baby, Activity, Bitcoin
} from "lucide-react";
import React from "react";

export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwKZ0MPk8EJv-EKOeXfJL7PDVMYPvuNUSt1mRFVkAHBBY7oXAc4tITgLdEkmeco537B/exec";

export const IconMap: Record<string, React.FC<any>> = {
  wallet: Wallet, card: CreditCard, savings: PiggyBank,
  food: Utensils, transit: Bus, cafe: Coffee,
  rent: Home, subs: PlaySquare, shop: ShoppingBag,
  health: HeartPulse, more: MoreHorizontal, business: Briefcase,
  gift: Gift, trendingUp: TrendingUp, laptop: Laptop,
  baby: Baby, activity: Activity, bitcoin: Bitcoin
};

export const COLORS = ["#6d5dfc", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4"];
export const ACCOUNT_ICONS = ["wallet", "card", "savings", "business", "laptop", "bitcoin"];

export const DEFAULT_CATEGORIES = [
  { id: "cat-1", name: "Магазины", color: "#f59e0b", icon: "shop", tags: ["еда", "покупки", "туризм"] },
  { id: "cat-2", name: "Жилье", color: "#f43f5e", icon: "rent", tags: ["квартира", "туризм"] },
  { id: "cat-3", name: "Развлечения", color: "#ec4899", icon: "cafe", tags: ["транспорт", "такси", "кафе", "туризм", "разовое"] },
  { id: "cat-4", name: "Дети", color: "#fbbf24", icon: "baby", tags: ["разовое", "занятия", "няня"] },
  { id: "cat-5", name: "Разное", color: "#64748b", icon: "more", tags: ["разовое", "медицина", "IT", "корр", "фондовый"] },
  { id: "cat-6", name: "Здоровье", color: "#10b981", icon: "health", tags: ["аптека", "врач"] },
  { id: "cat-7", name: "Инвестиции", color: "#06b6d4", icon: "activity", tags: ["акции", "крипта"] },
  { id: "cat-8", name: "Работа", color: "#6d5dfc", icon: "business", tags: ["софт", "обучение"] },
];

export const INITIAL_INCOMES = [
  { id: "inc-1", name: "Salary", color: "#10b981", icon: "business" },
  { id: "inc-2", name: "Freelance", color: "#3b82f6", icon: "laptop" },
  { id: "inc-3", name: "Gifts", color: "#f43f5e", icon: "gift" },
  { id: "inc-4", name: "Dividends", color: "#8b5cf6", icon: "trendingUp" },
];
