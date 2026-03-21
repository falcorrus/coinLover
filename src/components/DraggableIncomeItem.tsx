import React, { useRef, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Briefcase } from "lucide-react";
import { IncomeSource } from "../types";
import { IconMap } from "../constants";

const LONG_PRESS_MS = 2000; // 2 seconds for edit modal
const MOVE_THRESHOLD = 10;   // px - lowered to catch scroll faster

interface Props {
  income: IncomeSource;
  isDragging: boolean;
  onSortingMode?: () => void;
  onLongPress: (income: IncomeSource) => void;
  onClick?: (income: IncomeSource) => void;
  isSortingMode: boolean;
  monthlyAmount?: number;
}

export const DraggableIncomeItem: React.FC<Props> = ({
  income, isDragging, isSortingMode, onLongPress, onClick, onSortingMode, monthlyAmount = 0
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: income.id,
    data: { type: "income", income }
  });

  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const didMoveRef = useRef(false);
  const startTimeRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (sortingTimerRef.current) {
      clearTimeout(sortingTimerRef.current);
      sortingTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    setIsPressing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    didMoveRef.current = false;
    startTimeRef.current = Date.now();

    // 1. Sorting trigger - 600ms
    sortingTimerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onSortingMode?.();
        if (navigator.vibrate) navigator.vibrate(40);
      }
    }, 600);

    // 2. Editing trigger - 2.0s
    timerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onLongPress(income);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, LONG_PRESS_MS);

    // Initiate dnd-kit drag
    listeners?.onPointerDown?.(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressing) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    const dist = Math.hypot(dx, dy);

    // If movement is significant, clear timers and mark as moved
    if (dist > MOVE_THRESHOLD) {
      didMoveRef.current = true;
      clearTimers();
    }
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    clearTimers();
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    const elapsed = Date.now() - startTimeRef.current;
    if (!didMoveRef.current && !isSortingMode && elapsed < 400) {
      onClick?.(income);
    }
  };

  React.useEffect(() => {
    if (isDragging || !isSortingMode) {
      clearTimers();
      setIsPressing(false);
    }
  }, [isDragging, isSortingMode, clearTimers]);

  const Icon = IconMap[income.icon] || Briefcase;

  const style = {
    transform: isSortingMode ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 100 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onContextMenu={e => e.preventDefault()}
      onClick={handleContainerClick}
      className={`flex flex-col items-center justify-start transition-opacity w-[64px] shrink-0 cursor-pointer ${isDragging ? "opacity-30" : "opacity-100"} ${(isSortingMode && (isDragging || isPressing)) ? 'animate-wiggle' : ''}`}
    >
      <div
        {...listeners}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: "none" }}
        className={`draggable-coin coin-wallet w-[52px] h-[52px] mb-2 border border-[#10b981]/30 bg-[#10b981]/10 transition-all duration-300 relative ${isDragging ? "grabbed-elevation" :
          (isPressing && isSortingMode) ? "scale-110 border-[var(--primary-color)] shadow-[0_0_20px_rgba(109,93,252,0.4)] ring-4 ring-[var(--primary-color)]/20" :
          isPressing ? "scale-90 brightness-75 border-[#10b981]/50" : ""
          } ${isSortingMode && isDragging ? "shadow-2xl border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]" : ""}`}
      >
        <Icon size={22} color={income.color} />
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center leading-none truncate w-16 pointer-events-none">
        {income.name}
      </span>
      {monthlyAmount > 0 && (
        <span className="text-[11px] font-bold text-[#10b981] mt-0.5 pointer-events-none">
          +${Math.round(monthlyAmount).toLocaleString()}
        </span>
      )}
    </div>
  );
};
