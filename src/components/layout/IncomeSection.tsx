import * as React from "react";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronRight, PieChart, Plus } from "lucide-react";
import { APP_SETTINGS } from "../../constants/settings";
import { IncomeSource, Transaction, HistoryModalState, Account } from "../../types";
import { RatesService } from "../../services/RatesService";
import { DraggableIncomeItem } from "../DraggableIncomeItem";
import { useLanguage } from "../../contexts/LanguageContext";

interface IncomeSectionProps {
  isIncomeCollapsed: boolean;
  toggleIncome: () => void;
  incomes: IncomeSource[];
  accounts: Account[];
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
  isIncomeCollapsed, toggleIncome, incomes, accounts, currentMonthTransactions, categoryCurrencyMode,
  baseCurrency, localCurrencyCode, activeDragId, isSortingMode, setIsSortingMode,
  setAnalyticsModal, setIncomeModal, setHistoryModal
}: IncomeSectionProps) {
  const { t } = useLanguage();
  return (
    <section className={`px-0 overflow-hidden transition-all duration-500 ease-in-out shrink-0 origin-top-left ${isIncomeCollapsed ? "max-h-0 opacity-0 scale-90 -translate-x-10 -translate-y-4" : "max-h-[160px] opacity-100 scale-100 translate-x-0 translate-y-0 pb-1"}`}>
      <div className="px-6 pt-2 mb-1 flex justify-between items-center">
        <div onClick={toggleIncome} className="flex items-center gap-2 cursor-pointer group">
          <ChevronRight size={APP_SETTINGS.UI.ICON_SIZE_SMALL} className="text-[var(--text-muted)] opacity-60 rotate-90" />
          <h2 className="text-[9px] font-black tracking-[0.2em] text-[var(--text-muted)] uppercase opacity-80 group-hover:text-[var(--text-main)]">{t('Incomes')}</h2>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>
      <SortableContext items={incomes.map(i => i.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex overflow-x-auto hide-scrollbar px-6 pb-4 pt-4" style={{ gap: 'var(--grid-gap)' }}>
          {incomes.map(inc => {
            const monthlyAmount = Math.round(currentMonthTransactions
              .filter(t => String(t.type).toLowerCase() === "income" && t.targetId === inc.id)
              .reduce((sum, t) => {
                const account = accounts.find(a => a.id === t.accountId || a.name === t.accountId);
                const tCurr = t.targetCurrency || account?.currency || baseCurrency;
                if (categoryCurrencyMode === 'local' && tCurr === localCurrencyCode) return sum + (t.targetAmount || 0);
                const sCurr = t.sourceCurrency || account?.currency || baseCurrency;
                const valBase = (t.targetAmountUSD && t.targetAmountUSD !== 0 && baseCurrency === 'USD')
                  ? t.targetAmountUSD
                  : RatesService.convert(t.targetAmount || 0, tCurr, baseCurrency);
                return sum + (categoryCurrencyMode === 'base' ? valBase : RatesService.convert(valBase, baseCurrency, localCurrencyCode));
              }, 0));
            return (<DraggableIncomeItem key={inc.id} income={inc} isDragging={activeDragId === inc.id} onSortingMode={() => setIsSortingMode(true)} isSortingMode={isSortingMode} onLongPress={(i) => { setIsSortingMode(false); setIncomeModal({ isOpen: true, income: i }); }} onClick={(income) => setHistoryModal({ isOpen: true, entity: income, type: "income" })} monthlyAmount={monthlyAmount} />);
          })}
          
          {/* Инлайновая кнопка создания нового дохода */}
          <div
            onClick={() => setIncomeModal({ isOpen: true, income: null })}
            className="flex flex-col items-center justify-start transition-all duration-300 w-[var(--col-width)] shrink-0 cursor-pointer opacity-50 hover:opacity-100 hover:scale-105 active:scale-95 group"
          >
            <div className="w-[64px] h-[64px] mb-2 rounded-full border border-dashed border-[var(--glass-border-highlight)] flex items-center justify-center bg-[rgba(255,255,255,0.01)] transition-colors group-hover:bg-[rgba(255,255,255,0.04)] shadow-inner">
              <Plus size={22} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
            </div>
            <div className="flex flex-col items-center text-center leading-tight pointer-events-none select-none">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider group-hover:text-[var(--text-main)] transition-colors">{t('Create')}</span>
            </div>
          </div>
        </div>
      </SortableContext>
    </section>
  );
}
