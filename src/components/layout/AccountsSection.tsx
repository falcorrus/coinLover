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
    <section className="px-0 py-2 relative z-20 shrink-0">
      <div className="px-6 mb-3 flex justify-between items-center">
        <h2 className="text-[10px] font-black text-slate-500 uppercase">Кошельки</h2>
        <button onClick={() => setAccountModal({ isOpen: true, account: null })} className="w-8 h-8 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--text-main)] flex items-center justify-center hover:bg-[var(--glass-item-active)] transition-all shadow-sm"><Plus size={16} /></button>
      </div>
      <SortableContext items={accounts.map(a => a.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4 pt-2">
          {accounts.map(acc => (
            <AccountItem 
              key={acc.id} account={acc} isDragging={activeDragId === acc.id} 
              onSortingMode={() => setIsSortingMode(true)} 
              onLongPress={(a) => { setIsSortingMode(false); setAccountModal({ isOpen: true, account: a }); }} 
              onClick={(account) => setHistoryModal({ isOpen: true, entity: account, type: "account" })} 
              activeDragType={activeDragType} isSortingMode={isSortingMode} isOver={overId === acc.id} 
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
