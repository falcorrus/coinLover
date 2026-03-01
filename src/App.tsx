// CoinLover - Modern Personal Finance App
import * as React from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Wallet,
  CreditCard,
  PiggyBank,
  Utensils,
  Bus,
  Coffee,
  Home,
  PlaySquare,
  ShoppingBag,
  HeartPulse,
  MoreHorizontal,
  Plus,
  Settings,
  Delete,
  X,
  ArrowRightLeft,
  CircleDollarSign,
  Briefcase,
  TrendingDown,
  ChevronRight,
  Check,
  MessageCircle,
  RefreshCw,
  Minus,
  Percent,
  Equal,
  Divide,
  CalendarDays,
  Gift,
  TrendingUp,
  Laptop,
  AlertTriangle,
  Trash2
} from "lucide-react";

// === TYPES ===
interface Account {
  id: string;
  name: string;
  balance: number;
  color: string;
  icon: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  tags: string[];
}

interface IncomeSource {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Transaction {
  id: string;
  type: "expense" | "income";
  accountId: string;
  targetId: string;
  amount: number;
  date: string;
  tag?: string;
}

// === ICON MAP ===
const IconMap: Record<string, React.FC<any>> = {
  wallet: Wallet,
  card: CreditCard,
  savings: PiggyBank,
  food: Utensils,
  transit: Bus,
  cafe: Coffee,
  rent: Home,
  subs: PlaySquare,
  shop: ShoppingBag,
  health: HeartPulse,
  more: MoreHorizontal,
  business: Briefcase,
  gift: Gift,
  trendingUp: TrendingUp,
  laptop: Laptop
};

// === INITIAL DATA ===
const initialAccounts: Account[] = [
  { id: "acc-1", name: "Main Card", balance: 2450, color: "#6d5dfc", icon: "card" },
  { id: "acc-2", name: "Cash", balance: 320, color: "#10b981", icon: "wallet" },
  { id: "acc-3", name: "Savings", balance: 10500, color: "#8b5cf6", icon: "savings" },
];

const defaultCategories: Category[] = [
  { id: "cat-1", name: "Food", color: "#f43f5e", icon: "food", tags: ["Lunch", "Dinner", "Snacks", "Grocery"] },
  { id: "cat-2", name: "Transit", color: "#3b82f6", icon: "transit", tags: ["Taxi", "Bus", "Fuel", "Parking"] },
  { id: "cat-3", name: "Cafe", color: "#f59e0b", icon: "cafe", tags: ["Coffee", "Dessert", "Bar"] },
  { id: "cat-4", name: "Rent", color: "#8b5cf6", icon: "rent", tags: ["Rent", "Electricity", "Water", "Internet"] },
  { id: "cat-5", name: "Subs", color: "#ec4899", icon: "subs", tags: ["Netflix", "Spotify", "Cloud", "Gym"] },
  { id: "cat-6", name: "Shopping", color: "#06b6d4", icon: "shop", tags: ["Clothes", "Tech", "Home", "Gift"] },
  { id: "cat-7", name: "Health", color: "#10b981", icon: "health", tags: ["Pharma", "Doctor", "Tests"] },
  { id: "cat-8", name: "More", color: "#64748b", icon: "more", tags: ["Fees", "Donation", "Fine"] },
];

const initialIncomes: IncomeSource[] = [
  { id: "inc-1", name: "Salary", color: "#10b981", icon: "business" },
  { id: "inc-2", name: "Freelance", color: "#3b82f6", icon: "laptop" },
  { id: "inc-3", name: "Gifts", color: "#f43f5e", icon: "gift" },
  { id: "inc-4", name: "Dividends", color: "#8b5cf6", icon: "trendingUp" },
];

export default function App() {
  const [accounts, setAccounts] = React.useState<Account[]>(() => {
    const saved = localStorage.getItem("cl_accounts");
    return saved ? JSON.parse(saved) : initialAccounts;
  });

  const [categories, setCategories] = React.useState<Category[]>(() => {
    const saved = localStorage.getItem("cl_categories");
    return saved ? JSON.parse(saved) : defaultCategories;
  });

  const [transactions, setTransactions] = React.useState<Transaction[]>(() => {
    const saved = localStorage.getItem("cl_transactions");
    return saved ? JSON.parse(saved) : [];
  });

  const [mode, setMode] = React.useState<"expense" | "income">("expense");
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [activeDragType, setActiveDragType] = React.useState<"account" | "income" | "category" | null>(null);
  
  const [numpadData, setNumpadData] = React.useState<{
    isOpen: boolean;
    type: "expense" | "income";
    source: Account | IncomeSource | null;
    destination: Account | Category | null;
    amount: string;
    tag: string | null;
  }>({
    isOpen: false,
    type: "expense",
    source: null,
    destination: null,
    amount: "0",
    tag: null,
  });

  const [accountModal, setAccountModal] = React.useState<{
    isOpen: boolean;
    account: Account | null;
  }>({
    isOpen: false,
    account: null,
  });

  const [confirmDelete, setConfirmDelete] = React.useState<{
    isOpen: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    onConfirm: () => {},
  });

  React.useEffect(() => {
    localStorage.setItem("cl_accounts", JSON.stringify(accounts));
  }, [accounts]);

  React.useEffect(() => {
    localStorage.setItem("cl_categories", JSON.stringify(categories));
  }, [categories]);

  React.useEffect(() => {
    localStorage.setItem("cl_transactions", JSON.stringify(transactions));
  }, [transactions]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const openEditAccount = (account: Account) => {
    setAccountModal({ isOpen: true, account });
  };

  const saveAccount = (name: string, balance: number, icon: string, color: string) => {
    if (accountModal.account) {
      setAccounts(accounts.map(acc => acc.id === accountModal.account!.id ? { ...acc, name, balance, icon, color } : acc));
    } else {
      const newAccount: Account = { id: `acc-${Date.now()}`, name, balance, color, icon };
      setAccounts([...accounts, newAccount]);
    }
    setAccountModal({ isOpen: false, account: null });
  };

  const handleDeleteTrigger = () => {
    setConfirmDelete({
      isOpen: true,
      onConfirm: () => {
        if (accountModal.account) {
          setAccounts(accounts.filter(acc => acc.id !== accountModal.account!.id));
          setAccountModal({ isOpen: false, account: null });
        }
        setConfirmDelete(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setActiveDragType(event.active.data.current?.type as any);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragType(null);

    if (!over) return;

    // SORTING LOGIC
    if (active.data.current?.type === over.data.current?.type) {
      if (active.data.current?.type === "account") {
        setAccounts((items) => {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
        return;
      }
      if (active.data.current?.type === "category") {
        setCategories((items) => {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
        return;
      }
    }

    // TRANSACTION LOGIC
    if (mode === "expense" && active.data.current?.type === "account" && over.data.current?.type === "category") {
      const category = over.data.current?.category as Category;
      setNumpadData({ 
        isOpen: true, 
        type: "expense", 
        source: active.data.current?.account, 
        destination: category, 
        amount: "0",
        tag: category.tags[0] || null
      });
    } else if (mode === "income" && active.data.current?.type === "income" && over.data.current?.type === "account") {
      setNumpadData({ 
        isOpen: true, 
        type: "income", 
        source: active.data.current?.income, 
        destination: over.data.current?.account, 
        amount: "0",
        tag: null
      });
    }
  };

  const handleNumpadPress = (val: string) => {
    setNumpadData((prev) => {
      if (prev.amount === "0" && val !== ".") return { ...prev, amount: val };
      if (prev.amount.includes(".") && val === ".") return prev;
      if (prev.amount.replace(".", "").length >= 8) return prev;
      return { ...prev, amount: prev.amount + val };
    });
  };

  const handleNumpadDelete = () => {
    setNumpadData((prev) => ({ ...prev, amount: prev.amount.length > 1 ? prev.amount.slice(0, -1) : "0" }));
  };

  const submitTransaction = async () => {
    const amountNum = parseFloat(numpadData.amount);
    if (amountNum > 0 && numpadData.source && numpadData.destination) {
      const isExpense = numpadData.type === 'expense';
      const date = new Date().toISOString();
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        type: numpadData.type,
        accountId: isExpense ? numpadData.source.id : (numpadData.destination as Account).id,
        targetId: isExpense ? numpadData.destination.id : numpadData.source.id,
        amount: amountNum,
        date,
        tag: numpadData.tag || undefined,
      };
      setTransactions([newTransaction, ...transactions]);
      setAccounts(accounts.map((acc) => {
        if (isExpense && acc.id === numpadData.source!.id) return { ...acc, balance: acc.balance - amountNum };
        if (!isExpense && acc.id === (numpadData.destination as Account).id) return { ...acc, balance: acc.balance + amountNum };
        return acc;
      }));
      fetch("https://script.google.com/macros/s/AKfycbwKZ0MPk8EJv-EKOeXfJL7PDVMYPvuNUSt1mRFVkAHBBY7oXAc4tITgLdEkmeco537B/exec", {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          date, 
          type: numpadData.type, 
          sourceName: numpadData.source.name, 
          destinationName: numpadData.destination.name, 
          tagName: numpadData.tag || "",
          amount: amountNum 
        }),
      }).catch(error => console.error("Sync failed:", error));
    }
    setNumpadData({ ...numpadData, isOpen: false, amount: "0", tag: null });
  };

  const getActiveItem = () => {
    if (activeDragType === "account") return accounts.find(a => a.id === activeDragId);
    if (activeDragType === "category") return categories.find(c => c.id === activeDragId);
    if (activeDragType === "income") return initialIncomes.find(i => i.id === activeDragId);
    return null;
  };
  const activeItemData = getActiveItem();

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden bg-[#050505]">
      <header className="px-6 py-8 flex flex-col gap-6 shrink-0">
        <div className="flex justify-between items-center">
          <div className="glass-icon-btn w-10 h-10"><CircleDollarSign size={20} className="text-[#6d5dfc]" /></div>
          <div className="glass-icon-btn w-10 h-10"><Settings size={20} className="text-[var(--text-muted)]" /></div>
        </div>
        <div className="flex flex-col items-center justify-center pt-2 pb-4">
          <p className="text-sm font-medium text-[var(--text-muted)] tracking-wide uppercase mb-1">Total Balance</p>
          <h1 className="text-5xl font-extrabold tracking-tight">${totalBalance.toLocaleString("en-US")}</h1>
          <div className="mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
            <TrendingDown size={14} className="text-[#f43f5e]" />
            <span className="text-xs font-medium text-[#f43f5e]">-${totalSpent.toLocaleString("en-US")} this month</span>
          </div>
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* INCOME STRIPE */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${mode === 'income' ? 'max-h-[140px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <section className="px-0 py-2 bg-gradient-to-b from-[#10b981]/10 to-transparent">
            <div className="px-6 mb-3 flex justify-between items-center cursor-pointer active:opacity-60 transition-opacity" onClick={() => setMode('expense')}>
              <h2 className="text-xs font-bold text-[#10b981] tracking-widest uppercase flex items-center gap-2">Источники доходов <X size={12} className="opacity-50" /></h2>
              <button className="text-[#10b981] hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}><Plus size={16} /></button>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">
              {initialIncomes.map((income) => {
                const incTotal = transactions.filter(t => t.type === 'income' && t.targetId === income.id).reduce((sum, t) => sum + t.amount, 0);
                return <DraggableIncome key={income.id} income={income} earned={incTotal} isDragging={activeDragId === income.id} />;
              })}
              <div className="flex flex-col items-center gap-3 min-w-[72px]">
                <button onClick={() => {}} className="w-16 h-16 rounded-full border border-dashed border-[#10b981]/30 flex items-center justify-center text-[#10b981]/50 cursor-pointer hover:bg-[#10b981]/10 transition-colors"><Plus size={24} /></button>
                <span className="text-xs font-medium text-[var(--text-muted)]">Add</span>
              </div>
            </div>
          </section>
        </div>

        {/* WALLETS STRIPE */}
        <section className="px-0 py-2 relative z-20 shrink-0">
          <div className="px-6 mb-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase">Кошельки</h2>
              <button onClick={() => setMode(mode === 'expense' ? 'income' : 'expense')} className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${mode === 'income' ? 'bg-[#10b981] text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10 text-[var(--text-muted)] hover:bg-white/20'}`}>
                <TrendingUp size={12} strokeWidth={3} />
              </button>
            </div>
            <button onClick={() => setAccountModal({ isOpen: true, account: null })} className="text-[var(--text-muted)] hover:text-white transition-colors"><Plus size={16} /></button>
          </div>
          <SortableContext items={accounts.map(a => a.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2 items-center">
              {accounts.map((account) => (
                <SortableAccount key={account.id} account={account} isDragging={activeDragId === account.id} onLongPress={openEditAccount} mode={mode} activeDragType={activeDragType} />
              ))}
              <div onClick={() => setAccountModal({ isOpen: true, account: null })} className="flex flex-col items-center gap-3 min-w-[72px] group cursor-pointer shrink-0">
                <div className="w-16 h-16 rounded-full border border-dashed border-white/10 flex items-center justify-center text-white/20 group-hover:bg-white/5 transition-all"><Plus size={24} /></div>
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Add</span>
              </div>
            </div>
          </SortableContext>
        </section>

        {/* CATEGORIES GRID */}
        <section className={`px-6 flex-1 pt-4 pb-8 overflow-y-auto hide-scrollbar z-10 relative transition-all duration-500 ${mode === 'income' ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase">Категории</h2>
              <button className="text-[var(--text-muted)] hover:text-white transition-colors"><Settings size={14} /></button>
            </div>
            <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                {categories.map((category) => {
                  const catTotal = transactions.filter(t => t.type === 'expense' && t.targetId === category.id).reduce((sum, t) => sum + t.amount, 0);
                  return <SortableCategory key={category.id} category={category} spent={catTotal} />;
                })}
              </div>
            </SortableContext>
          </div>
          {transactions.length > 0 && (
             <div className="mt-6 glass-card p-5">
              <h2 className="text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase mb-4 text-left px-1">Recent</h2>
              <div className="flex flex-col gap-4">
                {transactions.slice(0, 5).map(tx => {
                  const isExp = tx.type === 'expense';
                  const item = isExp ? categories.find(c => c.id === tx.targetId) : initialIncomes.find(i => i.id === tx.targetId);
                  const Icon = item ? IconMap[item.icon] : Wallet;
                  return (
                    <div key={tx.id} className="flex justify-between items-center px-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center" style={{ color: item?.color }}><Icon size={18} /></div>
                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{item?.name}</span>
                            {tx.tag && <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-[var(--text-muted)] font-bold uppercase tracking-tight">{tx.tag}</span>}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">{new Date(tx.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${isExp ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}>{isExp ? '-' : '+'}${tx.amount}</span>
                    </div>
                  );
                })}
              </div>
             </div>
          )}
        </section>

        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeItemData ? (
            <div className={`draggable-coin scale-110 shadow-[0_10px_40px_rgba(109,93,252,0.4)] ${activeDragType === 'category' ? 'rounded-[20px] w-[52px] h-[52px]' : ''}`}>
              {React.createElement(IconMap[activeItemData.icon] || Wallet, { size: activeDragType === 'category' ? 22 : 28, color: activeItemData.color })}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* NUMPAD */}
      {numpadData.isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-between items-center px-4 py-4 bg-[#121212] border-b border-white/5">
            <button onClick={() => setNumpadData({ ...numpadData, isOpen: false })} className="p-2 text-[var(--text-muted)] hover:text-white transition-colors"><X size={24} /></button>
            <div className="flex items-center gap-3 text-sm font-semibold tracking-wide">
              <span className="text-[var(--text-muted)] uppercase tracking-widest leading-none">{numpadData.source?.name}</span>
              <ChevronRight size={16} className={numpadData.type === 'expense' ? "text-[#f43f5e]" : "text-[#10b981]"} />
              <div className="flex flex-col items-center">
                <span className="text-white uppercase tracking-widest leading-none">{numpadData.destination?.name}</span>
                {numpadData.tag && <span className="text-[9px] text-[#10b981] font-black uppercase tracking-widest mt-1">{numpadData.tag}</span>}
              </div>
            </div>
            <button onClick={submitTransaction} disabled={numpadData.amount === "0" || numpadData.amount === "0."} className="p-2 text-[#10b981] hover:text-white transition-colors disabled:opacity-30"><Check size={26} /></button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-4 bg-[#050505]">
            <div className="w-full flex items-center gap-3">
              <div className={`flex-1 h-36 rounded-[24px] border flex flex-col items-end justify-center p-6 relative ${numpadData.type === 'expense' ? 'bg-[#f43f5e]/10 border-[#f43f5e]/20 shadow-[0_0_30px_rgba(244,63,94,0.05)]' : 'bg-[#10b981]/10 border-[#10b981]/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]'}`}>
                <span className="text-4xl sm:text-5xl font-light text-white tracking-tighter w-full text-right overflow-hidden overflow-ellipsis">{numpadData.amount}</span>
                <span className={`text-xs font-bold mt-2 absolute bottom-5 right-6 uppercase ${numpadData.type === 'expense' ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}>USD</span>
              </div>
              <ChevronRight size={24} className="text-[var(--text-muted)] shrink-0" />
              <div className="flex-1 h-36 rounded-[24px] bg-white/[0.02] border border-white/5 flex flex-col items-end justify-center p-6 relative">
                <span className="text-4xl sm:text-5xl font-light text-[var(--text-muted)] tracking-tighter w-full text-right overflow-hidden overflow-ellipsis">{numpadData.amount}</span>
                <span className="text-xs font-bold text-[var(--text-muted)] mt-2 absolute bottom-5 right-6 uppercase">BRL</span>
              </div>
            </div>
          </div>

          {/* TAGS BAR */}
          {numpadData.type === 'expense' && (
            <div className="flex items-center px-4 py-3 gap-3 bg-[#111] shrink-0 border-t border-white/5">
              <div className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                {numpadData.destination && (numpadData.destination as Category).tags.map(tag => (
                  <button 
                    key={tag} 
                    onClick={() => setNumpadData({ ...numpadData, tag })}
                    className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-all uppercase text-[10px] font-black tracking-widest ${numpadData.tag === tag ? "bg-[#10b981] text-white" : "bg-white/5 text-[var(--text-muted)]"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-[var(--text-muted)] shrink-0 active:scale-95 transition-transform">
                <MoreHorizontal size={18} />
              </button>
            </div>
          )}

          <div className="bg-[#1e1e1e] flex flex-col">
            <div className="grid grid-cols-[3fr_2fr]">
              <div className="grid grid-cols-3 bg-[#2a2a2a] gap-[1px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (<button key={num} onClick={() => handleNumpadPress(num.toString())} className="h-[72px] flex items-center justify-center text-[32px] font-light text-white hover:bg-white/5 active:bg-white/10">{num}</button>))}
                <button onClick={() => handleNumpadPress(".")} className="h-[72px] flex items-center justify-center text-[32px] font-light text-white hover:bg-white/5 active:bg-white/10">,</button>
                <button onClick={() => handleNumpadPress("0")} className="h-[72px] flex items-center justify-center text-[32px] font-light text-white hover:bg-white/5 active:bg-white/10">0</button>
                <button onClick={handleNumpadDelete} className="h-[72px] flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 active:bg-white/10"><Delete size={26} /></button>
              </div>
              <div className="grid grid-cols-2 bg-[#333] gap-[1px]">
                <button className="h-[72px] flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 active:bg-white/10"><MessageCircle size={22} /></button>
                <button className="h-[72px] flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 active:bg-white/10"><RefreshCw size={22} /></button>
                <button className="h-[72px] flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 active:bg-white/10"><Minus size={22} /></button>
                <button className="h-[72px] flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 active:bg-white/10"><Percent size={22} /></button>
                <button className="h-[72px] flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 active:bg-white/10"><Plus size={22} /></button>
                <button className="h-[72px] flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 active:bg-white/10"><X size={22} /></button>
                <button className="h-[72px] flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 active:bg-white/10"><Equal size={22} /></button>
                <button className="h-[72px] flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 active:bg-white/10"><Divide size={22} /></button>
              </div>
            </div>
            <div className={`flex h-14 ${numpadData.type === 'expense' ? 'bg-[#f43f5e]' : 'bg-[#10b981]'}`}>
              <button className="flex-1 text-white text-xs font-bold tracking-widest uppercase hover:bg-black/10 active:bg-black/20 transition-colors">Вчера</button>
              <button onClick={submitTransaction} className="flex-1 text-white text-xs font-bold tracking-widest uppercase bg-black/10 hover:bg-black/20 active:bg-black/30 transition-colors">Сегодня</button>
              <button className="w-[72px] flex items-center justify-center text-white border-l border-white/10 hover:bg-black/10 active:bg-black/20 transition-colors"><CalendarDays size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <AccountModal isOpen={accountModal.isOpen} account={accountModal.account} onClose={() => setAccountModal({ isOpen: false, account: null })} onSave={saveAccount} onDelete={handleDeleteTrigger} />
      {confirmDelete.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="glass-panel w-full max-w-xs p-8 flex flex-col items-center gap-6 text-center border-[#f43f5e]/20">
            <div className="w-16 h-16 rounded-full bg-[#f43f5e]/10 flex items-center justify-center text-[#f43f5e]"><AlertTriangle size={32} /></div>
            <div className="flex flex-col gap-2"><h3 className="text-xl font-bold">Are you sure?</h3><p className="text-sm text-[var(--text-muted)]">This will permanently delete your wallet and all its history.</p></div>
            <div className="flex w-full gap-3 mt-2">
              <button onClick={() => setConfirmDelete({ ...confirmDelete, isOpen: false })} className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors">CANCEL</button>
              <button onClick={confirmDelete.onConfirm} className="flex-1 h-12 rounded-xl bg-[#f43f5e] text-white font-bold shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-colors">DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// HELPERS
// ==========================================

const useLongPress = (callback: () => void, ms = 800) => {
  const timerRef = React.useRef<any>(null);
  const startPos = React.useRef({ x: 0, y: 0 });
  const start = (e: any) => {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    startPos.current = { x: clientX, y: clientY };
    timerRef.current = setTimeout(callback, ms);
  };
  const stop = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };
  const move = (e: any) => {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const dist = Math.sqrt(Math.pow(clientX - startPos.current.x, 2) + Math.pow(clientY - startPos.current.y, 2));
    if (dist > 10) stop();
  };
  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onPointerMove: move };
};

// ==========================================
// COMPONENTS
// ==========================================

const SortableAccount: React.FC<{ account: Account; isDragging: boolean; onLongPress?: (a: Account) => void; mode: "expense" | "income"; activeDragType: string | null; }> = ({ account, isDragging, onLongPress, mode, activeDragType }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isOver } = useSortable({ id: account.id, data: { type: "account", account } });
  const longPress = useLongPress(() => { if (!isDragging) onLongPress?.(account); });
  const Icon = IconMap[account.icon] || Wallet;
  const isIncomeTarget = isOver && mode === 'income' && activeDragType === 'income';
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 }} className={`flex flex-col items-center gap-3 min-w-[72px] transition-opacity shrink-0 ${isDragging ? "opacity-30" : "opacity-100"}`}>
      <div {...listeners} {...attributes} {...longPress} className={`draggable-coin transition-all duration-300 ${isIncomeTarget ? "bg-[#10b981]/20 border border-[#10b981]/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-110" : ""}`}><Icon size={26} color={isIncomeTarget ? "#10b981" : account.color} className="transition-colors" /></div>
      <div className="flex flex-col items-center leading-tight">
        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{account.name}</span>
        <span className={`text-[13px] font-bold ${isIncomeTarget ? "text-[#10b981]" : "text-white"}`}>${account.balance.toLocaleString("en-US")}</span>
      </div>
    </div>
  );
};

const SortableCategory: React.FC<{ category: Category; spent: number }> = ({ category, spent }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: category.id, data: { type: "category", category } });
  const Icon = IconMap[category.icon] || ShoppingBag;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 }} {...listeners} {...attributes} className={`flex flex-col items-center justify-start transition-all duration-300 ${isDragging ? "opacity-50 scale-95" : "opacity-100"}`}>
      <div className={`w-[52px] h-[52px] rounded-[20px] flex items-center justify-center mb-2 transition-all duration-300 ${isOver ? "bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white/40" : "bg-white/5 border border-white/5"}`}><Icon size={22} color={isOver ? "#fff" : category.color} className="transition-colors" /></div>
      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-center w-full truncate mb-1">{category.name}</span>
      {spent > 0 && <span className="text-[11px] font-bold text-[#f43f5e]">-${spent}</span>}
    </div>
  );
};

const DraggableIncome: React.FC<{ income: IncomeSource; isDragging: boolean; earned: number }> = ({ income, isDragging, earned }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: income.id, data: { type: "income", income } });
  const Icon = IconMap[income.icon] || Briefcase;
  return (
    <div className={`flex flex-col items-center justify-start transition-opacity duration-300 ${isDragging ? "opacity-30 scale-90" : "opacity-100"}`}>
      <div ref={setNodeRef} {...listeners} {...attributes} className="draggable-coin w-[52px] h-[52px] mb-2 cursor-grab active:cursor-grabbing border border-[#10b981]/30 bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5"><Icon size={22} color={income.color} /></div>
      <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider text-center w-full truncate mb-1">{income.name}</span>
      {earned > 0 && <span className="text-[11px] font-bold text-[#10b981]">+${earned}</span>}
    </div>
  );
};

const AccountModal: React.FC<{ isOpen: boolean; account: Account | null; onClose: () => void; onSave: (name: string, balance: number, icon: string, color: string) => void; onDelete: () => void; }> = ({ isOpen, account, onClose, onSave, onDelete }) => {
  const [name, setName] = React.useState("");
  const [balance, setBalance] = React.useState("0");
  const [icon, setIcon] = React.useState("wallet");
  const [color, setColor] = React.useState("#6d5dfc");
  React.useEffect(() => { if (isOpen) { setName(account?.name || ""); setBalance(account?.balance.toString() || "0"); setIcon(account?.icon || "wallet"); setColor(account?.color || "#6d5dfc"); } }, [isOpen, account]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-sm p-8 flex flex-col gap-6 shadow-2xl scale-in-95 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center"><h3 className="text-lg font-bold uppercase tracking-widest">{account ? "Edit Wallet" : "New Wallet"}</h3><button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors"><X size={24} /></button></div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#6d5dfc] transition-all text-white font-medium" placeholder="e.g. Cash, Visa" /></div>
          <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">Current Balance</label><input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#6d5dfc] transition-all text-white font-medium" /></div>
          <div className="flex flex-col gap-2"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">Icon</label><div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">{["wallet", "card", "savings", "business", "laptop", "trendingUp"].map(i => (
            <button key={i} onClick={() => setIcon(i)} className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all ${icon === i ? "border-[#6d5dfc] bg-[#6d5dfc]/10 text-white" : "border-white/5 bg-white/5 text-[var(--text-muted)] hover:bg-white/10"}`}>{React.createElement(IconMap[i], { size: 20 })}</button>
          ))}</div></div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">Color</label>
            <div className="flex justify-between">
              {["#6d5dfc", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4"].map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent opacity-50"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4 items-center">
          {account && (
            <button onClick={onDelete} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-[#f43f5e] flex items-center justify-center hover:bg-[#f43f5e]/10 transition-all">
              <Trash2 size={20} />
            </button>
          )}
          <button onClick={() => onSave(name, parseFloat(balance), icon, color)} className="flex-1 h-14 rounded-2xl bg-[#6d5dfc] text-white font-bold shadow-[0_0_20px_rgba(109,93,252,0.3)] hover:opacity-90 active:scale-95 transition-all">SAVE</button>
        </div>
      </div>
    </div>
  );
};
