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
  theme?: string;
}

export const CategoryItem: React.FC<Props> = ({
  category, spent, isDragging, isSortingMode, onSortingMode, onLongPress, onClick, activeDragType, isOver, theme
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
      className={`flex flex-col items-center gap-3 justify-start transition-all duration-300 cursor-pointer group ${isDragging ? "opacity-30" : "opacity-100"}`}
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
        style={{ 
          touchAction: "none"
        }}
        className={`flex items-center justify-center transition-all duration-300 ${
          isDragging ? "scale-110" :
          (isPressing && isSortingMode) ? "scale-110 rotate-3" :
          isPressing ? "scale-90" : "group-active:scale-90"
        } ${isTarget ? "scale-125" : ""}`}
      >
        <Icon 
          size={48} 
          className="transition-all duration-300" 
          style={{ 
            color: isTarget ? "var(--primary-color)" : category.color,
            fill: isTarget ? "transparent" : `${category.color}20` 
          }} 
          strokeWidth={1.5}
        />
      </div>
      <div className="flex flex-col items-center pointer-events-none select-none w-full pt-1">
        <span className={`font-label text-[9px] uppercase tracking-[0.12em] text-center leading-tight break-words line-clamp-2 w-full px-0.5 ${
          theme === 'modern' ? 'font-medium text-slate-400 opacity-80' : 'font-black text-[var(--on-surface-variant)]'
        }`}>
          {category.name}
        </span>
        {spent > 0 && (
          <span className={`font-technical text-[10px] font-bold mt-0.5 ${
            theme === 'modern' ? 'text-slate-300 opacity-60' : 'text-[var(--text-main)] opacity-80'
          }`}>
            -${spent.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
};
