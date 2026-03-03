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
  Heart, MousePointer2
} from "lucide-react";

// Modules
import { Account, IncomeSource, Category, NumpadData, DragItemType } from "./types";
import { IconMap } from "./constants";
import { useFinance } from "./hooks/useFinance";
import { AccountItem } from "./components/AccountItem";
import { CategoryItem } from "./components/CategoryItem";
import { Numpad } from "./components/Numpad";
import { AccountModal } from "./components/AccountModal";
import { CategoryModal } from "./components/CategoryModal";
import { DraggableIncomeItem } from "./components/DraggableIncomeItem";
import { IncomeModal } from "./components/IncomeModal";

export default function App() {
  const {
    accounts, setAccounts,
    categories, setCategories,
    incomes, setIncomes,
    transactions, syncStatus,
    addTransaction, saveAccount, deleteAccount,
    saveCategory, deleteCategory,
    saveIncome, deleteIncome,
    syncCategories, syncIncomes, syncAccountsOrder,
    pullSettings, checkConflicts, conflictData, updateLocalFromRemote, pushSettings
  } = useFinance();

  const [isSplashVisible, setIsSplashVisible] = React.useState(true);

  React.useEffect(() => {
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

  const [accountModal, setAccountModal] = React.useState<{ isOpen: boolean; account: Account | null }>({
    isOpen: false, account: null
  });

  const [incomeModal, setIncomeModal] = React.useState<{ isOpen: boolean; income: IncomeSource | null }>({
    isOpen: false, income: null
  });

  const [categoryModal, setCategoryModal] = React.useState<{ isOpen: boolean; category: Category | null }>({
    isOpen: false, category: null
  });

  const [numpad, setNumpad] = React.useState<NumpadData>({
    isOpen: false, type: "expense", source: null, destination: null,
    amount: "0", targetAmount: "0", targetLinked: true, activeField: "source", tag: null, comment: ""
  });

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

  const [confirmDelete, setConfirmDelete] = React.useState<{ isOpen: boolean; onConfirm: () => void }>({
    isOpen: false, onConfirm: () => { }
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

    if (!isSortingMode || isActionMode) return;
    if (!over || active.id === over.id) return;

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
            targetLinked: isSameCurrency,
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
      onConfirm: () => {
        deleteAccount(accountModal.account!.id);
        setAccountModal({ isOpen: false, account: null });
        setConfirmDelete({ isOpen: false, onConfirm: () => { } });
      }
    });
  };

  const handleIncomeDeleteTrigger = () => {
    if (!incomeModal.income) return;
    setConfirmDelete({
      isOpen: true,
      onConfirm: () => {
        deleteIncome(incomeModal.income!.id);
        setIncomeModal({ isOpen: false, income: null });
        setConfirmDelete({ isOpen: false, onConfirm: () => { } });
      }
    });
  };

  const handleCategoryDeleteTrigger = () => {
    if (!categoryModal.category) return;
    setConfirmDelete({
      isOpen: true,
      onConfirm: () => {
        deleteCategory(categoryModal.category!.id);
        setCategoryModal({ isOpen: false, category: null });
        setConfirmDelete({ isOpen: false, onConfirm: () => { } });
      }
    });
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalSpent = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const activeItemData = activeDragType === "account"
    ? accounts.find(a => a.id === activeDragId)
    : activeDragType === "income"
      ? incomes.find(i => i.id === activeDragId)
      : categories.find(c => c.id === activeDragId);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden bg-[#050505] text-white font-sans select-none text-left">
      <style>{`body { overflow: hidden; overscroll-behavior: none; } * { -webkit-tap-highlight-color: transparent; }`}</style>

      {/* Splash Screen (Vector Mode) */}
      {isSplashVisible && (
        <div className="fixed inset-0 z-[1000] bg-[#050505] flex items-center justify-center animate-in fade-in duration-500">
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
          <button onClick={toggleIncome} className="glass-icon-btn w-10 h-10 hover:bg-white/10 transition-colors">
            <CircleDollarSign size={20} className="text-[#10b981]" />
          </button>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pt-1">Total Balance</p>
          <div className="glass-icon-btn w-10 h-10 text-slate-500"><Settings size={20} /></div>
        </div>
        <button
          onClick={() => setPillMode(p => p === "expense" ? "balance" : "expense")}
          className="mt-2 mx-auto px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 w-fit hover:bg-white/10 transition-colors cursor-pointer"
        >
          {pillMode === "expense" ? (
            <>
              <TrendingDown size={14} className="text-[#D4AF37]" />
              <span className="text-xs font-medium text-[#D4AF37]">-${totalSpent.toLocaleString()} this month</span>
            </>
          ) : (
            <>
              <Wallet size={14} className="text-[#10b981]" />
              <span className="text-xs font-medium text-[#10b981]">Общий баланс: ${totalBalance.toLocaleString()}</span>
            </>
          )}
        </button>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          if (!isSortingMode) {
            // Precision collision: Only trigger if pointer is in the top 70px of the item (the icon area)
            const collisions = pointerWithin(args);
            const filtered = collisions.filter(c => {
              if (c.id === args.active.id) return false;
              const container = args.droppableContainers.find(dc => dc.id === c.id);
              const rect = container?.rect.current;
              if (!rect) return false;
              const pointerY = args.pointerCoordinates?.y ?? 0;
              // Hit detection specifically for the top icon area
              return pointerY >= rect.top && pointerY <= rect.top + 70;
            });
            return filtered.length > 0 ? filtered : [];
          }
          return closestCenter(args);
        }}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
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
                  activeDragType={activeDragType} isSortingMode={isSortingMode}
                  isOver={overId === acc.id}
                />
              ))}
            </div>
          </SortableContext>
        </section>

        {/* CATEGORIES GRID */}
        <section className={`px-6 flex-1 pt-4 pb-8 overflow-y-auto hide-scrollbar z-10 relative transition-all duration-500 ${mode === "income" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}`}>
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black text-slate-500 uppercase">Категории</h2>
              <button className="text-slate-500 hover:text-white"><Settings size={14} /></button>
            </div>
            <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-y-6 gap-x-2">
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
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>

          {transactions.length > 0 && (
            <div className="mt-6 glass-card p-5 mb-4">
              <h2 className="text-[10px] font-black text-slate-500 uppercase mb-4">Recent</h2>
              <div className="flex flex-col gap-4">
                {transactions.slice(0, 5).map(tx => {
                  const isExp = tx.type === "expense";
                  const isTrans = tx.type === "transfer";
                  const item = isExp
                    ? categories.find(c => c.id === tx.targetId)
                    : isTrans
                      ? accounts.find(a => a.id === tx.targetId)
                      : incomes.find(i => i.id === tx.targetId);
                  const Icon = item ? IconMap[item.icon] : Wallet;
                  return (
                    <div key={tx.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center" style={{ color: item?.color }}>
                          <Icon size={18} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{item?.name}</span>
                            {tx.tag && <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-500 font-bold uppercase">{tx.tag}</span>}
                            {isTrans && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 rounded text-emerald-500 font-bold uppercase">Transfer</span>}
                          </div>
                          <span className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${isExp ? "text-[#D4AF37]" : "text-[#10b981]"}`}>
                        {isExp ? "-" : isTrans ? "⇄" : "+"}${tx.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease-out" }}>
          {activeDragId ? (
            <div className="draggable-coin grabbed-elevation pointer-events-none">
              {React.createElement(IconMap[(activeItemData as Account | IncomeSource | Category)?.icon] || Wallet, { size: 28, color: (activeItemData as Account | IncomeSource | Category)?.color })}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Numpad
        data={numpad}
        onClose={() => setNumpad({ ...numpad, isOpen: false, targetLinked: true })}
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

          if (val === "C") {
            // Clear active field; if linked also clear target
            return p.targetLinked
              ? { ...p, amount: "0", targetAmount: "0" }
              : { ...p, [key]: "0" };
          }
          if (val === "=") {
            const evaluated = safeEval(curr);
            return p.targetLinked && isSource
              ? { ...p, amount: evaluated, targetAmount: evaluated }
              : { ...p, [key]: evaluated };
          }

          const newVal = curr === "0" && !isNaN(Number(val)) ? val : curr + val;
          // If linked and editing source — mirror to targetAmount too
          return p.targetLinked && isSource
            ? { ...p, amount: newVal, targetAmount: newVal }
            : { ...p, [key]: newVal };
        })}
        onDelete={() => setNumpad(p => {
          const isSource = p.activeField === "source";
          const key = isSource ? "amount" : "targetAmount";
          const curr = p[key];
          const newVal = curr.length > 1 ? curr.slice(0, -1) : "0";
          // If linked and editing source — mirror delete to targetAmount too
          return p.targetLinked && isSource
            ? { ...p, amount: newVal, targetAmount: newVal }
            : { ...p, [key]: newVal };
        })}
        onTagSelect={(tag) => setNumpad(p => ({ ...p, tag }))}
        onCommentChange={(comment) => setNumpad(p => ({ ...p, comment }))}
        onSubmit={(date?: string) => {
          const finalAmount = parseFloat(safeEval(numpad.amount));
          const finalTarget = parseFloat(safeEval(numpad.targetAmount));
          addTransaction(numpad.type, numpad.source!, numpad.destination!, finalAmount, finalTarget, numpad.tag || undefined, date, numpad.comment || undefined);
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
                  {new Date(conflictData.timestamp).toLocaleString()}
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

      {confirmDelete.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in">
          <div className="glass-panel w-full max-w-xs p-8 flex flex-col items-center gap-6 text-center border-[#f43f5e]/20">
            <div className="w-16 h-16 rounded-full bg-[#f43f5e]/10 flex items-center justify-center text-[#f43f5e]">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Are you sure?</h3>
              <p className="text-sm text-slate-500 text-center">This will permanently delete your wallet.</p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <button onClick={() => setConfirmDelete({ isOpen: false, onConfirm: () => { } })} className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 font-bold">CANCEL</button>
              <button onClick={confirmDelete.onConfirm} className="flex-1 h-12 rounded-xl bg-[#f43f5e] font-bold shadow-lg">DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
