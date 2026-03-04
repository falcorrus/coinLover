import React, { useRef, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Briefcase } from "lucide-react";
import { IncomeSource } from "../types";
import { IconMap } from "../constants";

const LONG_PRESS_MS = 1500; // 1.5 seconds for edit modal
const MOVE_THRESHOLD = 20;   // px

interface Props {
  income: IncomeSource;
  isDragging: boolean;
  onSortingMode?: () => void;
  onLongPress: (income: IncomeSource) => void;
  onClick?: (income: IncomeSource) => void;
  isSortingMode: boolean;
}

export const DraggableIncomeItem: React.FC<Props> = ({
  income, isDragging, isSortingMode, onLongPress, onClick, onSortingMode
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

    // 1. Sorting trigger - 500ms
    sortingTimerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onSortingMode?.();
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);

    // 2. Editing trigger - 1.5s
    timerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onLongPress(income);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, LONG_PRESS_MS);

    const onPointerMove = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - startPosRef.current.x, ev.clientY - startPosRef.current.y);
      if (dist > MOVE_THRESHOLD) {
        didMoveRef.current = true;
        clearTimers();
      }
    };

    const onPointerUp = () => {
      setIsPressing(false);
      clearTimers();

      const elapsed = Date.now() - startTimeRef.current;
      if (!didMoveRef.current && elapsed < 500) {
        onClick?.(income);
      }

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };

    const onPointerCancel = () => {
      setIsPressing(false);
      clearTimers();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    listeners?.onPointerDown?.(e);
  };

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
      className={`flex flex-col items-center justify-start transition-opacity w-[64px] shrink-0 ${isDragging ? "opacity-30" : "opacity-100"}`}
    >
      <div
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onContextMenu={e => e.preventDefault()}
        style={{ touchAction: isSortingMode ? "none" : "pan-x" }}
        className={`draggable-coin w-[52px] h-[52px] mb-2 border border-[#10b981]/30 bg-[#10b981]/10 transition-all duration-300 ${isDragging ? "grabbed-elevation" :
          isPressing ? "scale-90 brightness-75 border-[#10b981]/50" : ""
          } ${isSortingMode && isDragging ? "shadow-2xl border-[#6d5dfc] ring-2 ring-[#6d5dfc]/20" : ""}`}
      >
        <Icon size={22} color={income.color} />
      </div>
      <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider text-center leading-none truncate w-16">
        {income.name}
      </span>
    </div>
  );
};
