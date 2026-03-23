import React, { useRef, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Wallet } from "lucide-react";
import { Account, DragItemType } from "../types";
import { IconMap } from "../constants";

const LONG_PRESS_MS = 2000;
const MOVE_THRESHOLD = 15;

interface Props {
  account: Account;
  isDragging: boolean;
  onSortingMode?: () => void;
  onLongPress: (account: Account) => void;
  onClick?: (account: Account) => void;
  activeDragType: DragItemType | null;
  isSortingMode: boolean;
  isOver?: boolean;
}

export const AccountItem: React.FC<Props> = ({
  account, isDragging, onLongPress, onClick, activeDragType, isSortingMode, onSortingMode, isOver
}) => {
  const {
    attributes, listeners, setNodeRef, transform, transition
  } = useSortable({
    id: account.id,
    data: { type: "account", account }
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

    // IMPORTANT: Call dnd-kit's listener to initiate drag
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
        onLongPress(account);
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      }
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressing) return;
    const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
    if (dist > MOVE_THRESHOLD) {
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
    if (isDragging || !isSortingMode) {
      clearTimers();
      setIsPressing(false);
    }
  }, [isDragging, isSortingMode, clearTimers]);

  const Icon = IconMap[account.icon] || Wallet;
  // Unified target logic: Highlight when another account or income is dragged over
  const isTarget = isOver && !isDragging && (activeDragType === "account" || activeDragType === "income");

  const style = {
    transform: isSortingMode ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 100 : 1,
    touchAction: isSortingMode ? "none" : "pan-x"
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onContextMenu={e => e.preventDefault()}
      className={`flex flex-col items-center gap-2 justify-start transition-all duration-300 w-[76px] shrink-0 cursor-pointer ${isDragging ? "opacity-30" : "opacity-100"} ${(isSortingMode && (isDragging || isPressing)) ? 'animate-wiggle' : ''}`}
      onClick={() => {
        if (!didMoveRef.current && !isSortingMode) {
          onClick?.(account);
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
        className={`draggable-coin coin-wallet transition-all duration-300 relative ${
          isDragging ? "grabbed-elevation" :
          (isPressing && isSortingMode) ? "scale-110 border-[var(--primary-color)] shadow-[0_0_20px_rgba(109,93,252,0.4)] ring-4 ring-[var(--primary-color)]/20" :
          isPressing ? "scale-90 brightness-75 border-[var(--glass-border-highlight)]" : ""
        } ${isTarget ? "coin-target-glow" : ""} ${
          isSortingMode && isDragging ? "shadow-2xl shadow-[var(--shadow-color)] border-[var(--primary-color)] ring-4 ring-[var(--primary-color)]/20" : ""
        }`}
      >
        <Icon size={26} color={isTarget ? "var(--text-main)" : account.color} />
      </div>
      <div className="flex flex-col items-center text-center leading-tight pointer-events-none select-none">
        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5 coin-wallet-name">{account.name}</span>
        <span className="text-[13px] font-bold text-[var(--text-main)] coin-wallet-balance">
          {Math.round(account.balance).toLocaleString()} <span className="text-[10px] opacity-50 coin-wallet-currency">{account.currency}</span>
        </span>
      </div>
    </div>
  );
};
