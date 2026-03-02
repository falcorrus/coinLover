import React, { useState, useRef, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { ShoppingBag } from "lucide-react";
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
}

export const CategoryItem: React.FC<Props> = ({
  category, spent, isDragging, isSortingMode, isOver, onSortingMode
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id,
    data: { type: "category", category }
  });

  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const didMoveRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsPressing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    didMoveRef.current = false;

    // Сортировка - 500мс
    timerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onSortingMode?.();
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);

    const onPointerMove = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - startPosRef.current.x, ev.clientY - startPosRef.current.y) > 10) {
        didMoveRef.current = true;
        clearTimer();
      }
    };
    const onPointerUp = () => {
      setIsPressing(false);
      clearTimer();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    listeners?.onPointerDown?.(e);
  };

  const Icon = IconMap[category.icon] || ShoppingBag;
  const isTarget = isOver && !isDragging && !isSortingMode;

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
      className={`flex flex-col items-center justify-start transition-opacity ${isDragging ? "opacity-30" : "opacity-100"}`}
    >
      <div
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onContextMenu={e => e.preventDefault()}
        className={`w-[52px] h-[52px] rounded-[20px] flex items-center justify-center mb-2 transition-all duration-300 ${isTarget ? "bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white/40 scale-110" : "bg-white/5 border border-white/5"
          } ${isSortingMode && isDragging ? "scale-110 shadow-2xl border-[#6d5dfc] ring-2 ring-[#6d5dfc]/20" : ""
          }`}
      >
        <Icon size={22} color={isTarget ? "#fff" : category.color} />
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center truncate w-full">{category.name}</span>
      {spent > 0 && <span className="text-[11px] font-bold text-[#D4AF37]">-${spent}</span>}
    </div>
  );
};
