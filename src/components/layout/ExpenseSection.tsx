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
  const totalItems = categories.length + 1;
  const rowsCount = Math.ceil(totalItems / 4);
  const isCompact = rowsCount > 2;
  const catIconSize = isCompact ? 44 : 50;

  return (
    <section className={`px-0 flex-1 pt-3 pb-8 overflow-y-auto hide-scrollbar z-10 relative transition-all duration-300 ${mode === "income" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}`}>
      <div className="px-6 py-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[9px] font-black tracking-[0.2em] text-[var(--text-muted)] uppercase opacity-80">Расходы</h2>
        </div>

        <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
          <div 
            className="grid grid-cols-4 pb-2"
            style={{ 
              gap: 'var(--grid-gap)',
              gridAutoRows: 'auto'
            }}
          >
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
                  iconSize={catIconSize}
                />
              );
            })}
            
            {/* Инлайновая кнопка создания новой категории */}
            <div
              onClick={() => setCategoryModal({ isOpen: true, category: null })}
              className="relative flex flex-col items-center gap-1 justify-start transition-all duration-300 cursor-pointer opacity-60 hover:opacity-100 hover:scale-105 active:scale-95 group w-full"
            >
              <div className="flex items-center justify-center transition-all duration-300 relative">
                <div 
                  style={{ width: `${catIconSize}px`, height: `${catIconSize}px` }} 
                  className="rounded-full border border-dashed border-[var(--glass-border-highlight)] flex items-center justify-center bg-[rgba(255,255,255,0.01)] transition-colors group-hover:bg-[rgba(255,255,255,0.04)] shadow-inner"
                >
                  <Plus size={isCompact ? 16 : 20} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
                </div>
              </div>
              <div className="flex flex-col items-center pointer-events-none select-none w-full pt-1">
                <span className="font-label text-[9px] uppercase tracking-[0.12em] text-center leading-tight break-words line-clamp-2 w-full px-0.5 font-black text-[var(--on-surface-variant)] group-hover:text-[var(--text-main)] transition-colors">
                  Создать
                </span>
              </div>
            </div>
          </div>
        </SortableContext>
      </div>
    </section>
  );
}
