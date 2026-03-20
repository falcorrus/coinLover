// CoinLover - Modern Personal Finance App
import * as React from "react";
import {
  DndContext, DragOverlay, rectIntersection, PointerSensor, useSensor, useSensors,
  DragStartEvent, DragMoveEvent, DragOverEvent, DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  Plus, TrendingDown, ChevronRight, TrendingUp, Wallet, RefreshCcw,
  Heart, PieChart, List, Moon, Sun, Sparkles, Menu, Calendar, Database,
  ArrowRightLeft, DollarSign
} from "lucide-react";

// Modules
import { Account, IncomeSource, Category, NumpadData, DragItemType, HistoryModalState } from "./types";
import { IconMap } from "./constants";
import { APP_SETTINGS } from "./constants/settings";
import { useFinance } from "./hooks/useFinance";
import { RatesService } from "./services/RatesService";
import { useAppDnD } from "./hooks/useAppDnD";
import { useUsers } from "./hooks/useUsers";
import { useLongPress } from "./hooks/useLongPress";
import { AccountItem } from "./components/AccountItem";
import { CategoryItem } from "./components/CategoryItem";
import { DraggableIncomeItem } from "./components/DraggableIncomeItem";
import { ModalManager } from "./components/ModalManager";
import { LandingPage } from "./components/LandingPage";
import { OnboardingModal } from "./components/OnboardingModal";
import { INITIAL_ACCOUNTS, DEFAULT_CATEGORIES, INITIAL_INCOMES } from "./constants";

import { googleSheetsService } from "./services/googleSheets";
import { setGAUser, trackScreen, trackEvent } from "./services/analytics";

export default function App() {
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

  // Users & Multi-table logic
  const { activeTableId, switchTable } = useUsers();

  const {
    accounts, setAccounts, categories, setCategories, incomes, setIncomes,
    transactions, setTransactions, syncStatus, users, addTransaction, updateTransaction, deleteTransaction, saveAccount, deleteAccount,
    saveCategory, deleteCategory, saveIncome, deleteIncome, syncCategories, syncIncomes, syncAccountsOrder,
    pullSettings, checkConflicts, conflictData, setConflictData, updateLocalFromRemote, pushSettings
  } = useFinance(activeTableId);

  const [isSplashVisible, setIsSplashVisible] = React.useState(true);
  const [isOnboarding, setIsOnboarding] = React.useState(false);

  React.useEffect(() => {
    if (syncStatus === "success") {
      const isCompletelyEmpty = accounts.length === 0;

      if (isCompletelyEmpty) {
        // DB is literally empty (only headers exist), MUST show onboarding
        localStorage.removeItem("cl_onboarding_completed");
        setIsOnboarding(true);
      } else {
        // If we have data, we are onboarded.
        localStorage.setItem("cl_onboarding_completed", "true");
        setIsOnboarding(false);
      }
    }
  }, [syncStatus, accounts.length]);

  const handleOnboardingComplete = async (currency: string, localCurrency: string, useTemplate: boolean) => {
    localStorage.setItem("cl_onboarding_completed", "true");
    setIsOnboarding(false);
    
    let newAccounts = [];
    let newCategories = [];
    let newIncomes = [];

    if (useTemplate) {
      const tmpl = await googleSheetsService.fetchTemplate();
      if (tmpl && tmpl.accounts && tmpl.accounts.length > 0) {
        newAccounts = tmpl.accounts;
        newCategories = tmpl.categories || [];
        newIncomes = tmpl.incomes || [];
      } else {
        // Fallback
        newAccounts = accounts.length > 0 ? [...accounts] : [...INITIAL_ACCOUNTS];
        newCategories = [...DEFAULT_CATEGORIES];
        newIncomes = [...INITIAL_INCOMES];
      }
    } else {
      newAccounts = [
        { id: `acc-${Date.now()}`, name: "Наличные", balance: 0, currency: localCurrency, color: "#10b981", icon: "wallet" }
      ];
      newCategories = [];
      newIncomes = [];
    }

    // Set the first account to the chosen local currency
    if (newAccounts.length > 0) newAccounts[0].currency = localCurrency;
    
    setAccounts(newAccounts);
    setCategories(newCategories);
    setIncomes(newIncomes);
    await pushSettings(newAccounts, newCategories, newIncomes);
  };
  const [mode, setMode] = React.useState<"expense" | "income">("expense");
  const [pillMode, setPillMode] = React.useState<"expense" | "income" | "balance">(() => {
    const saved = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.PILL_MODE);
    return (saved as "expense" | "income" | "balance") || "expense";
  });

  React.useEffect(() => {
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.PILL_MODE, pillMode);
  }, [pillMode]);

  const [isIncomeCollapsed, setIsIncomeCollapsed] = React.useState(true);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark" | "midnight" | "modern">(() => (localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.THEME) as "light" | "dark" | "midnight" | "modern") || "dark");
  const [editingTxId, setEditingTxId] = React.useState<string | null>(null);

  // Modal States
  const [accountModal, setAccountModal] = React.useState<{ isOpen: boolean; account: Account | null }>({ isOpen: false, account: null });
  const [incomeModal, setIncomeModal] = React.useState<{ isOpen: boolean; income: IncomeSource | null }>({ isOpen: false, income: null });
  const [categoryModal, setCategoryModal] = React.useState<{ isOpen: boolean; category: Category | null }>({ isOpen: false, category: null });
  const [historyModal, setHistoryModal] = React.useState<HistoryModalState>({ isOpen: false, entity: null, type: null });
  const [analyticsModal, setAnalyticsModal] = React.useState<{ isOpen: boolean; type: "expense" | "income" }>({ isOpen: false, type: "expense" });
  const [calendarAnalyticsModal, setCalendarAnalyticsModal] = React.useState({ isOpen: false });
  const [confirmDelete, setConfirmDelete] = React.useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = React.useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = React.useState(false);
  
  const [categoryCurrencyMode, setCategoryCurrencyMode] = React.useState<"base" | "local">(() => {
    const saved = localStorage.getItem("cl_category_currency_mode");
    if (saved === "usd") return "base"; // Migration
    return (saved as "base" | "local") || "base";
  });

  React.useEffect(() => {
    localStorage.setItem("cl_category_currency_mode", categoryCurrencyMode);
  }, [categoryCurrencyMode]);

  const [numpad, setNumpad] = React.useState<NumpadData>({
    isOpen: false, type: "expense", source: null, destination: null,
    sourceAmount: "0", sourceCurrency: "USD", targetAmount: "0", targetCurrency: "USD", targetLinked: true, activeField: "source", tag: null, comment: ""
  });

  const settingsLongPress = useLongPress(() => {
    setIsSettingsMenuOpen(false);
    setIsUsersModalOpen(true);
    if (navigator.vibrate) navigator.vibrate(APP_SETTINGS.HAPTIC_FEEDBACK_DURATION_MEDIUM);
  }, 3000);

  const handleMenuClick = () => {
    setIsSettingsMenuOpen(!isSettingsMenuOpen);
  };

  const handleSwitchTable = (id: string) => {
    setAccounts([]);
    setCategories([]);
    setIncomes([]);
    setTransactions([]);
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.ACCOUNTS);
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.INCOMES);
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
    
    switchTable(id);
    trackEvent("User", "SwitchTable", id);
    setIsUsersModalOpen(false);
    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 100);
  };

  // DnD Logic
  const {
    activeDragId, activeDragType, isSortingMode, setIsSortingMode, overId,
    handleDragStart, handleDragMove, handleDragOver, handleDragEnd
  } = useAppDnD({
    accounts, setAccounts, categories, setCategories, incomes, setIncomes,
    syncAccountsOrder, syncCategories, syncIncomes, setNumpad
  });

  const isDemo = window.localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false";

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSsId = params.get("ssId");
    if (urlSsId && urlSsId !== activeTableId) {
      localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
      handleSwitchTable(urlSsId);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
  }, [activeTableId]);

  React.useEffect(() => {
    RatesService.syncRatesInBackground();
    setTimeout(() => setIsSplashVisible(false), APP_SETTINGS.SPLASH_SCREEN_DURATION);
    setTimeout(() => checkConflicts(), APP_SETTINGS.CONFLICT_CHECK_DELAY);
  }, [checkConflicts]);

  React.useEffect(() => {
    document.documentElement.classList.remove("light", "midnight", "modern");
    if (theme !== "dark") document.documentElement.classList.add(theme);
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.THEME, theme);
    trackEvent("Settings", "ChangeTheme", theme);
  }, [theme]);

  const toggleIncome = () => { const next = !isIncomeCollapsed; setIsIncomeCollapsed(next); setMode(next ? "expense" : "income"); };

  const currentMonthTransactions = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions.filter(t => {
      if (!t.date) return false;
      try {
        let d: Date;
        const s = String(t.date).trim();
        d = new Date(s);
        if (isNaN(d.getTime())) d = new Date(s.replace(/-/g, '/').replace('T', ' '));
        
        if (isNaN(d.getTime()) && s.includes('/')) {
          const p = s.split('/');
          if (p.length >= 3) {
            const m = parseInt(p[0]) - 1;
            const day = parseInt(p[1]);
            const y = parseInt(p[2].split(' ')[0]);
            const year = y < 100 ? 2000 + y : y;
            d = new Date(year, m, day);
          }
        }
        
        if (isNaN(d.getTime()) && s.includes('.')) {
          const p = s.split('.');
          if (p.length >= 3) {
            const year = p[2].split(' ')[0].length === 4 ? parseInt(p[2]) : 2000 + parseInt(p[2]);
            d = new Date(year, parseInt(p[1]) - 1, parseInt(p[0]));
          }
        }
        
        return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } catch (e) { return false; }
    });
  }, [transactions]);

  const baseCurrency = RatesService.getBaseCurrency();
  
  const getSymbol = (code: string) => {
    if (!code || !isNaN(Number(code))) return "$";
    const symbols: Record<string, string> = { "USD": "$", "EUR": "€", "GBP": "£", "RUB": "₽", "RSD": "din", "BRL": "R$", "ARS": "ARS" };
    return symbols[code.toUpperCase()] || code;
  };

  const baseSymbol = getSymbol(baseCurrency);

  const totalBalanceBase = Math.round(accounts.reduce((s, a) => {
    const aCurr = (a.currency && isNaN(Number(a.currency))) ? a.currency : "USD";
    return s + RatesService.convert(a.balance, aCurr, baseCurrency);
  }, 0));
  
  const totalSpentBase = Math.round(currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "expense").reduce((s, t) => {
    const sCurr = (t.sourceCurrency && isNaN(Number(t.sourceCurrency))) ? t.sourceCurrency : "USD";
    // If our system base is USD, we can use sourceAmountUSD. Otherwise, convert sourceAmount to base.
    const val = (t.sourceAmountUSD && t.sourceAmountUSD !== 0 && baseCurrency === 'USD') 
      ? t.sourceAmountUSD 
      : RatesService.convert(t.sourceAmount || 0, sCurr, baseCurrency);
    return s + val;
  }, 0));

  const totalEarnedBase = Math.round(currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "income").reduce((s, t) => {
    const tCurr = (t.targetCurrency && isNaN(Number(t.targetCurrency))) ? t.targetCurrency : "USD";
    const val = (t.targetAmountUSD && t.targetAmountUSD !== 0 && baseCurrency === 'USD')
      ? t.targetAmountUSD
      : RatesService.convert(t.targetAmount || 0, tCurr, baseCurrency);
    return s + val;
  }, 0));

  const { displaySpent, displayEarned, displayBalance, currentSymbol, localCurrencyCode, localSymbol } = React.useMemo(() => {
    const localCur = localStorage.getItem("cl_numpad_pref_currency") || baseCurrency;
    const localSym = getSymbol(localCur);
    
    const isBase = categoryCurrencyMode === 'base';
    const spent = isBase ? totalSpentBase : Math.round(RatesService.convert(totalSpentBase, baseCurrency, localCur));
    const earned = isBase ? totalEarnedBase : Math.round(RatesService.convert(totalEarnedBase, baseCurrency, localCur));
    const balance = isBase ? totalBalanceBase : Math.round(RatesService.convert(totalBalanceBase, baseCurrency, localCur));
    const symbol = isBase ? baseSymbol : localSym;
    
    return { displaySpent: spent, displayEarned: earned, displayBalance: balance, currentSymbol: symbol, localCurrencyCode: localCur, localSymbol: localSym };
  }, [categoryCurrencyMode, totalSpentBase, totalEarnedBase, totalBalanceBase, baseCurrency, baseSymbol]);

  const allExistingTags = Array.from(new Set([
    ...categories.flatMap(c => c.tags || []),
    ...incomes.flatMap(i => i.tags || [])
  ])).sort();

  const anyModalOpen = accountModal.isOpen || incomeModal.isOpen || categoryModal.isOpen || historyModal.isOpen || analyticsModal.isOpen || calendarAnalyticsModal.isOpen || numpad.isOpen || confirmDelete.isOpen || isSettingsMenuOpen || isTagModalOpen || !!conflictData;

  React.useEffect(() => {
    if (activeTableId) {
      setGAUser(activeTableId);
    }
  }, [activeTableId]);

  React.useEffect(() => {
    if (accountModal.isOpen) trackScreen("AccountModal");
  }, [accountModal.isOpen]);

  React.useEffect(() => {
    if (incomeModal.isOpen) trackScreen("IncomeModal");
  }, [incomeModal.isOpen]);

  React.useEffect(() => {
    if (categoryModal.isOpen) trackScreen("CategoryModal");
  }, [categoryModal.isOpen]);

  React.useEffect(() => {
    if (historyModal.isOpen) trackScreen(`HistoryModal_${historyModal.type}`);
  }, [historyModal.isOpen, historyModal.type]);

  React.useEffect(() => {
    if (analyticsModal.isOpen) trackScreen(`AnalyticsModal_${analyticsModal.type}`);
  }, [analyticsModal.isOpen, analyticsModal.type]);

  React.useEffect(() => {
    if (calendarAnalyticsModal.isOpen) trackScreen("CalendarAnalyticsModal");
  }, [calendarAnalyticsModal.isOpen]);

  React.useEffect(() => {
    if (numpad.isOpen) trackScreen(`Numpad_${numpad.type}`);
  }, [numpad.isOpen, numpad.type]);

  React.useEffect(() => {
    if (isTagModalOpen) trackScreen("TagModal");
  }, [isTagModalOpen]);

  React.useEffect(() => {
    if (isUsersModalOpen) trackScreen("UsersModal");
  }, [isUsersModalOpen]);

  React.useEffect(() => {
    if (isThemeModalOpen) trackScreen("ThemeModal");
  }, [isThemeModalOpen]);

  React.useEffect(() => {
    if (anyModalOpen) {
      window.history.pushState({ modal: true }, "");
    }
    const handlePopState = () => { if (anyModalOpen) closeAllModals(); };
    const closeAllModals = () => {
      setAccountModal(p => ({ ...p, isOpen: false }));
      setIncomeModal(p => ({ ...p, isOpen: false }));
      setCategoryModal(p => ({ ...p, isOpen: false }));
      setHistoryModal({ isOpen: false, entity: null, type: null });
      setAnalyticsModal(p => ({ ...p, isOpen: false }));
      setCalendarAnalyticsModal({ isOpen: false });
      setNumpad(p => ({ ...p, isOpen: false }));
      setConfirmDelete(p => ({ ...p, isOpen: false }));
      setIsSettingsMenuOpen(false);
      setIsTagModalOpen(false);
      setConflictData(null);
      setEditingTxId(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [anyModalOpen]);

  const activeItemData = activeDragId ? (activeDragType === 'account' ? accounts.find(a => a.id === activeDragId) : activeDragType === 'category' ? categories.find(c => c.id === activeDragId) : incomes.find(i => i.id === activeDragId)) : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: APP_SETTINGS.DND_ACTIVATION_DISTANCE } }));

  if (currentPath === "/landing") return <LandingPage />;

  return (
    <DndContext 
      sensors={sensors} collisionDetection={rectIntersection} 
      onDragStart={handleDragStart} onDragMove={handleDragMove} onDragOver={handleDragOver} onDragEnd={handleDragEnd}
    >
      <div className={`min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden bg-[var(--bg-color)] text-[var(--text-main)] font-sans select-none transition-colors duration-300 ${theme}`}>
        <style>{`body { overflow: hidden; overscroll-behavior: none; background: var(--bg-color); } * { -webkit-tap-highlight-color: transparent; }`}</style>
        
        {isSplashVisible && (
          <div className="fixed inset-0 z-[1000] bg-[var(--bg-color)] flex items-center justify-center animate-in fade-in duration-500">
            <div className="relative animate-pulse flex flex-col items-center gap-6">
              <div className="relative w-32 h-32 rounded-[48px] bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 flex items-center justify-center border-4 border-amber-200/20 shadow-2xl">
                <Heart size={APP_SETTINGS.UI.ICON_SIZE_SPLASH} fill="white" className="text-white drop-shadow-lg" />
              </div>
              <span className="text-amber-500 font-black tracking-[0.4em] uppercase text-sm">CoinLover</span>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-50"><div className={`w-2 h-2 rounded-full ${syncStatus === "loading" ? "bg-amber-400 animate-pulse" : syncStatus === "success" ? "bg-emerald-500/50" : syncStatus === "error" ? "bg-rose-500" : "bg-white/10"}`} /></div>

        <div className="flex-1 flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
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

          <section className={`px-0 overflow-hidden transition-all duration-500 shrink-0 ${isIncomeCollapsed ? "max-h-0 opacity-0" : "max-h-[160px] opacity-100 py-1"}`}>
            <div className="px-6 py-2 flex justify-between items-center"><div onClick={toggleIncome} className="flex items-center gap-2 cursor-pointer group"><ChevronRight size={APP_SETTINGS.UI.ICON_SIZE_SMALL} className="text-slate-500 rotate-90" /><h2 className="text-[10px] font-black text-slate-500 uppercase group-hover:text-white">Доходы</h2></div><div className="flex items-center gap-3"><button onClick={() => setAnalyticsModal({ isOpen: true, type: "income" })} className="w-8 h-8 rounded-xl bg-[var(--success-color)]/10 border border-[var(--success-color)]/20 text-[var(--success-color)] flex items-center justify-center hover:bg-[var(--success-color)]/20 transition-all shadow-sm"><PieChart size={14} /></button><button onClick={() => setIncomeModal({ isOpen: true, income: null })} className="w-7 h-7 rounded-xl bg-[var(--success-color)]/10 text-[var(--success-color)] flex items-center justify-center hover:bg-[var(--success-color)]/20 transition-colors"><Plus size={14} /></button></div></div>
            <SortableContext items={incomes.map(i => i.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">
                {incomes.map(inc => {
                  const monthlyAmount = Math.round(currentMonthTransactions
                    .filter(t => String(t.type).toLowerCase() === "income" && t.targetId === inc.id)
                    .reduce((sum, t) => {
                      const val = (t.targetAmountUSD && t.targetAmountUSD !== 0 && baseCurrency === 'USD')
                        ? t.targetAmountUSD
                        : RatesService.convert(t.targetAmount || 0, t.targetCurrency || "USD", baseCurrency);
                      return sum + val;
                    }, 0));
                  return (<DraggableIncomeItem key={inc.id} income={inc} isDragging={activeDragId === inc.id} onSortingMode={() => setIsSortingMode(true)} isSortingMode={isSortingMode} onLongPress={(i) => { setIsSortingMode(false); setIncomeModal({ isOpen: true, income: i }); }} onClick={(income) => setHistoryModal({ isOpen: true, entity: income, type: "income" })} monthlyAmount={monthlyAmount} />);
                })}
              </div>
            </SortableContext>
          </section>

          <section className="px-0 py-2 relative z-20 shrink-0">
            <div className="px-6 mb-3 flex justify-between items-center"><h2 className="text-[10px] font-black text-slate-500 uppercase">Кошельки</h2><button onClick={() => setAccountModal({ isOpen: true, account: null })} className="w-8 h-8 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--text-main)] flex items-center justify-center hover:bg-[var(--glass-item-active)] transition-all shadow-sm"><Plus size={16} /></button></div>
            <SortableContext items={accounts.map(a => a.id)} strategy={horizontalListSortingStrategy}><div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">{accounts.map(acc => (<AccountItem key={acc.id} account={acc} isDragging={activeDragId === acc.id} onSortingMode={() => setIsSortingMode(true)} onLongPress={(a) => { setIsSortingMode(false); setAccountModal({ isOpen: true, account: a }); }} onClick={(account) => setHistoryModal({ isOpen: true, entity: account, type: "account" })} activeDragType={activeDragType} isSortingMode={isSortingMode} isOver={overId === acc.id} />))}</div></SortableContext>
          </section>

          <section className={`px-0 flex-1 pt-4 pb-8 overflow-y-auto hide-scrollbar z-10 relative transition-all duration-500 ${mode === "income" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}`}>
            <div className="px-6 py-2">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[10px] font-black text-slate-500 uppercase">Расходы</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setCategoryCurrencyMode(p => p === "base" ? "local" : "base"); if (navigator.vibrate) navigator.vibrate(10); }}
                    className={`w-8 h-8 rounded-xl border transition-all shadow-sm flex items-center justify-center ${
                      categoryCurrencyMode === 'base'
                        ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/30 text-[var(--primary-color)]'
                        : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] text-[var(--text-muted)]'
                    }`}
                    title={categoryCurrencyMode === "base" ? `Показать в местной валюте (${localCurrencyCode})` : `Показать в базовой валюте (${baseCurrency})`}
                  >
                    <span className="text-[10px] font-black">{categoryCurrencyMode === "base" ? "B" : "L"}</span>
                  </button>

                  <button onClick={() => setAnalyticsModal({ isOpen: true, type: "expense" })} className="w-8 h-8 rounded-xl bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 text-[var(--primary-color)] flex items-center justify-center hover:bg-[var(--primary-color)]/20 transition-all shadow-sm"><PieChart size={14} /></button>
                  <button onClick={() => setCategoryModal({ isOpen: true, category: null })} className="w-8 h-8 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--text-main)] flex items-center justify-center hover:bg-[var(--glass-item-active)] transition-all shadow-sm"><Plus size={16} /></button>
                </div>
              </div>
              <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-4">
                  {categories.map(cat => {
                    const catTx = currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "expense" && t.targetId === cat.id);
                    
                    const spentBase = Math.round(catTx.reduce((s, t) => {
                      const sCurr = (t.sourceCurrency && isNaN(Number(t.sourceCurrency))) ? t.sourceCurrency : "USD";
                      const val = (t.sourceAmountUSD && t.sourceAmountUSD !== 0 && baseCurrency === 'USD')
                        ? t.sourceAmountUSD
                        : RatesService.convert(t.sourceAmount || 0, sCurr, baseCurrency);
                      return s + val;
                    }, 0));

                    const spent = categoryCurrencyMode === 'base'
                      ? spentBase
                      : Math.round(RatesService.convert(spentBase, baseCurrency, localCurrencyCode));
                    
                    return (
                      <CategoryItem 
                        key={cat.id} 
                        category={cat} 
                        spent={spent} 
                        isDragging={activeDragId === cat.id} 
                        onSortingMode={() => setIsSortingMode(true)} 
                        isSortingMode={isSortingMode} 
                        isOver={overId === cat.id} 
                        onLongPress={(c) => { setIsSortingMode(false); setCategoryModal({ isOpen: true, category: c }); }} 
                        onClick={(category) => setHistoryModal({ isOpen: true, entity: category, type: "category" })} 
                        activeDragType={activeDragType}
                        theme={theme}
                        currencyMode={categoryCurrencyMode}
                        currencySymbol={categoryCurrencyMode === 'base' ? baseSymbol : localSymbol}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </div>
          </section>
        </div>

        <ModalManager
          accountModal={accountModal} incomeModal={incomeModal} categoryModal={categoryModal} historyModal={historyModal}
          analyticsModal={analyticsModal} calendarAnalyticsModal={calendarAnalyticsModal} confirmDelete={confirmDelete}
          numpad={numpad} isTagModalOpen={isTagModalOpen} isUsersModalOpen={isUsersModalOpen} conflictData={conflictData} editingTxId={editingTxId}
          isThemeModalOpen={isThemeModalOpen} theme={theme}
          categoryCurrencyMode={categoryCurrencyMode} localCurrencyCode={localCurrencyCode}
          accounts={accounts} categories={categories} incomes={incomes} transactions={transactions} allExistingTags={allExistingTags}
          users={users} activeTableId={activeTableId}
          setAccountModal={setAccountModal} setIncomeModal={setIncomeModal} setCategoryModal={setCategoryModal} setHistoryModal={setHistoryModal}
          setAnalyticsModal={setAnalyticsModal} setCalendarAnalyticsModal={setCalendarAnalyticsModal} setConfirmDelete={setConfirmDelete}
          setNumpad={setNumpad} setIsTagModalOpen={setIsTagModalOpen} setIsUsersModalOpen={setIsUsersModalOpen} setEditingTxId={setEditingTxId} setConflictData={setConflictData}
          setIsThemeModalOpen={setIsThemeModalOpen} setTheme={setTheme}
          addTransaction={addTransaction} updateTransaction={updateTransaction} deleteTransaction={deleteTransaction}
          saveAccount={saveAccount} deleteAccount={deleteAccount} saveCategory={saveCategory} deleteCategory={deleteCategory}
          saveIncome={saveIncome} deleteIncome={deleteIncome} updateLocalFromRemote={updateLocalFromRemote}
          onSwitchTable={handleSwitchTable}
        />
        
        <OnboardingModal isOpen={isOnboarding} onComplete={handleOnboardingComplete} />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragId && activeItemData ? (
          <div className={`draggable-coin grabbed-elevation pointer-events-none ${activeDragType === 'category' ? 'coin-category' : 'coin-wallet'}`}>
            {React.createElement(IconMap[activeItemData.icon] || Wallet, { size: APP_SETTINGS.UI.ICON_SIZE_OVERLAY, color: activeItemData.color })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
