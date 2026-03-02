// CoinLover - Modern Personal Finance App
import * as React from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import {
  Plus, Settings, CircleDollarSign, TrendingDown, ChevronRight, TrendingUp, AlertCircle, CloudDownload, CloudUpload, AlertTriangle, Wallet
} from "lucide-react";

// Modules
import { Account, NumpadData } from "./types";
import { IconMap, DEFAULT_CATEGORIES, INITIAL_INCOMES } from "./constants";
import { useFinance } from "./hooks/useFinance";
import { AccountItem } from "./components/AccountItem";
import { CategoryItem } from "./components/CategoryItem";
import { Numpad } from "./components/Numpad";
import { AccountModal } from "./components/AccountModal";
import { DraggableIncomeItem } from "./components/DraggableIncomeItem";

const initialAccounts: Account[] = [
  { id: "acc-1", name: "Main Card", balance: 2450, color: "#6d5dfc", icon: "card" },
  { id: "acc-2", name: "Cash", balance: 320, color: "#10b981", icon: "wallet" },
  { id: "acc-3", name: "Savings", balance: 10500, color: "#8b5cf6", icon: "savings" },
];

export default function App() {
  const { 
    accounts, setAccounts, categories, setCategories, incomes, setIncomes,
    transactions, syncStatus, conflictData, 
    addTransaction, saveAccount, deleteAccount, resolveConflict 
  } = useFinance(initialAccounts);

  const [mode, setMode] = React.useState<"expense" | "income">("expense");
  const [isIncomeCollapsed, setIsIncomeCollapsed] = React.useState(true);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [activeDragType, setActiveDragType] = React.useState<any>(null);
  const [isSortingMode, setIsSortingMode] = React.useState(false);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = React.useState(false);

  const [numpad, setNumpad] = React.useState<NumpadData>({
    isOpen: false, type: "expense", source: null, destination: null, amount: "0", tag: null
  });

  const [accountModal, setAccountModal] = React.useState<{ isOpen: boolean; account: Account | null }>({
    isOpen: false, account: null
  });

  const [confirmDelete, setConfirmDelete] = React.useState<{ isOpen: boolean; onConfirm: () => void }>({
    isOpen: false, onConfirm: () => {}
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 2 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 2, delay: 0 } })
  );

  const toggleIncome = () => {
    const next = !isIncomeCollapsed;
    setIsIncomeCollapsed(next);
    setMode(next ? "expense" : "income");
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
    setActiveDragType(e.active.data.current?.type);
    setHasMovedDuringDrag(false);
  };

  const handleDragOver = (e: DragOverEvent) => {
    if (!isSortingMode) return;
    const { active, over } = e;
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
    const { active, over } = e;
    const sorting = isSortingMode;
    const moved = hasMovedDuringDrag;
    setActiveDragId(null); setActiveDragType(null); setIsSortingMode(false);

    if (!over) {
      if (sorting && !moved && active.data.current?.type === "account") setAccountModal({ isOpen: true, account: active.data.current.account });
      return;
    }

    if (!sorting) {
      if (active.data.current?.type === "account") {
        if (over.data.current?.type === "category") setNumpad({ isOpen: true, type: "expense", source: active.data.current.account, destination: over.data.current.category, amount: "0", tag: over.data.current.category.tags[0] });
        else if (over.data.current?.type === "account" && active.id !== over.id) setNumpad({ isOpen: true, type: "transfer", source: active.data.current.account, destination: over.data.current.account, amount: "0", tag: null });
      } else if (active.data.current?.type === "income" && over.data.current?.type === "account") {
        setNumpad({ isOpen: true, type: "income", source: active.data.current.income, destination: over.data.current.account, amount: "0", tag: null });
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
        setConfirmDelete({ isOpen: false, onConfirm: () => {} });
      }
    });
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalSpent = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const activeItemData = activeDragType === "account" ? accounts.find(a => a.id === activeDragId) : (activeDragType === "income" ? incomes.find(i => i.id === activeDragId) : categories.find(c => c.id === activeDragId));

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden bg-[#050505] text-white font-sans touch-none select-none text-left">
      <style>{`body { overflow: hidden; overscroll-behavior: none; } * { -webkit-tap-highlight-color: transparent; }`}</style>

      {/* Sync Status */}
      <div className="absolute top-4 right-4 z-50">
        <div className={`w-2 h-2 rounded-full transition-all duration-500 ${syncStatus === 'loading' ? "bg-amber-400 animate-pulse" : syncStatus === 'success' ? "bg-emerald-500/50" : syncStatus === 'error' ? "bg-rose-500" : "bg-white/10"}`} />
      </div>

      {/* Conflict UI */}
      {conflictData && (
        <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[#121212] w-full max-w-sm rounded-[32px] border border-white/10 p-8 shadow-2xl text-center text-white">
            <AlertCircle size={32} className="text-amber-500 mx-auto mb-6" />
            <h3 className="text-xl font-black uppercase mb-2 text-white">Sync Mismatch</h3>
            <p className="text-slate-500 text-sm mb-10 px-2 text-center text-white">Data in Google Sheets differs from your local data.</p>
            <div className="space-y-4 text-white">
              <button onClick={() => resolveConflict('cloud')} className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 px-6 text-white text-left"><CloudDownload className="text-emerald-500" /><div><p className="font-bold text-sm text-white">Use Cloud Data</p><p className="text-[10px] text-slate-500 uppercase text-left">Sheets → Phone</p></div></button>
              <button onClick={() => resolveConflict('local')} className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 px-6 text-white text-left text-white"><CloudUpload className="text-[#6d5dfc]" /><div><p className="font-bold text-sm text-white text-left">Use Local Data</p><p className="text-[10px] text-slate-500 uppercase text-left text-white">Phone → Sheets</p></div></button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-8 flex flex-col gap-6 text-center shrink-0 text-white">
        <div className="flex justify-between items-center text-white text-left">
          <div className="glass-icon-btn w-10 h-10 text-white"><CircleDollarSign size={20} className="text-[#6d5dfc]" /></div>
          <div className="glass-icon-btn w-10 h-10 text-slate-500 text-white"><Settings size={20} /></div>
        </div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide text-white">Total Balance</p>
        <h1 className="text-5xl font-extrabold tracking-tight text-white">${totalBalance.toLocaleString()}</h1>
        <div className="mt-2 mx-auto px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 w-fit text-left text-white"><TrendingDown size={14} className="text-[#f43f5e]" /><span className="text-xs font-medium text-[#f43f5e]">-${totalSpent.toLocaleString()} this month</span></div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* INCOME STRIPE */}
        <section className={`px-0 overflow-hidden transition-all duration-500 bg-white/[0.01] shrink-0 ${isIncomeCollapsed ? "max-h-0 opacity-0 border-none" : "max-h-[160px] opacity-100 border-b border-white/5 py-1"}`}>
          <div onClick={toggleIncome} className="px-6 py-2 flex justify-between items-center cursor-pointer hover:bg-white/5 group text-white text-left">
            <div className="flex items-center gap-2 text-white"><ChevronRight size={14} className="text-slate-500 rotate-90 text-white" /><h2 className="text-[10px] font-black text-slate-500 uppercase group-hover:text-white text-white text-left">Доходы</h2></div>
            <button className="text-slate-500 hover:text-white text-white"><Plus size={14} /></button>
          </div>
          <SortableContext items={incomes.map(i=>i.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2 text-white">
              {incomes.map(inc => <DraggableIncomeItem key={inc.id} income={inc} isDragging={activeDragId === inc.id} onSortingMode={() => setIsSortingMode(true)} isSortingMode={isSortingMode} />)}
            </div>
          </SortableContext>
        </section>

        {/* WALLETS STRIPE */}
        <section className="px-0 py-2 relative z-20 shrink-0 text-white text-left text-white">
          <div className="px-6 mb-3 flex justify-between items-center text-left text-white text-left text-white">
            <div className="flex items-center gap-2 text-left text-white text-left text-white"><h2 className="text-[10px] font-black text-slate-500 uppercase text-white">Кошельки</h2><button onClick={toggleIncome} className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${mode === 'income' ? 'bg-[#10b981] text-white shadow-lg' : 'bg-white/10 text-slate-500'}`}><TrendingUp size={12} strokeWidth={3} /></button></div>
            <button onClick={() => setAccountModal({ isOpen: true, account: null })} className="text-slate-500 hover:text-white text-white"><Plus size={16} /></button>
          </div>
          <SortableContext items={accounts.map(a => a.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2 items-center text-white text-white">
              {accounts.map(acc => (
                <AccountItem 
                  key={acc.id} account={acc} isDragging={activeDragId === acc.id} 
                  onSortingMode={() => setIsSortingMode(true)} 
                  activeDragType={activeDragType} isSortingMode={isSortingMode} 
                />
              ))}
              <div onClick={() => setAccountModal({ isOpen: true, account: null })} className="flex flex-col items-center gap-3 min-w-[72px] cursor-pointer group shrink-0 text-white text-left text-white text-white text-white"><div className="w-16 h-16 rounded-full border border-dashed border-white/10 flex items-center justify-center text-white/20 group-hover:bg-white/5 transition-all text-white"><Plus size={24} /></div><span className="text-[10px] font-bold text-slate-500 uppercase text-white text-left">Add</span></div>
            </div>
          </SortableContext>
        </section>

        {/* CATEGORIES GRID */}
        <section className={`px-6 flex-1 pt-4 pb-8 overflow-y-auto hide-scrollbar z-10 relative transition-all duration-500 text-white text-left ${mode === 'income' ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
          <div className="glass-panel p-6 text-white text-left text-white text-white">
            <div className="flex justify-between items-center mb-6 text-left text-white text-white text-white"><h2 className="text-[10px] font-black text-slate-500 uppercase text-white text-left text-white">Категории</h2><button className="text-slate-500 hover:text-white text-white"><Settings size={14} /></button></div>
            <SortableContext items={categories.map(c=>c.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-y-6 gap-x-2 text-white text-white">
                {categories.map(cat => {
                  const spent = transactions.filter(t => t.type === 'expense' && t.targetId === cat.id).reduce((s, t) => s + t.amount, 0);
                  return <CategoryItem key={cat.id} category={cat} spent={spent} isDragging={activeDragId === cat.id} onSortingMode={() => setIsSortingMode(true)} isSortingMode={isSortingMode} />;
                })}
              </div>
            </SortableContext>
          </div>
          
          {transactions.length > 0 && (
            <div className="mt-6 glass-card p-5 mb-4 text-white text-left text-white text-white text-white">
              <h2 className="text-[10px] font-black text-slate-500 uppercase mb-4 text-left text-white text-white text-white">Recent</h2>
              <div className="flex flex-col gap-4 text-white">
                {transactions.slice(0, 5).map(tx => {
                  const isExp = tx.type === 'expense'; const isTrans = tx.type === 'transfer';
                  const item = isExp ? categories.find(c => c.id === tx.targetId) : (isTrans ? accounts.find(a => a.id === tx.targetId) : incomes.find(i => i.id === tx.targetId));
                  const Icon = item ? IconMap[item.icon] : Wallet;
                  return (
                    <div key={tx.id} className="flex justify-between items-center text-left text-white text-white text-white text-white text-white text-white">
                      <div className="flex items-center gap-3 text-left text-white text-white text-white text-white text-white"><div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white" style={{ color: item?.color }}><Icon size={18} /></div><div className="flex flex-col text-left text-white text-white text-white text-white text-white"><div className="flex items-center gap-2 text-left text-white text-white text-white text-white text-white"><span className="text-sm font-semibold text-white text-white text-white">{item?.name}</span>{tx.tag && <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-500 font-bold uppercase text-white text-white">{tx.tag}</span>}{isTrans && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 rounded text-emerald-500 font-bold uppercase text-white text-emerald-500 text-white text-emerald-500">Transfer</span>}</div><span className="text-xs text-slate-500 text-left text-white text-white">{new Date(tx.date).toLocaleDateString()}</span></div></div>
                      <span className={`text-sm font-bold text-white text-white ${isExp ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}>{isExp ? '-' : (isTrans ? '⇄' : '+')}${tx.amount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
          {activeDragId ? (<div className="draggable-coin scale-110 shadow-2xl border-[#6d5dfc] text-white text-white text-white">{React.createElement(IconMap[(activeItemData as any)?.icon] || Wallet, { size: 28, color: (activeItemData as any)?.color })}</div>) : null}
        </DragOverlay>
      </DndContext>

      <Numpad 
        data={numpad} 
        onClose={() => setNumpad({ ...numpad, isOpen: false })} 
        onPress={(val) => setNumpad(p => ({...p, amount: p.amount === '0' ? val : p.amount + val}))}
        onDelete={() => setNumpad(p => ({...p, amount: p.amount.length > 1 ? p.amount.slice(0, -1) : '0'}))}
        onTagSelect={(tag) => setNumpad(p => ({ ...p, tag }))}
        onSubmit={() => {
          addTransaction(numpad.type, numpad.source, numpad.destination, parseFloat(numpad.amount), numpad.tag || undefined);
          setNumpad({ ...numpad, isOpen: false, amount: "0" });
        }}
      />

      <AccountModal 
        isOpen={accountModal.isOpen} 
        account={accountModal.account} 
        onClose={() => setAccountModal({ isOpen: false, account: null })} 
        onSave={(name:any, balance:any, icon:any, color:any) => {
          saveAccount({ ...accountModal.account, name, balance, icon, color });
          setAccountModal({ isOpen: false, account: null });
        }} 
        onDelete={handleDeleteTrigger} 
      />

      {confirmDelete.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in text-white text-left">
          <div className="glass-panel w-full max-w-xs p-8 flex flex-col items-center gap-6 text-center border-[#f43f5e]/20 text-white text-left text-white text-white text-left text-white text-white text-left">
            <div className="w-16 h-16 rounded-full bg-[#f43f5e]/10 flex items-center justify-center text-[#f43f5e] text-white text-white text-left text-white text-white text-left"><AlertTriangle size={32} /></div>
            <div className="text-white text-white text-center text-white text-left text-white text-white text-center text-white text-left"><h3 className="text-xl font-bold text-white text-white text-center text-white text-white text-white text-white">Are you sure?</h3><p className="text-sm text-slate-500 text-center text-white text-white text-left">This will permanently delete your wallet.</p></div>
            <div className="flex w-full gap-3 mt-2 text-white text-white text-white text-left">
              <button onClick={() => setConfirmDelete({isOpen:false, onConfirm:()=>{}})} className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 font-bold text-white text-white text-white text-white text-left">CANCEL</button>
              <button onClick={confirmDelete.onConfirm} className="flex-1 h-12 rounded-xl bg-[#f43f5e] font-bold shadow-lg text-white text-white text-white text-white text-left">DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
