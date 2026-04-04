import * as React from "react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { PieChart, Plus, Calendar } from "lucide-react";
import { Category, Transaction, HistoryModalState, Account } from "../../types";
import { RatesService } from "../../services/RatesService";
import { CategoryItem } from "../CategoryItem";

interface ExpenseSectionProps {
  mode: "expense" | "income";
  categories: Category[];
  accounts: Account[];
  currentMonthTransactions: Transaction[];
  categoryCurrencyMode: "base" | "local";
  setCategoryCurrencyMode: React.Dispatch<React.SetStateAction<"base" | "local">>;
  baseCurrency: string;
  baseSymbol: string;
  localCurrencyCode: string;
  localSymbol: string;
  activeDragId: string | null;
  activeDragType: string | null;
  overId: string | null;
  isSortingMode: boolean;
  setIsSortingMode: (val: boolean) => void;
  setAnalyticsModal: (val: { isOpen: boolean; type: "expense" | "income" }) => void;
  setCategoryModal: (val: { isOpen: boolean; category: Category | null }) => void;
  setHistoryModal: (val: HistoryModalState) => void;
  setCalendarAnalyticsModal: (val: { isOpen: boolean }) => void;
  theme: string;
}

export function ExpenseSection({
  mode, categories, accounts, currentMonthTransactions, categoryCurrencyMode, setCategoryCurrencyMode,
  baseCurrency, baseSymbol, localCurrencyCode, localSymbol, activeDragId, activeDragType,
  overId, isSortingMode, setIsSortingMode, setAnalyticsModal, setCategoryModal, setHistoryModal,
  setCalendarAnalyticsModal, theme
}: ExpenseSectionProps) {
  return (
    <section className={`px-0 flex-1 pt-4 pb-8 overflow-y-auto hide-scrollbar z-10 relative transition-all duration-500 ${mode === "income" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}`}>
      <div className="px-6 py-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[10px] font-black text-slate-500 uppercase">Расходы</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCategoryCurrencyMode(categoryCurrencyMode === 'base' ? 'local' : 'base')}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm ${
                categoryCurrencyMode === 'local' 
                  ? 'bg-[var(--primary-color)]/20 border-[var(--primary-color)]/30 text-[var(--primary-color)] shadow-[0_0_15px_rgba(109,93,252,0.2)]' 
                  : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] text-[var(--text-main)] hover:bg-[var(--glass-item-active)]'
              }`}
              title={categoryCurrencyMode === 'base' ? "Переключить на локальную валюту" : "Переключить на базовую валюту"}
            >
              <span className={`text-[10px] font-black uppercase tracking-tighter ${categoryCurrencyMode === 'base' ? 'opacity-60' : ''}`}>
                {categoryCurrencyMode === 'base' ? baseCurrency : localCurrencyCode}
              </span>
            </button>
            <button onClick={() => setCalendarAnalyticsModal({ isOpen: true })} className="w-10 h-10 rounded-xl bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 text-[var(--primary-color)] flex items-center justify-center hover:bg-[var(--primary-color)]/20 transition-all shadow-sm"><Calendar size={16} /></button>
            <button onClick={() => setAnalyticsModal({ isOpen: true, type: "expense" })} className="w-10 h-10 rounded-xl bg-[var(--danger-color)]/10 border border-[var(--danger-color)]/20 text-[var(--danger-color)] flex items-center justify-center hover:bg-[var(--danger-color)]/20 transition-all shadow-sm"><PieChart size={16} /></button>
            <button onClick={() => setCategoryModal({ isOpen: true, category: null })} className="w-9 h-9 rounded-xl bg-[var(--danger-color)]/10 text-[var(--danger-color)] flex items-center justify-center hover:bg-[var(--danger-color)]/20 transition-colors"><Plus size={18} /></button>
          </div>
        </div>

        <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-4">
            {categories.map(cat => {
              const catTx = currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "expense" && t.targetId === cat.id);
              const spent = Math.round(catTx.reduce((s, t) => {
                const aid = String(t.accountId || "").trim().toLowerCase();
                const account = accounts.find(a => String(a.id).trim().toLowerCase() === aid || String(a.name).trim().toLowerCase() === aid);
                const tCurr = t.targetCurrency || account?.currency || baseCurrency;
                if (categoryCurrencyMode === 'local' && tCurr === localCurrencyCode) return s + (t.targetAmount || 0);
                const sCurr = t.sourceCurrency || account?.currency || baseCurrency;
                const valBase = (t.sourceAmountUSD && t.sourceAmountUSD !== 0 && baseCurrency === 'USD')
                  ? t.targetAmountUSD || t.sourceAmountUSD
                  : RatesService.convert(t.sourceAmount || 0, sCurr, baseCurrency);
                return s + (categoryCurrencyMode === 'base' ? valBase : RatesService.convert(valBase, baseCurrency, localCurrencyCode));
              }, 0));

              return (
                <CategoryItem
                  key={cat.id}
                  category={cat}
                  spent={spent}
                  isDragging={activeDragId === cat.id}
                  activeDragType={activeDragType}
                  isOver={overId === cat.id}
                  isSortingMode={isSortingMode}
                  onLongPress={() => { setIsSortingMode(false); setCategoryModal({ isOpen: true, category: cat }); }}
                  onSortingMode={() => setIsSortingMode(true)}
                  onClick={() => setHistoryModal({ isOpen: true, entity: cat, type: "category" })}
                  currencyMode={categoryCurrencyMode}
                  currencySymbol={categoryCurrencyMode === 'base' ? baseSymbol : localSymbol}
                />
              );
            })}
          </div>
        </SortableContext>
      </div>
    </section>
  );
}
