// CoinLover - Modern Personal Finance App
import * as React from "react";
import {
  DndContext, DragOverlay, DragStartEvent, DragEndEvent, DragOverEvent, DragMoveEvent,
  closestCenter, pointerWithin, rectIntersection, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import {
  Plus, Settings, ArrowDownCircle, TrendingDown, ChevronRight, TrendingUp, Wallet, RefreshCcw,
  Heart, MousePointer2, PieChart, List, Moon, Sun, Sparkles, Menu
} from "lucide-react";

// Modules
import { Account, IncomeSource, Category, NumpadData, DragItemType, Transaction } from "./types";
import { IconMap } from "./constants";
import { useFinance } from "./hooks/useFinance";
import { RatesService } from "./services/RatesService";
import { AccountItem } from "./components/AccountItem";
import { CategoryItem } from "./components/CategoryItem";
import { Numpad } from "./components/Numpad";
import { AccountModal } from "./components/AccountModal";
import { CategoryModal } from "./components/CategoryModal";
import { DraggableIncomeItem } from "./components/DraggableIncomeItem";
import { IncomeModal } from "./components/IncomeModal";
import { HistoryModal } from "./components/HistoryModal";
import { AnalyticsModal } from "./components/AnalyticsModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { TagModal } from "./components/TagModal";

export default function App() {
  const {
    accounts, setAccounts, categories, setCategories, incomes, setIncomes,
    transactions, syncStatus, addTransaction, updateTransaction, deleteTransaction, saveAccount, deleteAccount,
    saveCategory, deleteCategory, saveIncome, deleteIncome, syncCategories, syncIncomes, syncAccountsOrder,
    pullSettings, checkConflicts, conflictData, setConflictData, updateLocalFromRemote, pushSettings
  } = useFinance();

  const [isSplashVisible, setIsSplashVisible] = React.useState(true);
  const [mode, setMode] = React.useState<"expense" | "income">("expense");
  const [pillMode, setPillMode] = React.useState<"expense" | "income" | "balance">(() => (localStorage.getItem("cl_pill_mode") as any) || "expense");

  // Persist pill mode changes
  React.useEffect(() => {
    localStorage.setItem("cl_pill_mode", pillMode);
  }, [pillMode]);
  const [isIncomeCollapsed, setIsIncomeCollapsed] = React.useState(true);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [activeDragType, setActiveDragType] = React.useState<DragItemType | null>(null);
  const [isSortingMode, setIsSortingMode] = React.useState(false);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = React.useState(false);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark" | "midnight">(() => (localStorage.getItem("coinlover_theme") as "light" | "dark" | "midnight") || "dark");
  const [editingTxId, setEditingTxId] = React.useState<string | null>(null);

  const [accountModal, setAccountModal] = React.useState<{ isOpen: boolean; account: Account | null }>({ isOpen: false, account: null });
  const [incomeModal, setIncomeModal] = React.useState<{ isOpen: boolean; income: IncomeSource | null }>({ isOpen: false, income: null });
  const [categoryModal, setCategoryModal] = React.useState<{ isOpen: boolean; category: Category | null }>({ isOpen: false, category: null });
  const [historyModal, setHistoryModal] = React.useState<{ isOpen: boolean; entity: any; type: "account" | "category" | "income" | "tag" | "feed" | null; customTransactions?: Transaction[]; }>({ isOpen: false, entity: null, type: null });
  const [analyticsModal, setAnalyticsModal] = React.useState<{ isOpen: boolean; type: "expense" | "income" }>({ isOpen: false, type: "expense" });
  const [confirmDelete, setConfirmDelete] = React.useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  const [numpad, setNumpad] = React.useState<NumpadData>({
    isOpen: false, type: "expense", source: null, destination: null,
    sourceAmount: "0", sourceCurrency: "USD", targetAmount: "0", targetCurrency: "USD", targetLinked: true, activeField: "source", tag: null, comment: ""
  });
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);

  const sortingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoClickCount = React.useRef(0);
  const demoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDemo = window.localStorage.getItem("coinlover_demo") !== "false";

  React.useEffect(() => {
    RatesService.syncRatesInBackground();
    setTimeout(() => setIsSplashVisible(false), 600);
    setTimeout(() => checkConflicts(), 1500);
  }, [checkConflicts]);

  React.useEffect(() => {
    document.documentElement.classList.remove("light", "midnight");
    if (theme !== "dark") document.documentElement.classList.add(theme);
    localStorage.setItem("coinlover_theme", theme);
  }, [theme]);

  const toggleTheme = () => { 
    setTheme(prev => prev === "light" ? "dark" : prev === "dark" ? "midnight" : "light"); 
    if (navigator.vibrate) navigator.vibrate(50); 
  };
  const toggleMode = (target: 'demo' | 'real') => {
    localStorage.removeItem("cl_accounts");
    localStorage.removeItem("cl_categories");
    localStorage.removeItem("cl_incomes");
    localStorage.removeItem("cl_transactions");
    localStorage.removeItem("cl_last_sync");
    window.localStorage.setItem("coinlover_demo", target === 'demo' ? "true" : "false");
    window.location.reload();
  };
  const handleDemoClick = () => {
    demoClickCount.current += 1;
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    if (demoClickCount.current >= 5) {
      toggleMode(isDemo ? 'real' : 'demo');
      demoClickCount.current = 0;
    } else {
      demoTimerRef.current = setTimeout(() => { demoClickCount.current = 0; }, 2000);
    }
  };

  const safeEval = (str: string): string => {
    try {
      let expr = str.replace(/,/g, '.').replace(/\s/g, '');
      expr = expr.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
      const sanitized = expr.replace(/[^-+/*0-9.()]/g, '');
      if (!sanitized) return "0";
      const result = new Function(`return ${sanitized}`)();
      return (Math.round(result * 100) / 100).toString();
    } catch { return str; }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 15 } }));
  const toggleIncome = () => { const next = !isIncomeCollapsed; setIsIncomeCollapsed(next); setMode(next ? "expense" : "income"); };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
    setActiveDragType(e.active.data.current?.type as DragItemType);
    setHasMovedDuringDrag(false);
    
    if (sortingTimerRef.current) clearTimeout(sortingTimerRef.current);
    sortingTimerRef.current = setTimeout(() => {
      setIsSortingMode(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);

    // FIX: If we just hold but don't move, we need to clear isSortingMode on pointerup
    const clearOnUp = () => {
      if (sortingTimerRef.current) clearTimeout(sortingTimerRef.current);
      // Wait a frame to see if handleDragStart finished or if handleDragEnd will fire
      requestAnimationFrame(() => {
        if (!activeDragId) setIsSortingMode(false);
      });
      window.removeEventListener('pointerup', clearOnUp);
    };
    window.addEventListener('pointerup', clearOnUp);
  };

  const handleDragMove = (e: DragMoveEvent) => {
    if (!hasMovedDuringDrag) setHasMovedDuringDrag(true);
    if (sortingTimerRef.current && !isSortingMode) {
      const { delta } = e;
      if (Math.abs(delta.x) > 30 || Math.abs(delta.y) > 30) {
        clearTimeout(sortingTimerRef.current);
        sortingTimerRef.current = null;
      }
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    setOverId(over?.id as string || null);
    if (!over || !isSortingMode || active.id === over.id) return;

    if (active.data.current?.type === "account" && over.data.current?.type === "account") {
      setAccounts((it) => arrayMove(it, it.findIndex(i => i.id === active.id), it.findIndex(i => i.id === over.id)));
    } else if (active.data.current?.type === "category" && over.data.current?.type === "category") {
      setCategories((it) => arrayMove(it, it.findIndex(i => i.id === active.id), it.findIndex(i => i.id === over.id)));
    } else if (active.data.current?.type === "income" && over.data.current?.type === "income") {
      setIncomes((it) => arrayMove(it, it.findIndex(i => i.id === active.id), it.findIndex(i => i.id === over.id)));
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (sortingTimerRef.current) clearTimeout(sortingTimerRef.current);
    const { active, over } = e;
    const sorting = isSortingMode;
    const moved = hasMovedDuringDrag;
    
    setActiveDragId(null); setActiveDragType(null); setOverId(null);
    setIsSortingMode(false);

    if (sorting && moved) {
      if (active.data.current?.type === "account") syncAccountsOrder(accounts);
      else if (active.data.current?.type === "category") syncCategories(categories);
      else if (active.data.current?.type === "income") syncIncomes(incomes);
      return;
    }

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "account") {
      if (overData?.type === "category") {
        const lastCur = localStorage.getItem("cl_last_currency") || "USD";
        setNumpad({
          isOpen: true, type: "expense", source: activeData.account, destination: overData.category,
          sourceAmount: "0", sourceCurrency: activeData.account.currency, targetAmount: "0", targetCurrency: lastCur,
          targetLinked: true, activeField: "source", tag: overData.category.tags?.[0] || null, comment: ""
        });
      } else if (overData?.type === "account" && active.id !== over.id && !sorting) {
        setNumpad({
          isOpen: true, type: "transfer", source: activeData.account, destination: overData.account,
          sourceAmount: "0", sourceCurrency: activeData.account.currency, targetAmount: "0", targetCurrency: overData.account.currency,
          targetLinked: true, activeField: "source", tag: null, comment: ""
        });
      }
    } else if (activeData?.type === "income" && overData?.type === "account") {
      const lastCur = localStorage.getItem("cl_last_currency") || "USD";
      setNumpad({
        isOpen: true, type: "income", source: activeData.income, destination: overData.account,
        sourceAmount: "0", sourceCurrency: lastCur, targetAmount: "0", targetCurrency: overData.account.currency,
        targetLinked: true, activeField: "source", tag: null, comment: ""
      });
    }
  };

  const now = new Date();
  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date.replace(/-/g, '/').replace('T', ' '));
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalBalance = Math.round(accounts.reduce((s, a) => s + RatesService.convert(a.balance, a.currency || "USD", "USD"), 0));
  const totalSpent = Math.round(currentMonthTransactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.sourceAmountUSD ?? t.amountUSD ?? t.sourceAmount ?? t.amount ?? 0), 0));
  const totalEarned = Math.round(currentMonthTransactions.filter(t => t.type === "income").reduce((s, t) => s + (t.sourceAmountUSD ?? t.amountUSD ?? t.sourceAmount ?? t.amount ?? 0), 0));

  const allExistingTags = Array.from(new Set([
    ...categories.flatMap(c => c.tags || []),
    ...incomes.flatMap(i => i.tags || [])
  ])).sort();

  const anyModalOpen = accountModal.isOpen || incomeModal.isOpen || categoryModal.isOpen || historyModal.isOpen || analyticsModal.isOpen || numpad.isOpen || confirmDelete.isOpen || isSettingsMenuOpen || isTagModalOpen || !!conflictData;

  // Handle hardware/gesture back button and Esc key
  React.useEffect(() => {
    if (anyModalOpen) {
      window.history.pushState({ modal: true }, "");
    }
    
    const handlePopState = (e: PopStateEvent) => {
      if (anyModalOpen) {
        closeAllModals();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && anyModalOpen) {
        closeAllModals();
        // Also go back in history to sync with pushState
        if (window.history.state?.modal) {
          window.history.back();
        }
      }
    };

    const closeAllModals = () => {
      setAccountModal(p => ({ ...p, isOpen: false }));
      setIncomeModal(p => ({ ...p, isOpen: false }));
      setCategoryModal(p => ({ ...p, isOpen: false }));
      setHistoryModal(p => ({ ...p, isOpen: false, entity: null, type: null }));
      setAnalyticsModal(p => ({ ...p, isOpen: false }));
      setNumpad(p => ({ ...p, isOpen: false }));
      setConfirmDelete(p => ({ ...p, isOpen: false }));
      setIsSettingsMenuOpen(false);
      setIsTagModalOpen(false);
      setConflictData(null);
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [anyModalOpen, setConflictData]);

  const activeItemData = activeDragId ? (activeDragType === 'account' ? accounts.find(a => a.id === activeDragId) : activeDragType === 'category' ? categories.find(c => c.id === activeDragId) : incomes.find(i => i.id === activeDragId)) : null;

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden bg-[var(--bg-color)] text-[var(--text-main)] font-sans select-none transition-colors duration-300 ${theme === 'light' ? 'light' : ''}`}>
      <style>{`body { overflow: hidden; overscroll-behavior: none; background: var(--bg-color); } * { -webkit-tap-highlight-color: transparent; }`}</style>
      
      {isSplashVisible && (
        <div className="fixed inset-0 z-[1000] bg-[var(--bg-color)] flex items-center justify-center animate-in fade-in duration-500">
          <div className="relative animate-pulse flex flex-col items-center gap-6">
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 flex items-center justify-center border-4 border-amber-200/20 shadow-2xl">
              <Heart size={64} fill="white" className="text-white drop-shadow-lg" />
            </div>
            <span className="text-amber-500 font-black tracking-[0.4em] uppercase text-sm">CoinLover</span>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-50"><div className={`w-2 h-2 rounded-full ${syncStatus === "loading" ? "bg-amber-400 animate-pulse" : syncStatus === "success" ? "bg-emerald-500/50" : syncStatus === "error" ? "bg-rose-500" : "bg-white/10"}`} /></div>

      <header className="px-6 py-8 flex flex-col gap-2 text-center shrink-0">
        <div className="flex justify-between items-center mb-2">
          <button onClick={toggleIncome} className="glass-icon-btn w-10 h-10 relative">
            <ArrowDownCircle size={20} className={`text-[#10b981] transition-transform duration-300 ${!isIncomeCollapsed ? "rotate-180" : ""}`} />
            {isDemo && (
              <span 
                onClick={(e) => { e.stopPropagation(); handleDemoClick(); }}
                className="absolute left-12 top-1/2 -translate-y-1/2 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase animate-pulse cursor-pointer hover:bg-amber-500/20 transition-colors"
              >
                Demo
              </span>
            )}
          </button>
          <p onClick={() => { if(!isDemo) handleDemoClick(); }} className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-default">Total Balance</p>
          <div className="relative">
            <button onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)} className="glass-icon-btn w-10 h-10 text-slate-500">
              <Menu size={20} className={`transition-transform duration-300 ${isSettingsMenuOpen ? "rotate-90" : ""}`} />
            </button>
            {isSettingsMenuOpen && (
              <>
                <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" onClick={() => setIsSettingsMenuOpen(false)} />
                <div className="absolute top-12 right-0 w-48 bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-2xl shadow-2xl flex flex-col z-[201] p-2 animate-in fade-in zoom-in-95 origin-top-right">
                  <div className="px-1 py-1 mb-1">
                    <div className="flex items-center gap-1 bg-[var(--glass-item-bg)] p-1 rounded-xl border border-[var(--glass-border)]">
                      <button 
                        onClick={() => { setTheme("light"); setIsSettingsMenuOpen(false); if (navigator.vibrate) navigator.vibrate(30); }} 
                        className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${theme === 'light' ? 'bg-white text-amber-500 shadow-sm' : 'text-slate-500 hover:text-white'}`}
                      >
                        <Sun size={16} />
                      </button>
                      <button 
                        onClick={() => { setTheme("dark"); setIsSettingsMenuOpen(false); if (navigator.vibrate) navigator.vibrate(30); }} 
                        className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-[#1e293b] text-blue-400 shadow-sm' : 'text-slate-500 hover:text-white'}`}
                      >
                        <Moon size={16} />
                      </button>
                      <button 
                        onClick={() => { setTheme("midnight"); setIsSettingsMenuOpen(false); if (navigator.vibrate) navigator.vibrate(30); }} 
                        className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${theme === 'midnight' ? 'bg-[#F59E0B]/20 text-[#F59E0B] shadow-sm' : 'text-slate-500 hover:text-white'}`}
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => { setIsSettingsMenuOpen(false); pullSettings(); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left">
                    <RefreshCcw size={16} className={`text-amber-500 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} /><span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Обновить</span>
                  </button>
                  <button onClick={() => { setIsSettingsMenuOpen(false); setHistoryModal({ isOpen: true, entity: { name: "Лента", icon: "list" }, type: "feed" }); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left">
                    <List size={16} className="text-[var(--primary-color)]" />
                    <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Лента</span>
                  </button>
                  <button onClick={() => { setIsSettingsMenuOpen(false); setAnalyticsModal({ isOpen: true, type: "expense" }); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left">
                    <PieChart size={16} className="text-amber-500" />
                    <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Аналитика</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <button 
          onClick={() => setPillMode(p => p === "expense" ? "income" : p === "income" ? "balance" : "expense")} 
          className="mt-2 mx-auto px-5 py-2 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center gap-2 hover:bg-[var(--glass-item-active)] active:scale-95 transition-all shadow-sm"
        >
          {pillMode === "expense" ? (
            <><TrendingDown size={14} className="text-[#cda434]" /><span className="text-xs font-bold text-[#cda434]">-${totalSpent.toLocaleString()} в этом месяце</span></>
          ) : pillMode === "income" ? (
            <><TrendingUp size={14} className="text-[#10b981]" /><span className="text-xs font-bold text-[#10b981]">+${totalEarned.toLocaleString()} в этом месяце</span></>
          ) : (
            <><Wallet size={14} className="text-[var(--primary-color)]" /><span className="text-xs font-bold text-[var(--primary-color)]">Общий баланс: ${totalBalance.toLocaleString()}</span></>
          )}
        </button>
      </header>

      <DndContext 
        sensors={sensors} 
        collisionDetection={rectIntersection} 
        onDragStart={handleDragStart} 
        onDragMove={handleDragMove}
        onDragOver={handleDragOver} 
        onDragEnd={handleDragEnd}
      >
        <section className={`px-0 overflow-hidden transition-all duration-500 shrink-0 ${isIncomeCollapsed ? "max-h-0 opacity-0" : "max-h-[160px] opacity-100 py-1"}`}>
          <div className="px-6 py-2 flex justify-between items-center"><div onClick={toggleIncome} className="flex items-center gap-2 cursor-pointer group"><ChevronRight size={14} className="text-slate-500 rotate-90" /><h2 className="text-[10px] font-black text-slate-500 uppercase group-hover:text-white">Доходы</h2></div><div className="flex items-center gap-3"><button onClick={() => setAnalyticsModal({ isOpen: true, type: "income" })} className="w-8 h-8 rounded-full bg-[var(--success-color)]/10 border border-[var(--success-color)]/20 text-[var(--success-color)] flex items-center justify-center hover:bg-[var(--success-color)]/20 transition-all shadow-sm"><PieChart size={14} /></button><button onClick={() => setIncomeModal({ isOpen: true, income: null })} className="w-7 h-7 rounded-full bg-[var(--success-color)]/10 text-[var(--success-color)] flex items-center justify-center hover:bg-[var(--success-color)]/20 transition-colors"><Plus size={14} /></button></div></div>
          <SortableContext items={incomes.map(i => i.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">
              {incomes.map(inc => {
                const monthlyAmount = Math.round(currentMonthTransactions
                  .filter(t => t.type === "income" && t.targetId === inc.id)
                  .reduce((sum, t) => sum + (t.sourceAmountUSD ?? t.amountUSD ?? t.sourceAmount ?? t.amount ?? 0), 0));
                return (
                  <DraggableIncomeItem 
                    key={inc.id} 
                    income={inc} 
                    isDragging={activeDragId === inc.id} 
                    onSortingMode={() => setIsSortingMode(true)} 
                    isSortingMode={isSortingMode} 
                    onLongPress={(i) => { setIsSortingMode(false); setIncomeModal({ isOpen: true, income: i }); }} 
                    onClick={(income) => setHistoryModal({ isOpen: true, entity: income, type: "income" })} 
                    monthlyAmount={monthlyAmount}
                  />
                );
              })}
            </div>
          </SortableContext>
        </section>

        <section className="px-0 py-2 relative z-20 shrink-0">
          <div className="px-6 mb-3 flex justify-between items-center"><h2 className="text-[10px] font-black text-slate-500 uppercase">Кошельки</h2><button onClick={() => setAccountModal({ isOpen: true, account: null })} className="w-8 h-8 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--text-main)] flex items-center justify-center hover:bg-[var(--glass-item-active)] transition-all shadow-sm"><Plus size={16} /></button></div>
          <SortableContext items={accounts.map(a => a.id)} strategy={horizontalListSortingStrategy}><div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">{accounts.map(acc => (<AccountItem key={acc.id} account={acc} isDragging={activeDragId === acc.id} onSortingMode={() => setIsSortingMode(true)} onLongPress={(a) => { setIsSortingMode(false); setAccountModal({ isOpen: true, account: a }); }} onClick={(account) => setHistoryModal({ isOpen: true, entity: account, type: "account" })} activeDragType={activeDragType} isSortingMode={isSortingMode} isOver={overId === acc.id} />))}</div></SortableContext>
        </section>

        <section className={`px-0 flex-1 pt-4 pb-8 overflow-y-auto hide-scrollbar z-10 relative transition-all duration-500 ${mode === "income" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}`}>
          <div className="px-6 py-2">
            <div className="flex justify-between items-center mb-6"><h2 className="text-[10px] font-black text-slate-500 uppercase">Расходы</h2><div className="flex items-center gap-3"><button onClick={() => setAnalyticsModal({ isOpen: true, type: "expense" })} className="w-8 h-8 rounded-full bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 text-[var(--primary-color)] flex items-center justify-center hover:bg-[var(--primary-color)]/20 transition-all shadow-sm"><PieChart size={14} /></button><button onClick={() => setCategoryModal({ isOpen: true, category: null })} className="w-8 h-8 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--text-main)] flex items-center justify-center hover:bg-[var(--glass-item-active)] transition-all shadow-sm"><Plus size={16} /></button></div></div>
            <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-4">
                {categories.map(cat => {
                  const spent = Math.round(currentMonthTransactions.filter(t => t.type === "expense" && t.targetId === cat.id).reduce((s, t) => s + (t.sourceAmountUSD ?? t.amountUSD ?? t.sourceAmount ?? t.amount ?? 0), 0));
                  return (<CategoryItem key={cat.id} category={cat} spent={spent} isDragging={activeDragId === cat.id} onSortingMode={() => setIsSortingMode(true)} isSortingMode={isSortingMode} isOver={overId === cat.id} onLongPress={(c) => { setIsSortingMode(false); setCategoryModal({ isOpen: true, category: c }); }} onClick={(category) => setHistoryModal({ isOpen: true, entity: category, type: "category" })} activeDragType={activeDragType} />);
                })}
              </div>
            </SortableContext>
          </div>
        </section>

        <DragOverlay dropAnimation={null}>{activeDragId ? (<div className="draggable-coin grabbed-elevation pointer-events-none">{React.createElement(IconMap[(activeItemData as any)?.icon] || Wallet, { size: 28, color: (activeItemData as any)?.color })}</div>) : null}</DragOverlay>
      </DndContext>

      <Numpad
        data={numpad} availableCurrencies={Array.from(new Set([...accounts.map(a => a.currency), numpad.sourceCurrency, numpad.targetCurrency]))} isEditing={!!editingTxId}
        onClose={() => { setNumpad({ ...numpad, isOpen: false, targetLinked: true }); setEditingTxId(null); }}
        onFieldChange={(f) => setNumpad(p => ({ ...p, activeField: f }))}
        onManageTags={() => setIsTagModalOpen(true)}
        onLinkToggle={() => { setNumpad(p => ({ ...p, targetLinked: !p.targetLinked })); if (navigator.vibrate) navigator.vibrate(10); }}
        onCurrencyChange={(field, curr) => setNumpad(p => {
          if (field === "source") {
            if (p.type === "income") localStorage.setItem("cl_last_currency", curr);
            const evalAmt = parseFloat(safeEval(p.sourceAmount));
            const newTarget = p.targetLinked && evalAmt > 0 ? (Math.round(RatesService.convert(evalAmt, curr, p.targetCurrency) * 100) / 100).toString() : p.targetAmount;
            return { ...p, sourceCurrency: curr, targetAmount: newTarget };
          } else {
            if (p.type === "expense") localStorage.setItem("cl_last_currency", curr);
            const evalAmt = parseFloat(safeEval(p.sourceAmount));
            const newTarget = p.targetLinked && evalAmt > 0 ? (Math.round(RatesService.convert(evalAmt, p.sourceCurrency, curr) * 100) / 100).toString() : p.targetAmount;
            return { ...p, targetCurrency: curr, targetAmount: newTarget };
          }
        })}
        onPress={(val) => setNumpad(p => {
          const isSource = p.activeField === "source"; const key = isSource ? "sourceAmount" : "targetAmount"; const currStr = p[key];
          const computeTarget = (s: string): string => { const amt = parseFloat(safeEval(s)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, p.sourceCurrency, p.targetCurrency) * 100) / 100).toString(); };
          const computeSource = (t: string): string => { const amt = parseFloat(safeEval(t)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, p.targetCurrency, p.sourceCurrency) * 100) / 100).toString(); };
          if (val === "C") return p.targetLinked ? { ...p, sourceAmount: "0", targetAmount: "0" } : { ...p, [key]: "0" };
          if (val === "=") { const ev = safeEval(currStr); if (p.targetLinked) return isSource ? { ...p, sourceAmount: ev, targetAmount: computeTarget(ev) } : { ...p, targetAmount: ev, sourceAmount: computeSource(ev) }; return { ...p, [key]: ev }; }
          const nv = currStr === "0" && !isNaN(Number(val)) ? val : currStr + val;
          if (p.targetLinked) return isSource ? { ...p, sourceAmount: nv, targetAmount: computeTarget(nv) } : { ...p, targetAmount: nv, sourceAmount: computeSource(nv) };
          if (!isSource && (p.sourceAmount === "0" || p.sourceAmount === "")) return { ...p, targetAmount: nv, sourceAmount: computeSource(nv), targetLinked: true };
          return { ...p, [key]: nv };
        })}
        onDelete={() => setNumpad(p => {
          const isSource = p.activeField === "source"; const key = isSource ? "sourceAmount" : "targetAmount"; const currStr = p[key]; const nv = currStr.length > 1 ? currStr.slice(0, -1) : "0";
          const computeTarget = (s: string): string => { const amt = parseFloat(safeEval(s)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, p.sourceCurrency, p.targetCurrency) * 100) / 100).toString(); };
          const computeSource = (t: string): string => { const amt = parseFloat(safeEval(t)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, p.targetCurrency, p.sourceCurrency) * 100) / 100).toString(); };
          if (p.targetLinked) return isSource ? { ...p, sourceAmount: nv, targetAmount: computeTarget(nv) } : { ...p, targetAmount: nv, sourceAmount: computeSource(nv) };
          return { ...p, [key]: nv };
        })}
        onTagSelect={(t) => setNumpad(p => ({ ...p, tag: t }))} onCommentChange={(c) => setNumpad(p => ({ ...p, comment: c }))}
        onRemove={() => { if (editingTxId) setConfirmDelete({ isOpen: true, title: "Удалить операцию?", message: "Транзакция будет удалена, балансы кошельков будут скорректированы автоматически.", onConfirm: () => { deleteTransaction(editingTxId); setEditingTxId(null); setNumpad(p => ({ ...p, isOpen: false, sourceAmount: "0", targetAmount: "0", comment: "" })); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }}
        onSubmit={(date?: string) => {
          const fs = parseFloat(safeEval(numpad.sourceAmount)); const ft = parseFloat(safeEval(numpad.targetAmount));
          if (editingTxId) updateTransaction(editingTxId, numpad.type, numpad.source!, numpad.destination!, fs, ft, numpad.tag || undefined, date, numpad.comment || undefined, numpad.targetCurrency);
          else addTransaction(numpad.type, numpad.source!, numpad.destination!, fs, ft, numpad.tag || undefined, date, numpad.comment || undefined, numpad.targetCurrency);
          setNumpad({ ...numpad, isOpen: false, sourceAmount: "0", targetAmount: "0", targetLinked: true, activeField: "source", comment: "" });
        }}
      />

      <AccountModal isOpen={accountModal.isOpen} account={accountModal.account} onClose={() => setAccountModal({ isOpen: false, account: null })} onSave={(name, balance, currency, icon, color) => { saveAccount({ ...accountModal.account, name, balance, currency, icon, color }); setAccountModal({ isOpen: false, account: null }); }} onDelete={() => { if (!accountModal.account) return; setConfirmDelete({ isOpen: true, title: "Удалить кошелек?", message: `Удалить "${accountModal.account.name}"?`, onConfirm: () => { deleteAccount(accountModal.account!.id); setAccountModal({ isOpen: false, account: null }); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }} />
      <IncomeModal 
        isOpen={incomeModal.isOpen} 
        income={incomeModal.income} 
        onClose={() => setIncomeModal({ isOpen: false, income: null })} 
        onSave={(name, icon, color, tags) => { 
          saveIncome({ ...incomeModal.income, name, icon, color, tags }); 
          setIncomeModal({ isOpen: false, income: null }); 
        }} 
        onDelete={() => { 
          if (!incomeModal.income) return; 
          setConfirmDelete({ 
            isOpen: true, 
            title: "Удалить доход?", 
            message: `Удалить "${incomeModal.income.name}"?`, 
            onConfirm: () => { deleteIncome(incomeModal.income!.id); setIncomeModal({ isOpen: false, income: null }); setConfirmDelete(p => ({ ...p, isOpen: false })); } 
          }); 
        }} 
      />
      <CategoryModal 
        isOpen={categoryModal.isOpen} 
        category={categoryModal.category} 
        onClose={() => setCategoryModal({ isOpen: false, category: null })} 
        onSave={(cat) => { 
          saveCategory(cat); 
          setCategoryModal({ isOpen: false, category: null }); 
        }} 
        onDelete={() => { 
          if (!categoryModal.category) return; 
          setConfirmDelete({ 
            isOpen: true, 
            title: "Удалить категорию?", 
            message: `Удалить "${categoryModal.category.name}"?`, 
            onConfirm: () => { 
              deleteCategory(categoryModal.category!.id); 
              setCategoryModal({ isOpen: false, category: null }); 
              setConfirmDelete(p => ({ ...p, isOpen: false })); 
            } 
          }); 
        }} 
      />
      <HistoryModal 
        isOpen={historyModal.isOpen} 
        onClose={() => setHistoryModal({ isOpen: false, entity: null, type: null })} 
        entity={historyModal.entity} 
        entityType={historyModal.type} 
        transactions={historyModal.customTransactions || transactions} 
        accounts={accounts} 
        categories={categories} 
        incomes={incomes} 
        onEditTransaction={(tx) => { 
          const source = tx.type === "income" ? incomes.find(i => i.id === tx.targetId) ?? null : accounts.find(a => a.id === tx.accountId) ?? null; 
          const destination = tx.type === "expense" ? categories.find(c => c.id === tx.targetId) ?? null : tx.type === "income" ? accounts.find(a => a.id === tx.accountId) ?? null : accounts.find(a => a.id === tx.targetId) ?? null; 
          if (!source || !destination) return; 
          
          setEditingTxId(tx.id); 
          setHistoryModal({ isOpen: false, entity: null, type: null }); 
          
          // Determine the correct source currency based on the actual account/source settings
          const actualSourceCurrency = tx.type === "income" 
            ? tx.sourceCurrency // For income, source is external (could be anything)
            : (source as Account).currency; // For expense/transfer, source is our wallet
            
          setNumpad({ 
            isOpen: true, 
            type: tx.type, 
            source, 
            destination, 
            sourceAmount: String(tx.sourceAmount), 
            sourceCurrency: actualSourceCurrency, 
            targetAmount: String(tx.targetAmount ?? tx.sourceAmount), 
            targetCurrency: tx.targetCurrency, 
            targetLinked: true, 
            activeField: "source", 
            tag: tx.tag ?? null, 
            comment: tx.comment ?? "", 
          }); 
        }} 
      />
      <AnalyticsModal isOpen={analyticsModal.isOpen} onClose={() => setAnalyticsModal(p => ({ ...p, isOpen: false }))} categories={categories} incomes={incomes} accounts={accounts} globalTransactions={transactions} initialType={analyticsModal.type} onItemClick={(item, type, monthTx) => { let entity = item; if (type === "category") { const cat = categories.find(c => c.id === item.id); if (cat) entity = cat; } else if (type === "income") { const inc = incomes.find(i => i.id === item.id); if (inc) entity = inc; } setAnalyticsModal(p => ({ ...p, isOpen: false })); setHistoryModal({ isOpen: true, entity, type, customTransactions: monthTx.filter(t => { if (type === "category") return t.targetId === item.id; if (type === "tag") return (t.tag?.trim() || "Без тега") === item.name; if (type === "income") return t.targetId === item.id; return false; }) }); }} />
      <ConfirmModal isOpen={confirmDelete.isOpen} title={confirmDelete.title} message={confirmDelete.message} onConfirm={confirmDelete.onConfirm} onCancel={() => setConfirmDelete(p => ({ ...p, isOpen: false }))} />
      
      <TagModal 
        isOpen={isTagModalOpen} 
        onClose={() => setIsTagModalOpen(false)} 
        existingTags={allExistingTags}
        activeTags={numpad.type === 'expense' ? (numpad.destination as Category)?.tags || [] : (numpad.source as IncomeSource)?.tags || []}
        onSelect={(tag) => {
          if (numpad.type === 'expense' && numpad.destination) {
            const cat = numpad.destination as Category;
            const newTags = cat.tags.includes(tag) ? cat.tags.filter(t => t !== tag) : [...cat.tags, tag];
            const updated = { ...cat, tags: newTags };
            saveCategory(updated);
            setNumpad(p => ({ ...p, destination: updated }));
          } else if (numpad.type === 'income' && numpad.source) {
            const inc = numpad.source as IncomeSource;
            const newTags = inc.tags.includes(tag) ? inc.tags.filter(t => t !== tag) : [...inc.tags, tag];
            const updated = { ...inc, tags: newTags };
            saveIncome(updated);
            setNumpad(p => ({ ...p, source: updated }));
          }
        }}
      />

      {conflictData && (
        <ConfirmModal 
          isOpen={true} 
          title="Обнаружены изменения" 
          message={`В облаке есть более свежие данные (версия от ${new Date(conflictData.timestamp.replace(/-/g, '/').replace('T', ' ')).toLocaleString()}). Загрузить их и перезаписать локальные данные?`}
          confirmText="ЗАГРУЗИТЬ"
          cancelText="ОСТАВИТЬ МОИ"
          danger={false}
          onConfirm={() => updateLocalFromRemote(conflictData)}
          onCancel={() => {
            // If user rejects cloud, we update our local sync timestamp to match remote
            // to stop asking until next remote change
            localStorage.setItem("cl_last_sync", conflictData.timestamp);
            setConflictData(null);
          }}
        />
      )}
    </div>
  );
}
