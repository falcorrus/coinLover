import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { Briefcase } from "lucide-react";
import { IncomeSource } from "../types";
import { IconMap } from "../constants";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  income: IncomeSource;
  isDragging: boolean;
  onSortingMode?: () => void;
  isSortingMode: boolean;
}

export const DraggableIncomeItem: React.FC<Props> = ({ income, isDragging, isSortingMode }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: income.id,
    data: { type: "income", income }
  });

  const Icon = IconMap[income.icon] || Briefcase;

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
        onContextMenu={e => e.preventDefault()}
        className={`draggable-coin w-[52px] h-[52px] mb-2 border border-[#10b981]/30 bg-[#10b981]/10 transition-all duration-300 ${isSortingMode && isDragging ? "scale-110 shadow-2xl border-[#6d5dfc] ring-2 ring-[#6d5dfc]/20" : ""
          }`}
      >
        <Icon size={22} color={income.color} />
      </div>
      <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider text-left leading-none">
        {income.name}
      </span>
    </div>
  );
};
