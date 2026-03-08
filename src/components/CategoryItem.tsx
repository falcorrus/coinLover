import React, { useState, useRef, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { ShoppingBag, Wallet } from "lucide-react";
import { Category, DragItemType } from "../types";
import { IconMap } from "../constants";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  category: Category;
  spent: number;
  isDragging: boolean;
  onSortingMode?: () => void;
  isSortingMode: boolean;
  isOver?: boolean;
  onLongPress?: (category: Category) => void;
  onClick?: (category: Category) => void;
  activeDragType: DragItemType | null;
}

export const CategoryItem: React.FC<Props> = ({
  category, spent, isDragging, isSortingMode, onSortingMode, onLongPress, onClick, activeDragType, isOver
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isOver: isSortableOver } = useSortable({
    id: category.id,
    data: { type: "category", category }
  });

  const [isPressing, setIsPressing] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const didMoveRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (sortingTimerRef.current) clearTimeout(sortingTimerRef.current);
    longPressTimerRef.current = null;
    sortingTimerRef.current = null;
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    listeners?.onPointerDown?.(e);
    setIsPressing(true);
    didMoveRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    // 600ms Sorting trigger
    sortingTimerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onSortingMode?.();
        if (navigator.vibrate) navigator.vibrate(40);
      }
    }, 600);

    longPressTimerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onLongPress?.(category);
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      }
    }, 2000);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressing) return;
    const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
    if (dist > 15) {
      didMoveRef.current = true;
      clearTimers();
    }
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    clearTimers();
  };

  React.useEffect(() => {
    if (isDragging || !isSortingMode) {
      clearTimers();
      setIsPressing(false);
    }
  }, [isDragging, isSortingMode, clearTimers]);

  const Icon = IconMap[category.icon] || ShoppingBag;

  // Unified target logic: Highlight when an account is dragged over a category (expense)
  const isTarget = isOver && !isDragging && activeDragType === "account";

  const style = {
    transform: isSortingMode ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 100 : 1,
    touchAction: isSortingMode ? "none" : "pan-y"
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onContextMenu={e => e.preventDefault()}
      className={`flex flex-col items-center gap-2 justify-start transition-all duration-300 cursor-pointer ${isDragging ? "opacity-30" : "opacity-100"}`}
      onClick={() => {
        if (!didMoveRef.current && !isSortingMode) {
          onClick?.(category);
        }
      }}
    >
      <div
        {...listeners}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: "none" }}
        className={`draggable-coin coin-category transition-all duration-300 ${
          isDragging ? "grabbed-elevation" :
          (isPressing && isSortingMode) ? "scale-110 border-[var(--primary-color)] shadow-[0_0_20px_rgba(109,93,252,0.4)] ring-4 ring-[var(--primary-color)]/20" :
          isPressing ? "scale-90 brightness-75 border-[var(--glass-border-highlight)]" : ""
        } ${isTarget ? "coin-target-glow" : ""} ${
          isSortingMode && isDragging ? "shadow-2xl shadow-[var(--shadow-color)] border-[var(--primary-color)] ring-4 ring-[var(--primary-color)]/20" : ""
        }`}
      >
        <Icon size={26} color={isTarget ? "var(--text-main)" : category.color} />
      </div>
      <div className="flex flex-col items-center pb-2 pointer-events-none select-none">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center truncate w-full max-w-[70px] leading-tight break-words whitespace-pre-wrap">{category.name}</span>
        {spent > 0 && <span className="text-[11px] font-bold text-[#D4AF37] mt-0.5">-${spent.toLocaleString()}</span>}
      </div>
    </div>
  );
};
