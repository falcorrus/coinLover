import React, { useState, useRef, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { ShoppingBag, Wallet } from "lucide-react";
import { Category } from "../types";
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
}

export const CategoryItem: React.FC<Props> = ({
  category, spent, isDragging, isSortingMode, isOver, onSortingMode, onLongPress, onClick
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
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
    // Only handle left mouse button or touch
    if (e.button !== 0) return;
    
    // IMPORTANT: Call dnd-kit's listener to initiate drag
    listeners?.onPointerDown?.(e);

    setIsPressing(true);
    didMoveRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    // Trigger Sorting Mode after 500ms
    sortingTimerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onSortingMode?.();
        if (navigator.vibrate) navigator.vibrate(40);
      }
    }, 500);

    // Trigger Edit Modal after 1500ms (Long Press)
    longPressTimerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onLongPress?.(category);
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      }
    }, 1500);
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

  // Prevent Long Press from firing if dnd-kit starts dragging
  React.useEffect(() => {
    if (isDragging) {
      clearTimers();
      setIsPressing(false);
    }
  }, [isDragging, clearTimers]);

  const Icon = IconMap[category.icon] || ShoppingBag;
  const isTarget = isOver && !isDragging;

  const style = {
    transform: isSortingMode ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 100 : 1,
    touchAction: "none"
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col items-center gap-2 justify-start transition-opacity cursor-pointer ${isDragging ? "opacity-30" : "opacity-100"}`}
      onClick={(e) => {
        // If it was a drag or sorting mode just started, don't trigger history
        if (!didMoveRef.current && !isSortingMode) {
          onClick?.(category);
        }
      }}
    >
      <div
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={e => e.preventDefault()}
        className={`w-[64px] h-[64px] rounded-[32px] flex items-center justify-center transition-all duration-300 ${
          isDragging ? "grabbed-elevation" : 
          isPressing ? "scale-90 brightness-75" : ""
        } ${isTarget ? "bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-110" : "bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/5"
        } ${isSortingMode && isDragging ? "shadow-2xl border-[#6d5dfc] ring-4 ring-[#6d5dfc]/20" : ""}`}
      >
        <Icon size={26} color={isTarget ? "#fff" : category.color} />
      </div>
      <div className="flex flex-col items-center pb-2 pointer-events-none select-none">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center truncate w-full max-w-[70px] leading-tight break-words whitespace-pre-wrap">{category.name}</span>
        {spent > 0 && <span className="text-[11px] font-bold text-[#D4AF37] mt-0.5">-${spent.toLocaleString()}</span>}
      </div>
    </div>
  );
};
