import React, { useRef, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Wallet } from "lucide-react";
import { Account, DragItemType } from "../types";
import { IconMap } from "../constants";

const LONG_PRESS_MS = 1500; // 1.5 seconds for edit modal (more deliberate)
const MOVE_THRESHOLD = 10;   // px

interface Props {
  account: Account;
  isDragging: boolean;
  onSortingMode?: () => void;
  onLongPress: (account: Account) => void;
  activeDragType: DragItemType | null;
  isSortingMode: boolean;
  isOver?: boolean;
}

export const AccountItem: React.FC<Props> = ({
  account, isDragging, onLongPress, activeDragType, isSortingMode, onSortingMode
}) => {
  const {
    attributes, listeners, setNodeRef: setSortRef, transform, transition,
  } = useSortable({
    id: account.id,
    data: { type: "account", account }
  });

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: account.id,
    data: { type: "account", account }
  });

  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const didMoveRef = useRef(false);

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
    // Only handle primary pointer interactions
    if (e.button !== 0) return;

    setIsPressing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    didMoveRef.current = false;

    // 1. Сортировка - срабатывает через 500мс
    sortingTimerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        onSortingMode?.();
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);

    // 2. Редактирование - срабатывает через 1.5с
    timerRef.current = setTimeout(() => {
      // If user holds still for 1.5s without moving -> definitely editing
      if (!didMoveRef.current) {
        onLongPress(account);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, LONG_PRESS_MS);

    const onPointerMove = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - startPosRef.current.x, ev.clientY - startPosRef.current.y);
      if (dist > MOVE_THRESHOLD) {
        didMoveRef.current = true;
        clearTimers(); // User moved -> cancelled "edit" mode intention
      }
    };

    const onPointerUp = () => {
      setIsPressing(false);
      clearTimers();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    listeners?.onPointerDown?.(e);
  };

  const Icon = IconMap[account.icon] || Wallet;

  // Highlights for transfer/income drops - only when hovering DIRECTLY over the coin circle
  const isTargetOver = isDropOver && activeDragType === "account" && !isDragging && !isSortingMode;
  const isIncomeTarget = isDropOver && activeDragType === "income";

  const style = {
    transform: isSortingMode ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 100 : 1
  };

  return (
    <div
      ref={setSortRef}
      style={style}
      className={`flex flex-col items-center gap-2 justify-start transition-opacity w-[76px] shrink-0 ${isDragging ? "opacity-30" : "opacity-100"}`}
    >
      <div
        ref={setDropRef}
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onContextMenu={e => e.preventDefault()}
        style={{ touchAction: "none" }}
        className={`draggable-coin transition-all duration-300 ${isDragging ? "grabbed-elevation" :
          isPressing ? "scale-90 brightness-75 border-white/40" : ""
          } ${(isTargetOver || isIncomeTarget) ? "coin-target-glow" : ""
          } ${isSortingMode && isDragging ? "shadow-2xl border-[#6d5dfc] ring-4 ring-[#6d5dfc]/20" : ""
          }`}
      >
        <Icon size={26} color={(isTargetOver || isIncomeTarget) ? "#fff" : account.color} />
      </div>
      <div className="flex flex-col items-center text-center leading-tight">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{account.name}</span>
        <span className="text-[13px] font-bold text-white">
          {account.balance.toLocaleString()} <span className="text-[10px] opacity-50">{account.currency}</span>
        </span>
      </div>
    </div>
  );
};
