// CoinLover - Modern Personal Finance App
import * as React from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import {
  Plus, Settings, CircleDollarSign, TrendingDown, ChevronRight, TrendingUp, AlertTriangle, Wallet, RefreshCcw,
  Heart, MousePointer2, PieChart, List
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

export default function App() {
  const {
    accounts, setAccounts,
    categories, setCategories,
    incomes, setIncomes,
    transactions, syncStatus,
    addTransaction, updateTransaction, deleteTransaction, saveAccount, deleteAccount,
    saveCategory, deleteCategory,
    saveIncome, deleteIncome,
    syncCategories, syncIncomes, syncAccountsOrder,
    pullSettings, checkConflicts, conflictData, setConflictData, updateLocalFromRemote, pushSettings
  } = useFinance();

  const [isSplashVisible, setIsSplashVisible] = React.useState(true);
  const isDemo = window.localStorage.getItem("coinlover_demo") !== "false";

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const setDemoParams = params.get("demo") === "1" || params.get("mode") === "demo" || hash === "#demo";
    const setRealParams = params.get("demo") === "real" || params.get("mode") === "real" || hash === "#real" || params.get("key") === "99";
    const isCurrentlyDemo = window.localStorage.getItem("coinlover_demo") !== "false";

    if (setDemoParams && !isCurrentlyDemo) {
      window.localStorage.setItem("coinlover_demo", "true");
      window.location.href = window.location.origin + window.location.pathname;
      return;
    }
    if (setRealParams && isCurrentlyDemo) {
      window.localStorage.setItem("coinlover_demo", "false");
      window.location.href = window.location.origin + window.location.pathname;
      return;
    }
  }, []);

  React.useEffect(() => {
    RatesService.syncRatesInBackground();
    const splashTimer = setTimeout(() => setIsSplashVisible(false), 600);
    const conflictTimer = setTimeout(() => checkConflicts(), 1500);
    return () => { clearTimeout(splashTimer); clearTimeout(conflictTimer); };
  }, [checkConflicts]);

  const [mode, setMode] = React.useState<"expense" | "income">("expense");
  const [pillMode, setPillMode] = React.useState<"expense" | "balance">("expense");
  const [isIncomeCollapsed, setIsIncomeCollapsed] = React.useState(true);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [activeDragType, setActiveDragType] = React.useState<DragItemType | null>(null);
  const [isSortingMode, setIsSortingMode] = React.useState(false);
  const [isActionMode, setIsActionMode] = React.useState(false);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = React.useState(false);
  const [overId, setOverId] = React.useState<string | null>(null);

  const sortingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [accountModal, setAccountModal] = React.useState<{ isOpen: boolean; account: Account | null }>({ isOpen: false, account: null });
  const [incomeModal, setIncomeModal] = React.useState<{ isOpen: boolean; income: IncomeSource | null }>({ isOpen: false, income: null });
  const [categoryModal, setCategoryModal] = React.useState<{ isOpen: boolean; category: Category | null }>({ isOpen: false, category: null });
  const [historyModal, setHistoryModal] = React.useState<{ isOpen: boolean; entity: any; type: "account" | "category" | "income" | "tag" | "feed" | null; customTransactions?: Transaction[]; }>({ isOpen: false, entity: null, type: null });
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = React.useState(false);
  const [analyticsModal, setAnalyticsModal] = React.useState<{ isOpen: boolean; type: "expense" | "income" }>({ isOpen: false, type: "expense" });
  const [theme, setTheme] = React.useState<"light" | "dark">(() => (localStorage.getItem("coinlover_theme") as "light" | "dark") || "dark");

  React.useEffect(() => {
    if (theme === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
    localStorage.setItem("coinlover_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const [numpad, setNumpad] = React.useState<NumpadData>({
    isOpen: false, type: "expense", source: null, destination: null,
    sourceAmount: "0", targetAmount: "0", targetCurrency: "USD", targetLinked: true, activeField: "source", tag: null, comment: ""
  });
  const [editingTxId, setEditingTxId] = React.useState<string | null>(null);

  const safeEval = (str: string): string => {
    try {
      let expr = str.replace(/,/g, '.').replace(/\s/g, '');
      expr = expr.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
      const sanitized = expr.replace(/[^-+/*0-9.()]/g, '');
      if (!sanitized) return "0";
      const result = new Function(`return ${sanitized}`)();
      if (typeof result !== 'number' || !isFinite(result)) return "0";
      return (Math.round(result * 100) / 100).toString();
    } catch { return str; }
  };

  const [confirmDelete, setConfirmDelete] = React.useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  const anyModalOpen = accountModal.isOpen || incomeModal.isOpen || categoryModal.isOpen || historyModal.isOpen || analyticsModal.isOpen || numpad.isOpen || confirmDelete.isOpen || isSettingsMenuOpen || !!conflictData;
  const historyPushedRef = React.useRef(false);

  React.useEffect(() => {
    if (anyModalOpen && !historyPushedRef.current) {
      window.history.pushState({ modal: true }, "");
      historyPushedRef.current = true;
    } else if (!anyModalOpen && historyPushedRef.current) {
      window.history.back();
      historyPushedRef.current = false;
    }
  }, [anyModalOpen]);

  React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        setAccountModal(p => ({ ...p, isOpen: false }));
        setIncomeModal(p => ({ ...p, isOpen: false }));
        setCategoryModal(p => ({ ...p, isOpen: false }));
        setHistoryModal(p => ({ ...p, isOpen: false }));
        setAnalyticsModal(p => ({ ...p, isOpen: false }));
        setNumpad(p => ({ ...p, isOpen: false }));
        setConfirmDelete(p => ({ ...p, isOpen: false }));
        setIsSettingsMenuOpen(false);
        setConflictData(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const toggleIncome = () => {
    const next = !isIncomeCollapsed;
    setIsIncomeCollapsed(next);
    setMode(next ? "expense" : "income");
  };

  const accountsRef = React.useRef(accounts);
  const categoriesRef = React.useRef(categories);
  const incomesRef = React.useRef(incomes);
  React.useEffect(() => { accountsRef.current = accounts; }, [accounts]);
  React.useEffect(() => { categoriesRef.current = categories; }, [categories]);
  React.useEffect(() => { incomesRef.current = incomes; }, [incomes]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
    setActiveDragType(e.active.data.current?.type as DragItemType);
    setHasMovedDuringDrag(false);
    setIsActionMode(false);
    if (!isSortingMode) {
      sortingTimerRef.current = setTimeout(() => {
        setIsSortingMode(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    setOverId(over?.id as string || null);
    if (!over) return;
    if (active.data.current?.type !== over.data.current?.type) { if (sortingTimerRef.current) clearTimeout(sortingTimerRef.current); }
    if (!isSortingMode || isActionMode) return;
    if (active.id === over.id) return;

    if (active.data.current?.type === "account" && over.data.current?.type === "account") {
      setAccounts((items) => arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id)));
      setHasMovedDuringDrag(true);
    } else if (active.data.current?.type === "category" && over.data.current?.type === "category") {
      setCategories((items) => arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id)));
      setHasMovedDuringDrag(true);
    } else if (active.data.current?.type === "income" && over.data.current?.type === "income") {
      setIncomes((items) => arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id)));
      setHasMovedDuringDrag(true);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (sortingTimerRef.current) clearTimeout(sortingTimerRef.current);
    const { active, over } = e;
    const sorting = isSortingMode;
    const action = isActionMode;
    const moved = hasMovedDuringDrag;

    setActiveDragId(null); setActiveDragType(null); setOverId(null);
    setIsSortingMode(false); setIsActionMode(false);

    if (sorting && moved) {
      const dragType = active.data.current?.type as DragItemType;
      if (dragType === "account") syncAccountsOrder(accountsRef.current);
      else if (dragType === "category") syncCategories(categoriesRef.current);
      else if (dragType === "income") syncIncomes(incomesRef.current);
    }

    if (!over) return;

    if (action || !sorting) {
      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type === "account") {
        if (overData?.type === "category") {
          const lastUsed = localStorage.getItem("cl_last_currency") || activeData.account.currency || "USD";
          setNumpad({
            isOpen: true, type: "expense", source: activeData.account, destination: overData.category,
            sourceAmount: "0", targetAmount: "0", targetCurrency: lastUsed, targetLinked: true,
            activeField: "source", tag: overData.category.tags?.[0] || null, comment: ""
          });
        } else if (overData?.type === "account" && active.id !== over.id) {
          setNumpad({
            isOpen: true, type: "transfer", source: activeData.account, destination: overData.account,
            sourceAmount: "0", targetAmount: "0", targetCurrency: overData.account.currency || "USD",
            targetLinked: true, activeField: "source", tag: null, comment: ""
          });
        }
      } else if (activeData?.type === "income" && overData?.type === "account") {
        setNumpad({
          isOpen: true, type: "income", source: activeData.income, destination: overData.account,
          sourceAmount: "0", targetAmount: "0", targetCurrency: overData.account.currency || "USD",
          targetLinked: true, activeField: "source", tag: null, comment: ""
        });
      }
    }
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date.replace(/-/g, '/').replace('T', ' '));
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });

  const totalBalance = Math.round(accounts.reduce((s, a) => s + RatesService.convert(a.balance, a.currency || "USD", "USD"), 0));
  const totalSpent = Math.round(currentMonthTransactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.sourceAmountUSD || t.sourceAmount), 0));

  const activeItemData = activeDragType === "account" ? accounts.find(a => a.id === activeDragId) : activeDragType === "income" ? incomes.find(i => i.id === activeDragId) : categories.find(c => c.id === activeDragId);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden bg-[var(--bg-color)] text-[var(--text-main)] font-sans select-none text-left transition-colors duration-300">
      <style>{`body { overflow: hidden; overscroll-behavior: none; background: var(--bg-color); } * { -webkit-tap-highlight-color: transparent; }`}</style>
      <h1 className="sr-only">CoinLover — Геймифицированное управление личными финансами</h1>

      {isSplashVisible && (
        <div className="fixed inset-0 z-[1000] bg-[var(--bg-color)] flex items-center justify-center animate-in fade-in duration-500">
          <div className="relative animate-pulse flex flex-col items-center gap-6">
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 shadow-[0_0_50px_rgba(217,119,6,0.3)] flex items-center justify-center border-4 border-amber-200/20">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent)]" />
              <Heart size={64} fill="white" className="text-white drop-shadow-lg relative z-10" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-2.5 shadow-2xl border-2 border-amber-600 z-20 scale-110">
                <MousePointer2 size={24} className="text-amber-600 fill-amber-600" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-amber-500 font-black tracking-[0.4em] uppercase text-sm ml-[0.4em]">CoinLover</span>
              <div className="h-0.5 w-12 bg-amber-500/30 rounded-full" />
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-50">
        <div className={`w-2 h-2 rounded-full transition-all duration-500 ${syncStatus === "loading" ? "bg-amber-400 animate-pulse" : syncStatus === "success" ? "bg-emerald-500/50" : syncStatus === "error" ? "bg-rose-500" : "bg-white/10"}`} />
      </div>

      <header className="px-6 py-8 flex flex-col gap-2 text-center shrink-0">
        <div className="flex justify-between items-center mb-2">
          <button onClick={toggleIncome} className="glass-icon-btn w-10 h-10 hover:bg-white/10 transition-colors relative">
            <CircleDollarSign size={20} className="text-[#10b981]" />
            {isDemo && <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] animate-pulse whitespace-nowrap shadow-[0_0_15px_rgba(245,158,11,0.1)]">Demo</span>}
          </button>
          <div className="flex flex-col items-center gap-0.5"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Balance</p></div>
          <div className="relative">
            <button onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)} className="glass-icon-btn w-10 h-10 text-slate-500 hover:text-[var(--text-main)] transition-colors"><Settings size={20} /></button>
            {isSettingsMenuOpen && (
              <>
                <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={() => setIsSettingsMenuOpen(false)} />
                <div className="absolute top-12 right-0 w-48 bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-2xl shadow-2xl flex flex-col z-[201] p-2 animate-in fade-in zoom-in-95 origin-top-right">
                  <button onClick={() => { setIsSettingsMenuOpen(false); setHistoryModal({ isOpen: true, entity: { name: "Лента", icon: "list" }, type: "feed" }); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left">
                    <List size={16} className="text-[var(--primary-color)]" /><span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Лента</span>
                  </button>
                  <button onClick={() => { setIsSettingsMenuOpen(false); toggleTheme(); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left">
                    {theme === "dark" ? <TrendingUp size={16} className="text-[var(--success-color)]" /> : <PieChart size={16} className="text-[var(--primary-color)]" />}
                    <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <button onClick={() => setPillMode(p => p === "expense" ? "balance" : "expense")} className="mt-2 mx-auto px-5 py-2 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center gap-2 w-fit hover:bg-[var(--glass-item-active)] transition-all cursor-pointer shadow-sm active:scale-95">
          {pillMode === "expense" ? (<><TrendingDown size={14} className="text-[#cda434]" /><span className="text-xs font-bold text-[#cda434]">-${totalSpent.toLocaleString()} в этом месяце</span></>) : (<><Wallet size={14} className="text-[#10b981]" /><span className="text-xs font-bold text-[#10b981]">Общий баланс: ${totalBalance.toLocaleString()}</span></>)}
        </button>
      </header>

      <DndContext sensors={sensors} collisionDetection={isSortingMode ? closestCenter : rectIntersection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <section className={`px-0 overflow-hidden transition-all duration-500 bg-white/[0.01] shrink-0 ${isIncomeCollapsed ? "max-h-0 opacity-0 border-none" : "max-h-[160px] opacity-100 border-b border-white/5 py-1"}`}>
          <div className="px-6 py-2 flex justify-between items-center"><div onClick={toggleIncome} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 group rounded-lg px-2 -ml-2 transition-colors"><ChevronRight size={14} className="text-slate-500 rotate-90" /><h2 className="text-[10px] font-black text-slate-500 uppercase group-hover:text-white">Доходы</h2></div><div className="flex items-center gap-3"><button onClick={() => setAnalyticsModal({ isOpen: true, type: "income" })} className="w-7 h-7 rounded-full bg-[var(--success-color)]/10 text-[var(--success-color)] flex items-center justify-center hover:bg-[var(--success-color)]/20 transition-colors"><PieChart size={14} /></button><button onClick={() => setIncomeModal({ isOpen: true, income: null })} className="text-slate-500 hover:text-white"><Plus size={14} /></button></div></div>
          <SortableContext items={incomes.map(i => i.id)} strategy={horizontalListSortingStrategy}><div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">{incomes.map(inc => (<DraggableIncomeItem key={inc.id} income={inc} isDragging={activeDragId === inc.id} onSortingMode={() => setIsSortingMode(true)} isSortingMode={isSortingMode} onLongPress={(i) => setIncomeModal({ isOpen: true, income: i })} onClick={(income) => setHistoryModal({ isOpen: true, entity: income, type: "income" })} />))}</div></SortableContext>
        </section>

        <section className="px-0 py-2 relative z-20 shrink-0">
          <div className="px-6 mb-3 flex justify-between items-center"><div className="flex items-center gap-2"><h2 className="text-[10px] font-black text-slate-500 uppercase">Кошельки</h2></div><button onClick={() => setAccountModal({ isOpen: true, account: null })} className="text-slate-500 hover:text-white"><Plus size={16} /></button></div>
          <SortableContext items={accounts.map(a => a.id)} strategy={horizontalListSortingStrategy}><div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">{accounts.map(acc => (<AccountItem key={acc.id} account={acc} isDragging={activeDragId === acc.id} onSortingMode={() => setIsSortingMode(true)} onLongPress={(a) => setAccountModal({ isOpen: true, account: a })} onClick={(account) => setHistoryModal({ isOpen: true, entity: account, type: "account" })} activeDragType={activeDragType} isSortingMode={isSortingMode} isOver={overId === acc.id} />))}</div></SortableContext>
        </section>

        <section className={`px-0 flex-1 pt-4 pb-8 overflow-y-auto hide-scrollbar z-10 relative transition-all duration-500 ${mode === "income" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}`}>
          <div className="px-6 py-2">
            <div className="flex justify-between items-center mb-6"><h2 className="text-[10px] font-black text-slate-500 uppercase">Расходы</h2><div className="flex items-center gap-3"><button onClick={() => setAnalyticsModal({ isOpen: true, type: "expense" })} className="w-7 h-7 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center hover:bg-[var(--primary-color)]/20 transition-colors shadow-[0_0_10px_var(--shadow-color)]"><PieChart size={14} /></button><button onClick={() => setCategoryModal({ isOpen: true, category: null })} className="text-slate-500 hover:text-white"><Plus size={16} /></button></div></div>
            <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-4">
                {categories.map(cat => {
                  const spent = Math.round(currentMonthTransactions.filter(t => t.type === "expense" && t.targetId === cat.id).reduce((s, t) => s + (t.sourceAmountUSD || t.sourceAmount), 0));
                  return (<CategoryItem key={cat.id} category={cat} spent={spent} isDragging={activeDragId === cat.id} onSortingMode={() => setIsSortingMode(true)} isSortingMode={isSortingMode} isOver={overId === cat.id} onLongPress={(c) => setCategoryModal({ isOpen: true, category: c })} onClick={(category) => setHistoryModal({ isOpen: true, entity: category, type: "category" })} activeDragType={activeDragType} />);
                })}
              </div>
            </SortableContext>
          </div>
        </section>

        <DragOverlay dropAnimation={null}>{activeDragId ? (<div className="draggable-coin grabbed-elevation pointer-events-none">{React.createElement(IconMap[(activeItemData as any)?.icon] || Wallet, { size: 28, color: (activeItemData as any)?.color })}</div>) : null}</DragOverlay>
      </DndContext>

      <Numpad
        data={numpad} availableCurrencies={Array.from(new Set([...accounts.map(a => a.currency), "USD"]))} isEditing={!!editingTxId}
        onClose={() => { setNumpad({ ...numpad, isOpen: false, targetLinked: true }); setEditingTxId(null); }}
        onFieldChange={(field) => setNumpad(p => ({ ...p, activeField: field }))}
        onLinkToggle={() => {
          setNumpad(p => ({ ...p, targetLinked: !p.targetLinked }));
          if (navigator.vibrate) navigator.vibrate(10);
        }}
        onCurrencyChange={(curr) => setNumpad(p => {
          localStorage.setItem("cl_last_currency", curr);
          const fromCur = (p.source as any)?.currency || "USD";
          const evalAmt = parseFloat(safeEval(p.sourceAmount));
          const newTargetAmount = p.targetLinked && evalAmt > 0 ? (Math.round(RatesService.convert(evalAmt, fromCur, curr) * 100) / 100).toString() : p.targetAmount;
          return { ...p, targetCurrency: curr, targetAmount: newTargetAmount };
        })}
        onPress={(val) => setNumpad(p => {
          const isSource = p.activeField === "source";
          const key = isSource ? "sourceAmount" : "targetAmount";
          const curr = p[key];
          const computeTarget = (s: string): string => { const from = (p.source as any)?.currency || "USD"; const to = p.type === "expense" ? p.targetCurrency : ((p.destination as any)?.currency || "USD"); if (from === to) return s; const amt = parseFloat(safeEval(s)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, from, to) * 100) / 100).toString(); };
          const computeSource = (t: string): string => { const from = (p.source as any)?.currency || "USD"; const to = p.type === "expense" ? p.targetCurrency : ((p.destination as any)?.currency || "USD"); if (from === to) return t; const amt = parseFloat(safeEval(t)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, to, from) * 100) / 100).toString(); };
          if (val === "C") return p.targetLinked ? { ...p, sourceAmount: "0", targetAmount: "0" } : { ...p, [key]: "0" };
          if (val === "=") { const ev = safeEval(curr); if (p.targetLinked) return isSource ? { ...p, sourceAmount: ev, targetAmount: computeTarget(ev) } : { ...p, targetAmount: ev, sourceAmount: computeSource(ev) }; return { ...p, [key]: ev }; }
          const nv = curr === "0" && !isNaN(Number(val)) ? val : curr + val;
          if (p.targetLinked) return isSource ? { ...p, sourceAmount: nv, targetAmount: computeTarget(nv) } : { ...p, targetAmount: nv, sourceAmount: computeSource(nv) };
          if (!isSource && (p.sourceAmount === "0" || p.sourceAmount === "")) return { ...p, targetAmount: nv, sourceAmount: computeSource(nv), targetLinked: true };
          return { ...p, [key]: nv };
        })}
        onDelete={() => setNumpad(p => {
          const isSource = p.activeField === "source";
          const key = isSource ? "sourceAmount" : "targetAmount";
          const curr = p[key]; const nv = curr.length > 1 ? curr.slice(0, -1) : "0";
          const computeTarget = (s: string): string => { const from = (p.source as any)?.currency || "USD"; const to = p.type === "expense" ? p.targetCurrency : ((p.destination as any)?.currency || "USD"); if (from === to) return s; const amt = parseFloat(safeEval(s)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, from, to) * 100) / 100).toString(); };
          const computeSource = (t: string): string => { const from = (p.source as any)?.currency || "USD"; const to = p.type === "expense" ? p.targetCurrency : ((p.destination as any)?.currency || "USD"); if (from === to) return t; const amt = parseFloat(safeEval(t)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, to, from) * 100) / 100).toString(); };
          if (p.targetLinked) return isSource ? { ...p, sourceAmount: nv, targetAmount: computeTarget(nv) } : { ...p, targetAmount: nv, sourceAmount: computeSource(nv) };
          return { ...p, [key]: nv };
        })}
        onTagSelect={(tag) => setNumpad(p => ({ ...p, tag }))}
        onCommentChange={(comment) => setNumpad(p => ({ ...p, comment }))}
        onRemove={() => { if (editingTxId) setConfirmDelete({ isOpen: true, title: "Удалить операцию?", message: "Транзакция будет удалена, балансы скорректированы.", onConfirm: () => { deleteTransaction(editingTxId); setEditingTxId(null); setNumpad(p => ({ ...p, isOpen: false, sourceAmount: "0", targetAmount: "0", comment: "" })); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }}
        onSubmit={(date?: string) => { const fs = parseFloat(safeEval(numpad.sourceAmount)); const ft = parseFloat(safeEval(numpad.targetAmount)); if (editingTxId) updateTransaction(editingTxId, numpad.type, numpad.source!, numpad.destination!, fs, ft, numpad.tag || undefined, date, numpad.comment || undefined, numpad.targetCurrency); else addTransaction(numpad.type, numpad.source!, numpad.destination!, fs, ft, numpad.tag || undefined, date, numpad.comment || undefined, numpad.targetCurrency); setNumpad({ ...numpad, isOpen: false, sourceAmount: "0", targetAmount: "0", targetLinked: true, activeField: "source", comment: "" }); }}
      />

      <AccountModal isOpen={accountModal.isOpen} account={accountModal.account} onClose={() => setAccountModal({ isOpen: false, account: null })} onSave={(name, balance, currency, icon, color) => { saveAccount({ ...accountModal.account, name, balance, currency, icon, color }); setAccountModal({ isOpen: false, account: null }); }} onDelete={() => { if (!accountModal.account) return; setConfirmDelete({ isOpen: true, title: "Удалить кошелек?", message: `Удалить "${accountModal.account.name}"?`, onConfirm: () => { deleteAccount(accountModal.account!.id); setAccountModal({ isOpen: false, account: null }); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }} />
      <IncomeModal isOpen={incomeModal.isOpen} income={incomeModal.income} onClose={() => setIncomeModal({ isOpen: false, income: null })} onSave={(name, icon, color) => { saveIncome({ ...incomeModal.income, name, icon, color }); setIncomeModal({ isOpen: false, income: null }); }} onDelete={() => { if (!incomeModal.income) return; setConfirmDelete({ isOpen: true, title: "Удалить доход?", message: `Удалить "${incomeModal.income.name}"?`, onConfirm: () => { deleteIncome(incomeModal.income!.id); setIncomeModal({ isOpen: false, income: null }); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }} />
      <CategoryModal isOpen={categoryModal.isOpen} category={categoryModal.category} onClose={() => setCategoryModal({ isOpen: false, category: null })} onSave={(cat) => { saveCategory(cat); setCategoryModal({ isOpen: false, category: null }); }} onDelete={() => { if (!categoryModal.category) return; setConfirmDelete({ isOpen: true, title: "Удалить категорию?", message: `Удалить "${categoryModal.category.name}"?`, onConfirm: () => { deleteCategory(categoryModal.category!.id); setCategoryModal({ isOpen: false, category: null }); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }} />
      <HistoryModal isOpen={historyModal.isOpen} onClose={() => setHistoryModal({ isOpen: false, entity: null, type: null })} entity={historyModal.entity} entityType={historyModal.type} transactions={historyModal.customTransactions || transactions} accounts={accounts} categories={categories} incomes={incomes} onEditTransaction={(tx) => { const source = tx.type === "income" ? incomes.find(i => i.id === tx.targetId) ?? null : accounts.find(a => a.id === tx.accountId) ?? null; const destination = tx.type === "expense" ? categories.find(c => c.id === tx.targetId) ?? null : tx.type === "income" ? accounts.find(a => a.id === tx.accountId) ?? null : accounts.find(a => a.id === tx.targetId) ?? null; if (!source || !destination) { setConfirmDelete({ isOpen: true, title: "Удалить операцию?", message: "Данные были изменены. Можно только удалить.", onConfirm: () => { deleteTransaction(tx.id); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); return; } setEditingTxId(tx.id); setHistoryModal({ isOpen: false, entity: null, type: null }); setNumpad({ isOpen: true, type: tx.type, source, destination, sourceAmount: String(tx.sourceAmount), targetAmount: String(tx.targetAmount ?? tx.sourceAmount), targetCurrency: tx.targetCurrency || (tx.type === "expense" ? "USD" : (destination as Account).currency || "USD"), targetLinked: true, activeField: "source", tag: tx.tag ?? null, comment: tx.comment ?? "", }); }} />
      <AnalyticsModal isOpen={analyticsModal.isOpen} onClose={() => setAnalyticsModal(p => ({ ...p, isOpen: false }))} categories={categories} incomes={incomes} globalTransactions={transactions} initialType={analyticsModal.type} onItemClick={(item, type, monthTx) => { let entity = item; if (type === "category") { const cat = categories.find(c => c.id === item.id); if (cat) entity = cat; } else if (type === "income") { const inc = incomes.find(i => i.id === item.id); if (inc) entity = inc; } setAnalyticsModal(p => ({ ...p, isOpen: false })); setHistoryModal({ isOpen: true, entity, type, customTransactions: monthTx.filter(t => { if (type === "category") return t.targetId === item.id; if (type === "tag") return (t.tag?.trim() || "Без тега") === item.name; if (type === "income") return t.sourceId === item.id; return false; }) }); }} />

      {conflictData && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[400] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
          <div className="glass-panel w-full max-w-sm p-8 flex flex-col items-center gap-8 text-center border-amber-500/20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 relative"><RefreshCcw size={40} className="animate-spin-slow opacity-20 absolute" /><div className="w-full h-full flex items-center justify-center scale-110"><RefreshCcw size={32} strokeWidth={2.5} /></div></div>
            <div className="space-y-3"><h3 className="text-2xl font-black tracking-tight text-white uppercase">Data Conflict</h3><p className="text-sm text-slate-400 leading-relaxed">Found a newer version in the Cloud from <span className="text-amber-400 block font-mono mt-1 text-xs bg-white/5 py-1 rounded-lg">{new Date(conflictData.timestamp.replace(/-/g, '/').replace('T', ' ')).toLocaleString()}</span></p></div>
            <div className="grid grid-cols-1 w-full gap-4">
              <button onClick={() => updateLocalFromRemote(conflictData)} className="group relative h-16 rounded-2xl bg-[#6d5dfc] font-black text-white shadow-xl shadow-[#6d5dfc]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 overflow-hidden"><div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" /><span className="relative">RESTORE FROM CLOUD</span></button>
              <button onClick={() => { pushSettings(); localStorage.setItem("cl_last_sync", conflictData.timestamp); updateLocalFromRemote({ ...conflictData, accounts, categories, incomes }); }} className="h-14 rounded-2xl bg-white/5 border border-white/10 font-bold text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-500 text-xs tracking-widest">KEEP LOCAL VERSION</button>
            </div>
            <p className="text-[9px] text-slate-600 uppercase font-black tracking-[0.2em]">Choose carefully</p>
          </div>
        </div>
      )}
      <ConfirmModal isOpen={confirmDelete.isOpen} title={confirmDelete.title} message={confirmDelete.message} onConfirm={confirmDelete.onConfirm} onCancel={() => setConfirmDelete(p => ({ ...p, isOpen: false }))} />
    </div>
  );
}
