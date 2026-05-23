import * as React from "react";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Account, HistoryModalState } from "../../types";
import { AccountItem } from "../AccountItem";

interface AccountsSectionProps {
  accounts: Account[];
  activeDragId: string | null;
  activeDragType: string | null;
  overId: string | null;
  isSortingMode: boolean;
  setIsSortingMode: (val: boolean) => void;
  setAccountModal: (val: { isOpen: boolean; account: Account | null }) => void;
  setHistoryModal: (val: HistoryModalState) => void;
}

export function AccountsSection({
  accounts, activeDragId, activeDragType, overId, isSortingMode, setIsSortingMode,
  setAccountModal, setHistoryModal
}: AccountsSectionProps) {
  return (
    <section className="px-0 pt-2 pb-2 relative z-20 shrink-0">
      <div className="px-6 mb-1 flex justify-between items-center">
        <h2 className="text-[9px] font-black tracking-[0.2em] text-[var(--text-muted)] uppercase opacity-80">Кошельки</h2>
      </div>
      <SortableContext items={accounts.map(a => a.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-2 pt-4">
          {accounts.map(acc => (
            <AccountItem 
              key={acc.id} account={acc} isDragging={activeDragId === acc.id} 
              onSortingMode={() => setIsSortingMode(true)} 
              onLongPress={(a) => { setIsSortingMode(false); setAccountModal({ isOpen: true, account: a }); }} 
              onClick={(account) => setHistoryModal({ isOpen: true, entity: account, type: "account" })} 
              activeDragType={activeDragType} isSortingMode={isSortingMode} isOver={overId === acc.id} 
            />
          ))}
          {/* Инлайновая кнопка создания нового кошелька */}
          <div
            onClick={() => setAccountModal({ isOpen: true, account: null })}
            className="flex flex-col items-center gap-2 justify-start transition-all duration-300 w-[84px] shrink-0 cursor-pointer opacity-60 hover:opacity-100 hover:scale-105 active:scale-95 group"
          >
            <div className="w-[64px] h-[64px] rounded-full border border-dashed border-[var(--glass-border-highlight)] flex items-center justify-center bg-[rgba(255,255,255,0.01)] transition-colors group-hover:bg-[rgba(255,255,255,0.04)] shadow-inner">
              <Plus size={22} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
            </div>
            <div className="flex flex-col items-center text-center leading-tight pointer-events-none select-none">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5 group-hover:text-[var(--text-main)] transition-colors coin-wallet-name">Создать</span>
            </div>
          </div>
        </div>
      </SortableContext>
    </section>
  );
}
