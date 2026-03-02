import React, { useRef, useState } from "react";
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
  onSortingMode: () => void;
  isSortingMode: boolean;
}

export const CategoryItem: React.FC<Props> = ({ category, spent, isDragging, onSortingMode, isSortingMode }) => {
  const { attributes, listeners, setNodeRef: setSortRef, transform, transition, isOver: isSortOver } = useSortable({ 
    id: category.id, 
    data: { type: "category", category } 
  });

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: category.id,
    data: { type: "category", category }
  });

  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<any>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPressing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      onSortingMode();
      if (navigator.vibrate) navigator.vibrate(50);
    }, 1000);
    listeners?.onPointerDown(e);
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (timerRef.current) {
      const dist = Math.sqrt(Math.pow(e.clientX - startPosRef.current.x, 2) + Math.pow(e.clientY - startPosRef.current.y, 2));
      if (dist > 10) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const Icon = IconMap[category.icon] || ShoppingBag;
  const isTarget = isDropOver && !isDragging && !isSortingMode;

  const setCombinedRef = (node: any) => { setSortRef(node); setDropRef(node); };

  const style = {
    transform: isSortingMode ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 100 : 1
  };

  return (
    <div ref={setCombinedRef} style={style} className={`flex flex-col items-center justify-start transition-opacity ${isDragging ? "opacity-30" : "opacity-100"}`}>
      <div 
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        className={`w-[52px] h-[52px] rounded-[20px] flex items-center justify-center mb-2 transition-all duration-300 ${
          isPressing && !isDragging ? "scale-90 brightness-75" : ""
        } ${
          isTarget ? "bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white/40 scale-110" : "bg-white/5 border border-white/5"
        } ${
          isSortingMode && isDragging ? "scale-110 shadow-2xl border-[#6d5dfc] ring-2 ring-[#6d5dfc]/20" : ""
        }`}
      >
        <Icon size={22} color={isTarget ? "#fff" : category.color} />
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center truncate w-full text-white">{category.name}</span>
      {spent > 0 && <span className="text-[11px] font-bold text-[#f43f5e]">-${spent}</span>}
    </div>
  );
};
