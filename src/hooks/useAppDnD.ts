import { useState, useRef, useCallback } from "react";
import { DragStartEvent, DragMoveEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Account, Category, IncomeSource, DragItemType, NumpadData } from "../types";
import { APP_SETTINGS } from "../constants/settings";

interface UseAppDnDProps {
  accounts: Account[];
  setAccounts: (a: Account[] | ((it: Account[]) => Account[])) => void;
  categories: Category[];
  setCategories: (c: Category[] | ((it: Category[]) => Category[])) => void;
  incomes: IncomeSource[];
  setIncomes: (i: IncomeSource[] | ((it: IncomeSource[]) => IncomeSource[])) => void;
  syncAccountsOrder: (a: Account[]) => void;
  syncCategories: (c: Category[]) => void;
  syncIncomes: (i: IncomeSource[]) => void;
  setNumpad: (n: NumpadData | ((prev: NumpadData) => NumpadData)) => void;
}

export const useAppDnD = ({
  accounts, setAccounts, categories, setCategories, incomes, setIncomes,
  syncAccountsOrder, syncCategories, syncIncomes, setNumpad
}: UseAppDnDProps) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<DragItemType | null>(null);
  const [isSortingMode, setIsSortingMode] = useState(false);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const [overId, setOverId] = useState<string | null>(null);
  const sortingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
    setActiveDragType(e.active.data.current?.type as DragItemType);
    setHasMovedDuringDrag(false);
    
    if (sortingTimerRef.current) clearTimeout(sortingTimerRef.current);
    sortingTimerRef.current = setTimeout(() => {
      setIsSortingMode(true);
      if (navigator.vibrate) navigator.vibrate(APP_SETTINGS.HAPTIC_FEEDBACK_DURATION_MEDIUM);
    }, APP_SETTINGS.DND_SORTING_MODE_DELAY);

    const clearOnUp = () => {
      if (sortingTimerRef.current) clearTimeout(sortingTimerRef.current);
      requestAnimationFrame(() => {
        if (!activeDragId) setIsSortingMode(false);
      });
      window.removeEventListener('pointerup', clearOnUp);
    };
    window.addEventListener('pointerup', clearOnUp);
  }, [activeDragId]);

  const handleDragMove = useCallback((e: DragMoveEvent) => {
    if (!hasMovedDuringDrag) setHasMovedDuringDrag(true);
    if (sortingTimerRef.current && !isSortingMode) {
      const { delta } = e;
      if (Math.abs(delta.x) > APP_SETTINGS.DND_DRAG_MOVE_THRESHOLD || Math.abs(delta.y) > APP_SETTINGS.DND_DRAG_MOVE_THRESHOLD) {
        clearTimeout(sortingTimerRef.current);
        sortingTimerRef.current = null;
      }
    }
  }, [hasMovedDuringDrag, isSortingMode]);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const { active, over } = e;
    setOverId(over?.id as string || null);
    if (!over || !isSortingMode || active.id === over.id) return;

    if (active.data.current?.type === "account" && over.data.current?.type === "account") {
      setAccounts((it) => arrayMove(it, it.findIndex(i => i.id === active.id), it.findIndex(i => i.id === over.id)));
    } else if (active.data.current?.type === "category" && over.data.current?.type === "category") {
      setCategories((it) => arrayMove(it, it.findIndex(i => i.id === active.id), it.findIndex(i => i.id === over.id)));
    } else if (active.data.current?.type === "income" && over.data.current?.type === "income") {
      setIncomes((it) => arrayMove(it, it.findIndex(i => i.id === active.id), it.findIndex(i => i.id === over.id)));
    }
  }, [isSortingMode, setAccounts, setCategories, setIncomes]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    if (sortingTimerRef.current) clearTimeout(sortingTimerRef.current);
    const { active, over } = e;
    const sorting = isSortingMode;
    const moved = hasMovedDuringDrag;
    
    setActiveDragId(null); 
    setActiveDragType(null); 
    setOverId(null);
    setIsSortingMode(false);

    if (sorting && moved) {
      if (active.data.current?.type === "account") syncAccountsOrder(accounts);
      else if (active.data.current?.type === "category") syncCategories(categories);
      else if (active.data.current?.type === "income") syncIncomes(incomes);
      return;
    }

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "account") {
      if (overData?.type === "category") {
        const baseCur = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";
        const prefCur = localStorage.getItem("cl_numpad_pref_currency") || baseCur;
        setNumpad({
          isOpen: true, type: "expense", source: activeData.account, destination: overData.category,
          sourceAmount: "0", sourceCurrency: activeData.account.currency, targetAmount: "0", targetCurrency: prefCur,
          targetLinked: true, activeField: "source", tag: overData.category.tags?.[0] || null, comment: ""
        });
      } else if (overData?.type === "account" && active.id !== over.id && !sorting) {
        setNumpad({
          isOpen: true, type: "transfer", source: activeData.account, destination: overData.account,
          sourceAmount: "0", sourceCurrency: activeData.account.currency, targetAmount: "0", targetCurrency: overData.account.currency,
          targetLinked: true, activeField: "source", tag: null, comment: ""
        });
      }
    } else if (activeData?.type === "income" && overData?.type === "account") {
      const baseCur = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY) || "USD";
      const prefCur = localStorage.getItem("cl_numpad_pref_currency") || baseCur;
      setNumpad({
        isOpen: true, type: "income", source: activeData.income, destination: overData.account,
        sourceAmount: "0", sourceCurrency: prefCur, targetAmount: "0", targetCurrency: overData.account.currency,
        targetLinked: true, activeField: "source", tag: activeData.income.tags?.[0] || null, comment: ""
      });
    }
  }, [isSortingMode, hasMovedDuringDrag, accounts, categories, incomes, syncAccountsOrder, syncCategories, syncIncomes, setNumpad]);

  return {
    activeDragId, activeDragType, isSortingMode, setIsSortingMode, overId,
    handleDragStart, handleDragMove, handleDragOver, handleDragEnd
  };
};
