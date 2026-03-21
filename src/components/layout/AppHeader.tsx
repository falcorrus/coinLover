import * as React from "react";
import { Plus, Menu, RefreshCcw, List, Calendar, PieChart, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { APP_SETTINGS } from "../../constants/settings";
import { HistoryModalState } from "../../types";

interface AppHeaderProps {
  isIncomeCollapsed: boolean;
  toggleIncome: () => void;
  isDemo: boolean;
  settingsLongPress: any;
  handleMenuClick: () => void;
  isSettingsMenuOpen: boolean;
  setIsSettingsMenuOpen: (val: boolean) => void;
  pullSettings: () => void;
  setHistoryModal: (val: HistoryModalState) => void;
  setCalendarAnalyticsModal: (val: { isOpen: boolean }) => void;
  setAnalyticsModal: (val: { isOpen: boolean; type: "expense" | "income" }) => void;
  setIsThemeModalOpen: (val: boolean) => void;
  syncStatus: string;
  pillMode: "expense" | "income" | "balance";
  setPillMode: React.Dispatch<React.SetStateAction<"expense" | "income" | "balance">>;
  currentSymbol: string;
  displaySpent: number;
  displayEarned: number;
  displayBalance: number;
}

export function AppHeader({
  isIncomeCollapsed, toggleIncome, isDemo, settingsLongPress, handleMenuClick, isSettingsMenuOpen,
  setIsSettingsMenuOpen, pullSettings, setHistoryModal, setCalendarAnalyticsModal, setAnalyticsModal,
  setIsThemeModalOpen, syncStatus, pillMode, setPillMode, currentSymbol, displaySpent, displayEarned, displayBalance
}: AppHeaderProps) {
  return (
    <header className="px-6 py-8 flex flex-col gap-2 text-center shrink-0">
      <div className="flex justify-between items-center mb-2">
        <button onClick={toggleIncome} className="glass-icon-btn w-10 h-10 relative">
          <Plus size={APP_SETTINGS.UI.ICON_SIZE_LARGE} className={`text-[#10b981] transition-transform duration-300 ${!isIncomeCollapsed ? "rotate-45" : ""}`} />
          {isDemo && <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Demo</span>}
        </button>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Balance</p>
        <div className="relative">
          <button {...settingsLongPress} onClick={handleMenuClick} className="glass-icon-btn w-10 h-10 text-slate-500"><Menu size={APP_SETTINGS.UI.ICON_SIZE_LARGE} className={`transition-transform duration-300 ${isSettingsMenuOpen ? "rotate-90" : ""}`} /></button>
          {isSettingsMenuOpen && (
            <>
              <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" onClick={() => setIsSettingsMenuOpen(false)} />
              <div className="absolute top-12 right-0 w-48 bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-2xl shadow-2xl flex flex-col z-[201] p-2 animate-in fade-in zoom-in-95 origin-top-right">
                <button onClick={() => { setIsSettingsMenuOpen(false); setIsThemeModalOpen(true); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left border-b border-[var(--glass-border)]/50 mb-1 rounded-b-none">
                  <Sparkles size={16} className="text-amber-400" />
                  <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Оформление</span>
                </button>
                <button onClick={() => { setIsSettingsMenuOpen(false); pullSettings(); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><RefreshCcw size={16} className={`text-amber-500 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} /><span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Обновить</span></button>
                <button onClick={() => { setIsSettingsMenuOpen(false); setHistoryModal({ isOpen: true, entity: { name: "Лента", icon: "list" }, type: "feed" }); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><List size={16} className="text-[var(--primary-color)]" /><span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Лента</span></button>
                <button onClick={() => { setIsSettingsMenuOpen(false); setCalendarAnalyticsModal({ isOpen: true }); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><Calendar size={16} className="text-emerald-500" /><span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Календарь</span></button>
                <button onClick={() => { setIsSettingsMenuOpen(false); setAnalyticsModal({ isOpen: true, type: "expense" }); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><PieChart size={16} className="text-amber-500" /><span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Аналитика</span></button>
              </div>
            </>
          )}
        </div>
      </div>
      <button onClick={() => setPillMode(p => p === "expense" ? "income" : p === "income" ? "balance" : "expense")} className="mt-2 mx-auto px-5 py-2 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center gap-2 hover:bg-[var(--glass-item-active)] active:scale-95 transition-all shadow-sm">
        {pillMode === "expense" ? (<><TrendingDown size={14} className="text-[#cda434]" /><span className="text-xs font-bold text-[#cda434]">-{currentSymbol} {displaySpent.toLocaleString()} в этом месяце</span></>) : pillMode === "income" ? (<><TrendingUp size={14} className="text-[#10b981]" /><span className="text-xs font-bold text-[#10b981]">+{currentSymbol} {displayEarned.toLocaleString()} в этом месяце</span></>) : (<><Wallet size={14} className="text-[var(--primary-color)]" /><span className="text-xs font-bold text-[var(--primary-color)]">Общий баланс: {currentSymbol} {displayBalance.toLocaleString()}</span></>)}
      </button>
    </header>
  );
}
