import * as React from "react";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronRight, PieChart, Plus } from "lucide-react";
import { APP_SETTINGS } from "../../constants/settings";
import { IncomeSource, Transaction, HistoryModalState } from "../../types";
import { RatesService } from "../../services/RatesService";
import { DraggableIncomeItem } from "../DraggableIncomeItem";

interface IncomeSectionProps {
  isIncomeCollapsed: boolean;
  toggleIncome: () => void;
  incomes: IncomeSource[];
  currentMonthTransactions: Transaction[];
  categoryCurrencyMode: "base" | "local";
  baseCurrency: string;
  localCurrencyCode: string;
  activeDragId: string | null;
  isSortingMode: boolean;
  setIsSortingMode: (val: boolean) => void;
  setAnalyticsModal: (val: { isOpen: boolean; type: "expense" | "income" }) => void;
  setIncomeModal: (val: { isOpen: boolean; income: IncomeSource | null }) => void;
  setHistoryModal: (val: HistoryModalState) => void;
}

export function IncomeSection({
  isIncomeCollapsed, toggleIncome, incomes, currentMonthTransactions, categoryCurrencyMode,
  baseCurrency, localCurrencyCode, activeDragId, isSortingMode, setIsSortingMode,
  setAnalyticsModal, setIncomeModal, setHistoryModal
}: IncomeSectionProps) {
  return (
    <section className={`px-0 overflow-hidden transition-all duration-500 shrink-0 ${isIncomeCollapsed ? "max-h-0 opacity-0" : "max-h-[160px] opacity-100 py-1"}`}>
      <div className="px-6 py-2 flex justify-between items-center">
        <div onClick={toggleIncome} className="flex items-center gap-2 cursor-pointer group">
          <ChevronRight size={APP_SETTINGS.UI.ICON_SIZE_SMALL} className="text-slate-500 rotate-90" />
          <h2 className="text-[10px] font-black text-slate-500 uppercase group-hover:text-white">Доходы</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setAnalyticsModal({ isOpen: true, type: "income" })} className="w-8 h-8 rounded-xl bg-[var(--success-color)]/10 border border-[var(--success-color)]/20 text-[var(--success-color)] flex items-center justify-center hover:bg-[var(--success-color)]/20 transition-all shadow-sm"><PieChart size={14} /></button>
          <button onClick={() => setIncomeModal({ isOpen: true, income: null })} className="w-7 h-7 rounded-xl bg-[var(--success-color)]/10 text-[var(--success-color)] flex items-center justify-center hover:bg-[var(--success-color)]/20 transition-colors"><Plus size={14} /></button>
        </div>
      </div>
      <SortableContext items={incomes.map(i => i.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">
          {incomes.map(inc => {
            const monthlyAmount = Math.round(currentMonthTransactions
              .filter(t => String(t.type).toLowerCase() === "income" && t.targetId === inc.id)
              .reduce((sum, t) => {
                const tCurr = t.targetCurrency || baseCurrency;
                if (categoryCurrencyMode === 'local' && tCurr === localCurrencyCode) return sum + (t.targetAmount || 0);
                const valBase = (t.targetAmountUSD && t.targetAmountUSD !== 0 && baseCurrency === 'USD')
                  ? t.targetAmountUSD
                  : RatesService.convert(t.targetAmount || 0, tCurr, baseCurrency);
                return sum + (categoryCurrencyMode === 'base' ? valBase : RatesService.convert(valBase, baseCurrency, localCurrencyCode));
              }, 0));
            return (<DraggableIncomeItem key={inc.id} income={inc} isDragging={activeDragId === inc.id} onSortingMode={() => setIsSortingMode(true)} isSortingMode={isSortingMode} onLongPress={(i) => { setIsSortingMode(false); setIncomeModal({ isOpen: true, income: i }); }} onClick={(income) => setHistoryModal({ isOpen: true, entity: income, type: "income" })} monthlyAmount={monthlyAmount} />);
          })}
        </div>
      </SortableContext>
    </section>
  );
}
