import React, { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Wallet } from "lucide-react";
import { Account } from "../types";
import { IconMap } from "../constants";

interface Props {
  account: Account;
  isDragging: boolean;
  onSortingMode: () => void;
  activeDragType: string | null;
  isSortingMode: boolean;
}

export const AccountItem: React.FC<Props> = ({ account, isDragging, onSortingMode, activeDragType, isSortingMode }) => {
  const { 
    attributes, listeners, setNodeRef, transform, transition, isOver 
  } = useSortable({ 
    id: account.id, 
    data: { type: "account", account } 
  });

  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<any>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPressing(true);
    startPosRef.current = { x: e.clientX, y: e.y };
    
    // Start 1s timer for sorting mode
    timerRef.current = setTimeout(() => { 
      onSortingMode(); 
      if (navigator.vibrate) navigator.vibrate(50);
    }, 1000);

    // Pass event to dnd-kit
    if (listeners?.onPointerDown) {
      listeners.onPointerDown(e);
    }
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // If moved more than 10px before 1s, cancel sorting mode timer
    if (timerRef.current) {
      const dist = Math.sqrt(
        Math.pow(e.clientX - startPosRef.current.x, 2) + 
        Math.pow(e.clientY - startPosRef.current.y, 2)
      );
      if (dist > 10) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const Icon = IconMap[account.icon] || Wallet;
  
  // Targets for Transfer (Quick Drag)
  const isTransferTarget = isOver && activeDragType === 'account' && !isDragging && !isSortingMode;
  const isIncomeTarget = isOver && activeDragType === 'income';

  const style = {
    transform: isSortingMode ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 100 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex flex-col items-center gap-3 min-w-[72px] transition-opacity shrink-0 ${isDragging ? "opacity-30" : "opacity-100"}`}
    >
      <div 
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onContextMenu={e => e.preventDefault()}
        className={`draggable-coin transition-all duration-300 ${
          isPressing && !isDragging ? "scale-90 brightness-75 border-white/40" : ""
        } ${
          (isTransferTarget || isIncomeTarget) ? "bg-[#10b981]/20 border border-[#10b981]/50 shadow-lg scale-110" : ""
        } ${
          isSortingMode && isDragging ? "scale-110 shadow-2xl border-[#6d5dfc] ring-4 ring-[#6d5dfc]/20" : ""
        }`}
      >
        <Icon size={26} color={(isTransferTarget || isIncomeTarget) ? "#10b981" : account.color} />
      </div>
      <div className="flex flex-col items-center text-center leading-tight">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{account.name}</span>
        <span className={`text-[13px] font-bold ${(isTransferTarget || isIncomeTarget) ? "text-[#10b981]" : "text-white"}`}>
          ${account.balance.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
