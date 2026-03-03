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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const didMoveRef = useRef(false);
  const longPressFireRef = useRef(false);
  const startTimeRef = useRef(0);

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
    longPressFireRef.current = false;
    startTimeRef.current = Date.now();

    // Сортировка + LongPress — 500мс
    timerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        longPressFireRef.current = true;
        onSortingMode?.();
        onLongPress?.(category);
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

      const elapsed = Date.now() - startTimeRef.current;
      if (!didMoveRef.current && !longPressFireRef.current && elapsed < 500) {
        onClick?.(category);
      }

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
    zIndex: isDragging ? 100 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col items-center gap-2 justify-start transition-opacity ${isDragging ? "opacity-30" : "opacity-100"}`}
    >
      <div
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onContextMenu={e => e.preventDefault()}
        style={{ touchAction: "none" }}
        className={`w-[64px] h-[64px] rounded-[32px] flex items-center justify-center transition-all duration-300 ${isDragging ? "grabbed-elevation" :
          isPressing ? "scale-90 brightness-75" : ""
          } ${isTarget ? "bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-110" : "bg-gradient-to-br from-white/10 to-white/[0.02]"
          } ${isSortingMode && isDragging ? "shadow-2xl border-[#6d5dfc] ring-4 ring-[#6d5dfc]/20" : ""
          }`}
      >
        <Icon size={26} color={isTarget ? "#fff" : category.color} />
      </div>
      <div className="flex flex-col items-center pb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center truncate w-full max-w-[70px] leading-tight break-words whitespace-pre-wrap">{category.name}</span>
        {spent > 0 && <span className="text-[11px] font-bold text-[#D4AF37] mt-0.5">-${spent.toLocaleString()}</span>}
      </div>
    </div>
  );
};
