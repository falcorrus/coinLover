import * as React from "react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { PieChart, Plus, Calendar } from "lucide-react";
import { Category, Transaction, HistoryModalState } from "../../types";
import { RatesService } from "../../services/RatesService";
import { CategoryItem } from "../CategoryItem";

interface ExpenseSectionProps {
  mode: "expense" | "income";
  categories: Category[];
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
  mode, categories, currentMonthTransactions, categoryCurrencyMode, setCategoryCurrencyMode,
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
            <button onClick={() => setCalendarAnalyticsModal({ isOpen: true })} className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-all shadow-sm"><Calendar size={14} /></button>
            <button onClick={() => setAnalyticsModal({ isOpen: true, type: "expense" })} className="w-8 h-8 rounded-xl bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 text-[var(--primary-color)] flex items-center justify-center hover:bg-[var(--primary-color)]/20 transition-all shadow-sm"><PieChart size={14} /></button>
            <button onClick={() => setCategoryModal({ isOpen: true, category: null })} className="w-8 h-8 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--text-main)] flex items-center justify-center hover:bg-[var(--glass-item-active)] transition-all shadow-sm"><Plus size={16} /></button>
          </div>
        </div>
        <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-4">
            {categories.map(cat => {
              const catTx = currentMonthTransactions.filter(t => String(t.type).toLowerCase() === "expense" && t.targetId === cat.id);
              const spent = Math.round(catTx.reduce((s, t) => {
                const tCurr = t.targetCurrency || "USD";
                if (categoryCurrencyMode === 'local' && tCurr === localCurrencyCode) return s + (t.targetAmount || 0);
                const sCurr = (t.sourceCurrency && isNaN(Number(t.sourceCurrency))) ? t.sourceCurrency : "USD";
                const valBase = (t.sourceAmountUSD && t.sourceAmountUSD !== 0 && baseCurrency === 'USD')
                  ? t.targetAmountUSD || t.sourceAmountUSD
                  : RatesService.convert(t.sourceAmount || 0, sCurr, baseCurrency);
                return s + (categoryCurrencyMode === 'base' ? valBase : RatesService.convert(valBase, baseCurrency, localCurrencyCode));
              }, 0));
              return (
                <CategoryItem 
                  key={cat.id} category={cat} spent={spent} isDragging={activeDragId === cat.id} 
                  onSortingMode={() => setIsSortingMode(true)} isSortingMode={isSortingMode} isOver={overId === cat.id} 
                  onLongPress={(c) => { setIsSortingMode(false); setCategoryModal({ isOpen: true, category: c }); }} 
                  onClick={(category) => setHistoryModal({ isOpen: true, entity: category, type: "category" })} 
                  activeDragType={activeDragType} theme={theme} currencyMode={categoryCurrencyMode}
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
