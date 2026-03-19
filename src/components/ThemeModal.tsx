import React from "react";
import { X, Check, ShoppingBag, Utensils, Car, Heart, Zap, DollarSign } from "lucide-react";
import { APP_SETTINGS } from "../constants/settings";
import { RatesService } from "../services/RatesService";

interface ThemeOption {
  id: "light" | "dark" | "midnight" | "modern";
  name: string;
  description: string;
  colors: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onSelect: (theme: "light" | "dark" | "midnight" | "modern") => void;
}

const THEMES: ThemeOption[] = [
  {
    id: "dark",
    name: "Линейная",
    description: "Классический темный интерфейс с акцентом на контент.",
    colors: ["#050505", "#6d5dfc", "rgba(255,255,255,0.1)"]
  },
  {
    id: "modern",
    name: "Modern Glow",
    description: "Безрамочный дизайн с мягким неоновым свечением.",
    colors: ["#0D1117", "#a78bfa", "transparent"]
  },
  {
    id: "midnight",
    name: "Золотая полночь",
    description: "Глубокий синий с роскошным золотым акцентом.",
    colors: ["#0B0E14", "#F59E0B", "rgba(245,158,11,0.1)"]
  },
  {
    id: "light",
    name: "Светлая",
    description: "Чистый и легкий интерфейс для дневного времени.",
    colors: ["#FFFFFF", "#3b82f6", "#f1f3f5"]
  }
];

const PREVIEW_CATEGORIES = [
  { icon: ShoppingBag, color: "#a78bfa", name: "Shop" },
  { icon: Utensils, color: "#fb923c", name: "Food" },
  { icon: Car, color: "#38bdf8", name: "Car" },
  { icon: Heart, color: "#f43f5e", name: "Health" },
  { icon: Zap, color: "#fbbf24", name: "Bills" },
];

const POPULAR_CURRENCIES = ["USD", "EUR", "GBP"];

export const ThemeModal: React.FC<Props> = ({ isOpen, onClose, currentTheme, onSelect }) => {
  if (!isOpen) return null;

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY, e.target.value);
    RatesService.syncRatesInBackground();
    // Simply reload to apply globally for now
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[var(--bg-color)] border-t border-[var(--glass-border)] rounded-t-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-500">
        <div className="p-6 flex justify-between items-center shrink-0 border-b border-[var(--glass-border)]/50">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Настройки</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Внешний вид и валюта</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[var(--glass-item-bg)] flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-4 flex flex-col gap-6 pb-12">
          
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-2">Базовая валюта</h3>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <DollarSign size={18} />
              </div>
              <select 
                value={RatesService.getBaseCurrency()}
                onChange={handleCurrencyChange}
                className="w-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl py-4 pl-12 pr-4 appearance-none outline-none text-[var(--text-main)] font-black tracking-wider shadow-sm"
              >
                {POPULAR_CURRENCIES.map(c => (
                  <option key={c} value={c} className="bg-[var(--bg-color)] text-[var(--text-main)]">{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-2">Оформление</h3>
            <div className="flex flex-col gap-4">
              {THEMES.map((theme) => {
                const isActive = currentTheme === theme.id;
                
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onSelect(theme.id);
                      if (navigator.vibrate) navigator.vibrate(20);
                    }}
                    className={`group relative flex flex-col gap-3 p-4 rounded-2xl transition-all duration-300 border ${
                      isActive 
                        ? "bg-[var(--glass-item-active)] border-[var(--primary-color)] shadow-[0_0_20px_rgba(109,93,252,0.1)]" 
                        : "bg-[var(--glass-item-bg)] border-[var(--glass-border)] hover:border-[var(--glass-border-highlight)]"
                    }`}
                    style={{
                      backgroundColor: theme.id === 'light' ? '#f8f9fa' : (theme.id === 'modern' ? '#0D1117' : (theme.id === 'midnight' ? '#0B0E14' : '#0a0a0a'))
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-left">
                        <h3 className={`font-black uppercase tracking-wider text-sm ${isActive ? 'text-[var(--primary-color)]' : 'text-slate-200'}`}>
                          {theme.name}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 max-w-[200px] leading-tight">
                          {theme.description}
                        </p>
                      </div>
                      {isActive && (
                        <div className="w-6 h-6 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center px-2 py-3 rounded-xl bg-black/20">
                      {PREVIEW_CATEGORIES.map((cat, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <div 
                            className={`flex items-center justify-center transition-all duration-500 ${
                              theme.id === 'modern' 
                                ? "w-8 h-8 rounded-none bg-transparent" 
                                : "w-10 h-10 rounded-xl border border-white/5 bg-white/5 shadow-lg"
                            }`}
                            style={{
                              filter: theme.id === 'modern' ? `drop-shadow(0 0 6px ${cat.color}80)` : 'none'
                            }}
                          >
                            <cat.icon 
                              size={theme.id === 'modern' ? 22 : 18} 
                              color={cat.color} 
                              strokeWidth={theme.id === 'modern' ? 2.5 : 2}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
