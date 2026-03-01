import React, { useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";

interface Account {
  id: string;
  name: string;
  balance: number;
  color: string;
  icon: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// === ДАННЫЕ ===
const initialAccounts: Account[] = [
  {
    id: "acc-1",
    name: "Cash",
    balance: 450,
    color: "#0df269",
    icon: "payments",
  },
  {
    id: "acc-2",
    name: "Card",
    balance: 1200,
    color: "#3b82f6",
    icon: "credit_card",
  },
  {
    id: "acc-3",
    name: "Savings",
    balance: 5000,
    color: "#fbbf24",
    icon: "savings",
  },
];

const initialCategories: Category[] = [
  { id: "cat-1", name: "Food", color: "#fb7185", icon: "nutrition" },
  { id: "cat-2", name: "Transit", color: "#3b82f6", icon: "directions_car" },
  { id: "cat-3", name: "Cafe", color: "#fbbf24", icon: "coffee" },
  { id: "cat-4", name: "Rent", color: "#0df269", icon: "home" },
  { id: "cat-5", name: "Subs", color: "#94a3b8", icon: "subscriptions" },
  { id: "cat-6", name: "Shop", color: "#94a3b8", icon: "shopping_bag" },
  { id: "cat-7", name: "Health", color: "#94a3b8", icon: "medical_services" },
  { id: "cat-8", name: "More", color: "#94a3b8", icon: "more_horiz" },
];

interface NumpadData {
  isOpen: boolean;
  account: Account | null;
  category: Category | null;
  amount: string;
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Состояние для кастомной клавиатуры
  const [numpadData, setNumpadData] = useState<NumpadData>({
    isOpen: false,
    account: null,
    category: null,
    amount: "0",
  });

  // Считаем общий баланс
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // === ОБРАБОТЧИКИ DRAG & DROP ===
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    // Если бросили монетку над категорией
    if (over && over.data.current?.type === "category") {
      const account = active.data.current?.account as Account;
      const category = over.data.current?.category as Category;

      // Открываем Numpad
      setNumpadData({ isOpen: true, account, category, amount: "0" });
    }
  };

  // === ОБРАБОТЧИКИ NUMPAD ===
  const handleNumpadPress = (val: string) => {
    setNumpadData((prev) => {
      if (prev.amount === "0" && val !== ".") return { ...prev, amount: val };
      if (prev.amount.includes(".") && val === ".") return prev;
      if (prev.amount.length > 8) return prev;
      return { ...prev, amount: prev.amount + val };
    });
  };

  const handleNumpadDelete = () => {
    setNumpadData((prev) => ({
      ...prev,
      amount: prev.amount.length > 1 ? prev.amount.slice(0, -1) : "0",
    }));
  };

  const saveTransaction = () => {
    const amountNum = parseFloat(numpadData.amount);
    if (amountNum > 0 && numpadData.account) {
      // Обновляем баланс счета
      setAccounts(
        accounts.map((acc) =>
          acc.id === numpadData.account!.id
            ? { ...acc, balance: acc.balance - amountNum }
            : acc,
        ),
      );
      // В будущем тут будет логика сохранения в историю (localStorage/БД)
    }
    setNumpadData({
      isOpen: false,
      account: null,
      category: null,
      amount: "0",
    });
  };

  const activeAccount = accounts.find((a) => a.id === activeDragId);

  return (
    <div className="bg-[#f5f8f7] dark:bg-[#0a120d] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-hidden font-[Manrope]">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Шапка */}
        <header className="flex items-center justify-between p-6 pt-12">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-[#0df269]/70">
              Total Balance
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">
              $
              {totalBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </h1>
          </div>
          <button className="h-12 w-12 rounded-full bg-[#16251c] flex items-center justify-center border border-white/5 hover:bg-[#0df269]/20 transition-colors">
            <span className="material-symbols-outlined text-[#0df269]">
              notifications
            </span>
          </button>
        </header>

        {/* Счета (Откуда тащим) */}
        <section className="px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Your Wallets
            </h2>
            <span className="material-symbols-outlined text-slate-500 text-sm">
              settings
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {accounts.map((account) => (
              <DraggableAccount
                key={account.id}
                account={account}
                isDragging={activeDragId === account.id}
              />
            ))}
            {/* Кнопка добавления счета */}
            <div className="flex flex-col items-center opacity-50 cursor-pointer">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                New
              </p>
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">add</span>
              </div>
            </div>
          </div>
        </section>

        {/* Разделитель */}
        <div className="px-6">
          <div className="h-px w-full bg-white/10 dark:bg-white/5"></div>
        </div>

        {/* Категории (Куда бросаем) */}
        <section className="flex-1 bg-[#16251c]/50 rounded-t-3xl border-t border-white/5 p-6 pb-28 mt-4">
          <div className="grid grid-cols-4 gap-6">
            {initialCategories.map((category) => (
              <DroppableCategory key={category.id} category={category} />
            ))}
          </div>
        </section>

        {/* Отрисовка монетки поверх всего при перетаскивании (Drag Overlay) */}
        <DragOverlay dropAnimation={null}>
          {activeAccount ? (
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)] scale-110"
              style={{
                backgroundColor: `${activeAccount.color}33`,
                border: `4px solid ${activeAccount.color}`,
              }}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{ color: activeAccount.color }}
              >
                {activeAccount.icon}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Backdrop for Numpad */}
      {numpadData.isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setNumpadData({ ...numpadData, isOpen: false })}
        />
      )}

      {/* Окно ввода суммы (Numpad Bottom Sheet) */}
      <div
        className={`fixed inset-x-0 bottom-0 bg-[#16251c] border-t border-white/10 rounded-t-3xl shadow-2xl transition-transform duration-300 z-50 flex flex-col ${numpadData.isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ height: "65vh" }}
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-3 mb-1" />
        <div className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full relative">
          <button
            onClick={() => setNumpadData({ ...numpadData, isOpen: false })}
            className="absolute top-2 right-4 text-slate-500 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          {numpadData.account && numpadData.category && (
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex flex-col items-center gap-1">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ color: numpadData.account.color }}
                >
                  {numpadData.account.icon}
                </span>
                <span className="text-xs text-slate-400">
                  {numpadData.account.name}
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-600 text-4xl">
                arrow_right_alt
              </span>
              <div className="flex flex-col items-center gap-1">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ color: numpadData.category.color }}
                >
                  {numpadData.category.icon}
                </span>
                <span className="text-xs text-slate-400">
                  {numpadData.category.name}
                </span>
              </div>
            </div>
          )}

          <div className="text-center mb-auto pt-4">
            <div className="text-[#0df269] text-5xl font-extrabold tracking-tighter">
              ${numpadData.amount}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0].map((num) => (
              <button
                key={num}
                onClick={() => handleNumpadPress(num.toString())}
                className="h-14 rounded-2xl bg-white/5 active:bg-white/10 text-2xl font-semibold text-white transition-colors"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleNumpadDelete}
              className="h-14 rounded-2xl bg-white/5 active:bg-white/10 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-white text-2xl">
                backspace
              </span>
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setNumpadData({ ...numpadData, isOpen: false })}
              className="flex-1 h-14 rounded-2xl bg-white/5 text-white font-bold active:bg-white/10"
            >
              CANCEL
            </button>
            <button
              onClick={saveTransaction}
              className="flex-[2] h-14 rounded-2xl bg-[#0df269] text-[#0a120d] font-bold text-lg active:bg-[#0df269]/80 shadow-[0_0_20px_rgba(13,242,105,0.3)]"
            >
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// === КОМПОНЕНТ СЧЕТА (DRAGGABLE) ===
const DraggableAccount: React.FC<{ account: Account; isDragging: boolean }> = ({
  account,
  isDragging,
}) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: account.id,
    data: { type: "account", account },
  });

  return (
    <div
      className={`flex flex-col items-center group transition-opacity ${isDragging ? "opacity-30" : "opacity-100"}`}
    >
      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 truncate w-full text-center">
        {account.name}
      </p>
      {/* touch-none обязателен, чтобы при перетаскивании экран не скроллился */}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="h-16 w-16 rounded-full flex items-center justify-center relative touch-none cursor-grab active:cursor-grabbing z-10"
        style={{
          backgroundColor: `${account.color}33`,
          border: `4px solid ${account.color}`,
        }}
      >
        <span
          className="material-symbols-outlined text-2xl"
          style={{ color: account.color }}
        >
          {account.icon}
        </span>
      </div>
      <p
        className="text-[10px] font-bold mt-1"
        style={{ color: account.color }}
      >
        ${account.balance.toLocaleString("en-US")}
      </p>
    </div>
  );
};

// === КОМПОНЕНТ КАТЕГОРИИ (DROPPABLE) ===
const DroppableCategory: React.FC<{ category: Category }> = ({ category }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: category.id,
    data: { type: "category", category },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col items-center transition-transform duration-200"
      style={{ transform: isOver ? "scale(1.1)" : "scale(1)" }}
    >
      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 truncate w-full text-center">
        {category.name}
      </p>
      <div
        className="h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          backgroundColor: isOver
            ? `${category.color}40`
            : "rgba(255,255,255,0.05)",
          border: `1px solid ${isOver ? category.color : "rgba(255,255,255,0.1)"}`,
          boxShadow: isOver ? `0 0 15px ${category.color}40` : "none",
        }}
      >
        <span
          className="material-symbols-outlined text-2xl transition-colors duration-300"
          style={{ color: isOver ? category.color : category.color }}
        >
          {category.icon}
        </span>
      </div>
      <p className="text-[10px] font-bold mt-1 text-emerald-500">$0</p>
    </div>
  );
};
