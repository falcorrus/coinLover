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
    pullSettings, checkConflicts, conflictData, updateLocalFromRemote, pushSettings
  } = useFinance();

  const [isSplashVisible, setIsSplashVisible] = React.useState(true);
  const isDemo = window.localStorage.getItem("coinlover_demo") !== "false";

  React.useEffect(() => {
    // Check URL parameters or hash to switch modes
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();

    // Links to enter Demo (Redundant as it is default, but keeps it explicit)
    const setDemoParams = params.get("demo") === "1" || params.get("mode") === "demo" || hash === "#demo";

    // Links to enter Real mode (Secret entrance)
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

    // Splash screen: minimal duration for brand feel, then immediate interactivity
    const splashTimer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 600);

    // DEFERRED Background check: let the UI render and stabilize first
    const conflictTimer = setTimeout(() => {
      checkConflicts();
    }, 1500);

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(conflictTimer);
    };
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

  const [accountModal, setAccountModal] = React.useState<{ isOpen: boolean; account: Account | null }>({
    isOpen: false, account: null
  });

  const [incomeModal, setIncomeModal] = React.useState<{ isOpen: boolean; income: IncomeSource | null }>({
    isOpen: false, income: null
  });

  const [categoryModal, setCategoryModal] = React.useState<{ isOpen: boolean; category: Category | null }>({
    isOpen: false, category: null
  });

  const [historyModal, setHistoryModal] = React.useState<{
    isOpen: boolean;
    entity: any;
    type: "account" | "category" | "income" | "tag" | null;
    customTransactions?: Transaction[];
  }>({
    isOpen: false, entity: null, type: null
  });

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = React.useState(false);

  const [analyticsModal, setAnalyticsModal] = React.useState({ isOpen: false });

  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    return (localStorage.getItem("coinlover_theme") as "light" | "dark") || "dark";
  });

  React.useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("coinlover_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const [numpad, setNumpad] = React.useState<NumpadData>({
    isOpen: false, type: "expense", source: null, destination: null,
    amount: "0", targetAmount: "0", targetLinked: true, activeField: "source", tag: null, comment: ""
  });
  // ID of the transaction being edited (null = new transaction)
  const [editingTxId, setEditingTxId] = React.useState<string | null>(null);

  const clearSortingTimer = () => {
    if (sortingTimerRef.current) {
      clearTimeout(sortingTimerRef.current);
      sortingTimerRef.current = null;
    }
  };

  const safeEval = (str: string): string => {
    try {
      let expr = str.replace(/,/g, '.').replace(/\s/g, '');
      expr = expr.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
      const sanitized = expr.replace(/[^-+/*0-9.()]/g, '');
      if (!sanitized) return "0";
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${sanitized}`)();
      if (typeof result !== 'number' || !isFinite(result)) return "0";
      return (Math.round(result * 100) / 100).toString();
    } catch {
      return str;
    }
  };

  const [confirmDelete, setConfirmDelete] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { }
  });

  // distance:15 → quick drags activate immediately (transfer / expense).
  // Long-press (1000ms) is handled inside AccountItem component directly.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const toggleIncome = () => {
    const next = !isIncomeCollapsed;
    setIsIncomeCollapsed(next);
    setMode(next ? "expense" : "income");
  };

  // Keep a ref to latest arrays to avoid stale closures in handleDragEnd
  const accountsRef = React.useRef(accounts);
  const categoriesRef = React.useRef(categories);
  const incomesRef = React.useRef(incomes);
  React.useEffect(() => { accountsRef.current = accounts; }, [accounts]);
  React.useEffect(() => { categoriesRef.current = categories; }, [categories]);
  React.useEffect(() => { incomesRef.current = incomes; }, [incomes]);

  // Open account edit modal — called directly by AccountItem on long-press
  const openAccountModal = (account: Account) =>
    setAccountModal({ isOpen: true, account });

  const openIncomeModal = (income: IncomeSource) =>
    setIncomeModal({ isOpen: true, income });

  const openCategoryModal = (category: Category) =>
    setCategoryModal({ isOpen: true, category });

  // Vertical pull-down (>30px) activates action mode
  const handleDragMove = (e: DragOverEvent) => {
    const { x, y } = e.delta;
    const dist = Math.sqrt(x * x + y * y);

    if (!isSortingMode) {
      if (y > 30 && !isActionMode) {
        setIsActionMode(true);
        clearSortingTimer();
        if (navigator.vibrate) navigator.vibrate(50); // Action vibration
      }

      // Если мы начали двигаться ОЧЕНЬ активно (>45px), это точно Транзакции. Убиваем таймер сортировки.
      // Но 15px было слишком мало, пальцы дрожат.
      if (dist > 45) {
        clearSortingTimer();
      }
    }
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
    setActiveDragType(e.active.data.current?.type as DragItemType);
    setHasMovedDuringDrag(false);
    setIsActionMode(false); // Ensure we start fresh
    // Enter sorting mode ONLY if user picks up and HOLDS still for 600ms
    if (!isSortingMode) {
      sortingTimerRef.current = setTimeout(() => {
        setIsSortingMode(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500); // 500ms holding in the air switches to sorting
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    setOverId(over?.id as string || null);

    if (!over) return;

    // If we are hovering over a DIFFERENT type (e.g. Account over Category), 
    // it's definitely a transaction, not a sort. Kill the sorting timer immediately.
    if (active.data.current?.type !== over.data.current?.type) {
      clearSortingTimer();
    }

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
    clearSortingTimer();
    const { active, over } = e;
    const sorting = isSortingMode;
    const action = isActionMode;
    const moved = hasMovedDuringDrag;

    setActiveDragId(null);
    setActiveDragType(null);
    setOverId(null);
    setIsSortingMode(false);
    setIsActionMode(false);

    // 1. Sync new order if we were sorting
    if (sorting && moved) {
      const dragType = active.data.current?.type as DragItemType;
      if (dragType === "account") syncAccountsOrder(accountsRef.current);
      else if (dragType === "category") syncCategories(categoriesRef.current);
      else if (dragType === "income") syncIncomes(incomesRef.current);
    }

    if (!over) return;

    // 2. Transact if we are in action mode (pull down) OR NOT in sorting mode
    if (action || !sorting) {
      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type === "account") {
        if (overData?.type === "category") {
          setNumpad({
            isOpen: true,
            type: "expense",
            source: activeData.account,
            destination: overData.category,
            amount: "0",
            targetAmount: "0",
            targetLinked: true,
            activeField: "source",
            tag: overData.category.tags?.[0] || null,
            comment: ""
          });
        } else if (overData?.type === "account" && active.id !== over.id) {
          const isSameCurrency = activeData.account.currency === overData.account.currency;
          setNumpad({
            isOpen: true,
            type: "transfer",
            source: activeData.account,
            destination: overData.account,
            amount: "0",
            targetAmount: "0",
            targetLinked: true,
            activeField: "source",
            tag: null,
            comment: ""
          });
        }
      } else if (activeData?.type === "income" && overData?.type === "account") {
        setNumpad({ isOpen: true, type: "income", source: activeData.income, destination: overData.account, amount: "0", targetAmount: "0", targetLinked: true, activeField: "source", tag: null, comment: "" });
      }
    }
  };

  const handleDeleteTrigger = () => {
    if (!accountModal.account) return;
    setConfirmDelete({
      isOpen: true,
      title: "Удалить кошелек?",
      message: `Это действие навсегда удалит кошелек "${accountModal.account.name}" и все связанные данные.`,
      onConfirm: () => {
        deleteAccount(accountModal.account!.id);
        setAccountModal({ isOpen: false, account: null });
        setConfirmDelete(p => ({ ...p, isOpen: false }));
      }
    });
  };

  const handleIncomeDeleteTrigger = () => {
    if (!incomeModal.income) return;
    setConfirmDelete({
      isOpen: true,
      title: "Удалить доход?",
      message: `Вы уверены, что хотите удалить источник "${incomeModal.income.name}"?`,
      onConfirm: () => {
        deleteIncome(incomeModal.income!.id);
        setIncomeModal({ isOpen: false, income: null });
        setConfirmDelete(p => ({ ...p, isOpen: false }));
      }
    });
  };

  const handleCategoryDeleteTrigger = () => {
    if (!categoryModal.category) return;
    setConfirmDelete({
      isOpen: true,
      title: "Удалить категорию?",
      message: `Это действие удалит категорию "${categoryModal.category.name}". Статистика по этой категории может измениться.`,
      onConfirm: () => {
        deleteCategory(categoryModal.category!.id);
        setCategoryModal({ isOpen: false, category: null });
        setConfirmDelete(p => ({ ...p, isOpen: false }));
      }
    });
  };

  const totalBalance = Math.round(accounts.reduce((s, a) => s + RatesService.convert(a.balance, a.currency || "USD", "USD"), 0));
  const totalSpent = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);



  const activeItemData = activeDragType === "account"
    ? accounts.find(a => a.id === activeDragId)
    : activeDragType === "income"
      ? incomes.find(i => i.id === activeDragId)
      : categories.find(c => c.id === activeDragId);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden bg-[var(--bg-color)] text-[var(--text-main)] font-sans select-none text-left transition-colors duration-300">
      <style>{`body { overflow: hidden; overscroll-behavior: none; background: var(--bg-color); } * { -webkit-tap-highlight-color: transparent; }`}</style>

      {/* SEO H1 Header */}
      <h1 className="sr-only">CoinLover — Геймифицированное управление личными финансами</h1>

      {/* Splash Screen (Vector Mode) */}
      {isSplashVisible && (
        <div className="fixed inset-0 z-[1000] bg-[var(--bg-color)] flex items-center justify-center animate-in fade-in duration-500">
          <div className="relative animate-pulse flex flex-col items-center gap-6">
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 shadow-[0_0_50px_rgba(217,119,6,0.3)] flex items-center justify-center border-4 border-amber-200/20">
              {/* Coin Reflection Effect */}
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent)]" />

              {/* Main Icon */}
              <Heart size={64} fill="white" className="text-white drop-shadow-lg relative z-10" />

              {/* Pointer Icon */}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-2.5 shadow-2xl border-2 border-amber-600 z-20 scale-110">
                <MousePointer2 size={24} className="text-amber-600 fill-amber-600" />
              </div>
            </div>

            {/* App Name */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-amber-500 font-black tracking-[0.4em] uppercase text-sm ml-[0.4em]">CoinLover</span>
              <div className="h-0.5 w-12 bg-amber-500/30 rounded-full" />
            </div>
          </div>
        </div>
      )}
      {/* Sync Status dot */}
      <div className="absolute top-4 right-4 z-50">
        <div className={`w-2 h-2 rounded-full transition-all duration-500 ${syncStatus === "loading" ? "bg-amber-400 animate-pulse" :
          syncStatus === "success" ? "bg-emerald-500/50" :
            syncStatus === "error" ? "bg-rose-500" : "bg-white/10"
          }`} />
      </div>

      {/* Header */}
      <header className="px-6 py-8 flex flex-col gap-2 text-center shrink-0">
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={toggleIncome}
            onPointerDown={() => {
              demoPressTimerRef.current = setTimeout(() => {
                if (navigator.vibrate) navigator.vibrate(100);
                const nextDemo = !isDemo;
                window.localStorage.setItem("coinlover_demo", nextDemo.toString());
                window.location.reload();
              }, 700);
            }}
            onPointerUp={() => { if (demoPressTimerRef.current) clearTimeout(demoPressTimerRef.current); }}
            onPointerLeave={() => { if (demoPressTimerRef.current) clearTimeout(demoPressTimerRef.current); }}
            className="glass-icon-btn w-10 h-10 hover:bg-white/10 transition-colors relative"
          >
            <CircleDollarSign size={20} className="text-[#10b981]" />
            {isDemo && (
              <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] animate-pulse whitespace-nowrap shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                Demo
              </span>
            )}
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Balance</p>
          </div>
          <div className="relative">
            <button onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)} className="glass-icon-btn w-10 h-10 text-slate-500 hover:text-[var(--text-main)] transition-colors">
              <Settings size={20} />
            </button>
            {isSettingsMenuOpen && (
              <>
                <div className="fixed inset-0 z-[200]" onClick={() => setIsSettingsMenuOpen(false)} />
                <div className="absolute top-12 right-0 w-48 glass-panel flex flex-col z-[201] p-2 animate-in fade-in zoom-in-95 origin-top-right">
                  <button
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      setHistoryModal({ isOpen: true, entity: { name: "Лента", icon: "list" }, type: "feed" });
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors text-left"
                  >
                    <List size={16} className="text-[var(--primary-color)]" />
                    <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Лента</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      toggleTheme();
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors text-left"
                  >
                    {theme === "dark" ? <TrendingUp size={16} className="text-[#10b981]" /> : <PieChart size={16} className="text-[#6d5dfc]" />}
                    <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => setPillMode(p => p === "expense" ? "balance" : "expense")}
          className="mt-2 mx-auto px-5 py-2 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center gap-2 w-fit hover:bg-[var(--glass-item-active)] transition-all cursor-pointer shadow-sm active:scale-95"
        >
          {pillMode === "expense" ? (
            <>
              <TrendingDown size={14} className="text-[#cda434]" />
              <span className="text-xs font-bold text-[#cda434]">-${totalSpent.toLocaleString()} в этом месяце</span>
            </>
          ) : (
            <>
              <Wallet size={14} className="text-[#10b981]" />
              <span className="text-xs font-bold text-[#10b981]">Общий баланс: ${totalBalance.toLocaleString()}</span>
            </>
          )}
        </button>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          // 1. If sorting mode is active, use closestCenter for smooth reordering
          if (isSortingMode) return closestCenter(args);

          // 2. For Actions (Expense/Transfer/Income), use rectIntersection.
          // It's the most stable and 'sticky' algorithm for mobile.
          const collisions = rectIntersection(args);
          const filtered = collisions.filter(c => c.id !== args.active.id);

          // If multiple targets are hit, prioritize based on drag type
          if (filtered.length > 1) {
            const activeType = args.active.data.current?.type;
            if (activeType === "account") {
              // Prioritize categories over other accounts when dragging a wallet
              const cat = filtered.find(c => args.droppableContainers.find(dc => dc.id === c.id)?.data.current?.type === "category");
              if (cat) return [cat];
            }
          }

          return filtered;
        }}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={(e) => {
          const { active, over } = e;
          setOverId(over?.id as string || null);

          if (over) {
            const activeType = active.data.current?.type;
            const overType = over.data.current?.type;

            // Just kill the timer, don't force state change to avoid flickers
            if (overType === "category" || (activeType === "account" && overType === "account" && active.id !== over.id)) {
              clearSortingTimer();
            }
          }

          handleDragOver(e);
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          clearSortingTimer();
          setActiveDragId(null);
          setActiveDragType(null);
          setIsSortingMode(false);
          setIsActionMode(false);
        }}
      >

        {/* INCOME STRIPE */}
        <section className={`px-0 overflow-hidden transition-all duration-500 bg-white/[0.01] shrink-0 ${isIncomeCollapsed ? "max-h-0 opacity-0 border-none" : "max-h-[160px] opacity-100 border-b border-white/5 py-1"}`}>
          <div onClick={toggleIncome} className="px-6 py-2 flex justify-between items-center cursor-pointer hover:bg-white/5 group">
            <div className="flex items-center gap-2">
              <ChevronRight size={14} className="text-slate-500 rotate-90" />
              <h2 className="text-[10px] font-black text-slate-500 uppercase group-hover:text-white">Доходы</h2>
            </div>
            <button onClick={() => setIncomeModal({ isOpen: true, income: null })} className="text-slate-500 hover:text-white"><Plus size={14} /></button>
          </div>
          <SortableContext items={incomes.map(i => i.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">
              {incomes.map(inc => (
                <DraggableIncomeItem
                  key={inc.id}
                  income={inc}
                  isDragging={activeDragId === inc.id}
                  onSortingMode={() => setIsSortingMode(true)}
                  isSortingMode={isSortingMode}
                  onLongPress={openIncomeModal}
                  onClick={(income) => setHistoryModal({ isOpen: true, entity: income, type: "income" })}
                />
              ))}
            </div>
          </SortableContext>
        </section>

        {/* WALLETS STRIPE */}
        <section className="px-0 py-2 relative z-20 shrink-0">
          <div className="px-6 mb-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-black text-slate-500 uppercase">Кошельки</h2>
            </div>
            <button onClick={() => setAccountModal({ isOpen: true, account: null })} className="text-slate-500 hover:text-white">
              <Plus size={16} />
            </button>
          </div>
          <SortableContext items={accounts.map(a => a.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">
              {accounts.map(acc => (
                <AccountItem
                  key={acc.id} account={acc} isDragging={activeDragId === acc.id}
                  onSortingMode={() => setIsSortingMode(true)}
                  onLongPress={openAccountModal}
                  onClick={(account) => setHistoryModal({ isOpen: true, entity: account, type: "account" })}
                  activeDragType={activeDragType} isSortingMode={isSortingMode}
                  isOver={overId === acc.id}
                />
              ))}
            </div>
          </SortableContext>
        </section>

        {/* CATEGORIES GRID */}
        <section className={`px-0 flex-1 pt-4 pb-8 overflow-y-auto hide-scrollbar z-10 relative transition-all duration-500 ${mode === "income" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}`}>
          <div className="px-6 py-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black text-slate-500 uppercase">Расходы</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAnalyticsModal({ isOpen: true })}
                  className="w-7 h-7 rounded-full bg-[#6d5dfc]/10 text-[#6d5dfc] flex items-center justify-center hover:bg-[#6d5dfc]/20 transition-colors shadow-[0_0_10px_rgba(109,93,252,0.15)]"
                  title="Аналитика"
                >
                  <PieChart size={14} />
                </button>
                <button
                  onClick={() => setCategoryModal({ isOpen: true, category: null })}
                  className="text-slate-500 hover:text-white"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-4">
                {categories.map(cat => {
                  const spent = transactions
                    .filter(t => t.type === "expense" && t.targetId === cat.id)
                    .reduce((s, t) => s + t.amount, 0);
                  return (
                    <CategoryItem
                      key={cat.id} category={cat} spent={spent}
                      isDragging={activeDragId === cat.id}
                      onSortingMode={() => setIsSortingMode(true)}
                      isSortingMode={isSortingMode}
                      isOver={overId === cat.id}
                      onLongPress={openCategoryModal}
                      onClick={(category) => setHistoryModal({ isOpen: true, entity: category, type: "category" })}
                      activeDragType={activeDragType}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>
        </section>

        <DragOverlay dropAnimation={null}>
          {activeDragId ? (
            <div className="draggable-coin grabbed-elevation pointer-events-none">
              {React.createElement(IconMap[(activeItemData as Account | IncomeSource | Category)?.icon] || Wallet, { size: 28, color: (activeItemData as Account | IncomeSource | Category)?.color })}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Numpad
        data={numpad}
        isEditing={!!editingTxId}
        onClose={() => {
          setNumpad({ ...numpad, isOpen: false, targetLinked: true });
          setEditingTxId(null);
        }}
        onFieldChange={(field) => setNumpad(p => ({
          ...p,
          activeField: field,
          // Tapping the destination field breaks the mirror link
          targetLinked: field === "destination" ? false : p.targetLinked,
        }))}
        onPress={(val) => setNumpad(p => {
          const isSource = p.activeField === "source";
          const key = isSource ? "amount" : "targetAmount";
          const curr = p[key];

          const computeTarget = (newAmountStr: string): string => {
            const fromCur = (p.source as any)?.currency || "USD";
            const toCur = p.type === "expense" ? "USD" : ((p.destination as any)?.currency || "USD");
            if (fromCur === toCur) return newAmountStr;
            const evalAmt = parseFloat(safeEval(newAmountStr));
            if (isNaN(evalAmt) || evalAmt === 0) return "0";
            const converted = RatesService.convert(evalAmt, fromCur, toCur);
            return (Math.round(converted * 100) / 100).toString();
          };

          if (val === "C") {
            // Clear active field; if linked also clear target
            return p.targetLinked
              ? { ...p, amount: "0", targetAmount: "0" }
              : { ...p, [key]: "0" };
          }
          if (val === "=") {
            const evaluated = safeEval(curr);
            return p.targetLinked && isSource
              ? { ...p, amount: evaluated, targetAmount: computeTarget(evaluated) }
              : { ...p, [key]: evaluated };
          }

          const newVal = curr === "0" && !isNaN(Number(val)) ? val : curr + val;
          // If linked and editing source — mirror to targetAmount too
          return p.targetLinked && isSource
            ? { ...p, amount: newVal, targetAmount: computeTarget(newVal) }
            : { ...p, [key]: newVal };
        })}
        onDelete={() => setNumpad(p => {
          const isSource = p.activeField === "source";
          const key = isSource ? "amount" : "targetAmount";
          const curr = p[key];
          const newVal = curr.length > 1 ? curr.slice(0, -1) : "0";

          const computeTarget = (newAmountStr: string): string => {
            const fromCur = (p.source as any)?.currency || "USD";
            const toCur = p.type === "expense" ? "USD" : ((p.destination as any)?.currency || "USD");
            if (fromCur === toCur) return newAmountStr;
            const evalAmt = parseFloat(safeEval(newAmountStr));
            if (isNaN(evalAmt) || evalAmt === 0) return "0";
            const converted = RatesService.convert(evalAmt, fromCur, toCur);
            return (Math.round(converted * 100) / 100).toString();
          };

          // If linked and editing source — mirror delete to targetAmount too
          return p.targetLinked && isSource
            ? { ...p, amount: newVal, targetAmount: computeTarget(newVal) }
            : { ...p, [key]: newVal };
        })}
        onTagSelect={(tag) => setNumpad(p => ({ ...p, tag }))}
        onCommentChange={(comment) => setNumpad(p => ({ ...p, comment }))}
        onRemove={() => {
          if (editingTxId) {
            setConfirmDelete({
              isOpen: true,
              title: "Удалить операцию?",
              message: "Эта транзакция будет удалена, а балансы кошельков будут скорректированы автоматически.",
              onConfirm: () => {
                deleteTransaction(editingTxId);
                setEditingTxId(null);
                setNumpad(p => ({ ...p, isOpen: false, amount: "0", targetAmount: "0", comment: "" }));
                setConfirmDelete(p => ({ ...p, isOpen: false }));
              }
            });
          }
        }}
        onSubmit={(date?: string) => {
          const finalAmount = parseFloat(safeEval(numpad.amount));
          const finalTarget = parseFloat(safeEval(numpad.targetAmount));
          if (editingTxId) {
            updateTransaction(editingTxId, numpad.type, numpad.source!, numpad.destination!, finalAmount, finalTarget, numpad.tag || undefined, date, numpad.comment || undefined);
            setEditingTxId(null);
          } else {
            addTransaction(numpad.type, numpad.source!, numpad.destination!, finalAmount, finalTarget, numpad.tag || undefined, date, numpad.comment || undefined);
          }
          setNumpad({ ...numpad, isOpen: false, amount: "0", targetAmount: "0", targetLinked: true, activeField: "source", comment: "" });
        }}
      />

      <AccountModal
        isOpen={accountModal.isOpen}
        account={accountModal.account}
        onClose={() => setAccountModal({ isOpen: false, account: null })}
        onSave={(name: string, balance: number, currency: string, icon: string, color: string) => {
          saveAccount({ ...accountModal.account, name, balance, currency, icon, color });
          setAccountModal({ isOpen: false, account: null });
        }}
        onDelete={handleDeleteTrigger}
      />

      <IncomeModal
        isOpen={incomeModal.isOpen}
        income={incomeModal.income}
        onClose={() => setIncomeModal({ isOpen: false, income: null })}
        onSave={(name: string, icon: string, color: string) => {
          saveIncome({ ...incomeModal.income, name, icon, color });
          setIncomeModal({ isOpen: false, income: null });
        }}
        onDelete={handleIncomeDeleteTrigger}
      />

      <CategoryModal
        isOpen={categoryModal.isOpen}
        category={categoryModal.category}
        onClose={() => setCategoryModal({ isOpen: false, category: null })}
        onSave={(cat) => {
          saveCategory(cat);
          setCategoryModal({ isOpen: false, category: null });
        }}
        onDelete={handleCategoryDeleteTrigger}
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
          // Resolve source and destination entities from the transaction
          const source =
            tx.type === "income"
              ? incomes.find(i => i.id === tx.targetId) ?? null
              : accounts.find(a => a.id === tx.accountId) ?? null;
          const destination =
            tx.type === "expense"
              ? categories.find(c => c.id === tx.targetId) ?? null
              : tx.type === "income"
                ? accounts.find(a => a.id === tx.accountId) ?? null
                : accounts.find(a => a.id === tx.targetId) ?? null;
          if (!source || !destination) return;
          setEditingTxId(tx.id);
          setHistoryModal({ isOpen: false, entity: null, type: null });
          setNumpad({
            isOpen: true,
            type: tx.type,
            source,
            destination,
            amount: String(tx.amount),
            targetAmount: String(tx.targetAmount ?? tx.amount),
            targetLinked: false,
            activeField: "source",
            tag: tx.tag ?? null,
            comment: tx.comment ?? "",
          });
        }}
      />

      <AnalyticsModal
        isOpen={analyticsModal.isOpen}
        onClose={() => setAnalyticsModal({ isOpen: false })}
        categories={categories}
        globalTransactions={transactions}
        onItemClick={(item, type, monthTx) => {
          let entity = item;
          if (type === "category") {
            const cat = categories.find(c => c.id === item.id);
            if (cat) entity = cat;
          }
          setAnalyticsModal({ isOpen: false });
          setHistoryModal({
            isOpen: true,
            entity,
            type,
            customTransactions: monthTx
          });
        }}
      />

      {/* CONFLICT RESOLUTION MODAL */}
      {conflictData && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[400] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
          <div className="glass-panel w-full max-w-sm p-8 flex flex-col items-center gap-8 text-center border-amber-500/20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.1)] relative">
              <RefreshCcw size={40} className="animate-spin-slow opacity-20 absolute" />
              <div className="w-full h-full flex items-center justify-center scale-110">
                <RefreshCcw size={32} strokeWidth={2.5} />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">Data Conflict</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Found a newer version in the Cloud from
                <span className="text-amber-400 block font-mono mt-1 text-xs bg-white/5 py-1 rounded-lg">
                  {new Date(conflictData.timestamp.replace(/-/g, '/').replace('T', ' ')).toLocaleString()}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 w-full gap-4">
              <button
                onClick={() => updateLocalFromRemote(conflictData)}
                className="group relative h-16 rounded-2xl bg-[#6d5dfc] font-black text-white shadow-xl shadow-[#6d5dfc]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                <span className="relative">RESTORE FROM CLOUD</span>
              </button>

              <button
                onClick={() => {
                  pushSettings();
                  localStorage.setItem("cl_last_sync", conflictData.timestamp); // Acknowledge this remote but stay local
                  updateLocalFromRemote({ ...conflictData, accounts, categories, incomes }); // This clears the modal and updates timestamp
                }}
                className="h-14 rounded-2xl bg-white/5 border border-white/10 font-bold text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-500 text-xs tracking-widest"
              >
                KEEP LOCAL VERSION
              </button>
            </div>

            <p className="text-[9px] text-slate-600 uppercase font-black tracking-[0.2em]">
              Choose carefully to avoid losing progress
            </p>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={confirmDelete.title}
        message={confirmDelete.message}
        onConfirm={confirmDelete.onConfirm}
        onCancel={() => setConfirmDelete(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
