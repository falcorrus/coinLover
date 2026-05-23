import * as React from "react";
import { Sparkles, Flame, Coins, Zap, HelpCircle, X, Sun, Moon, Palette, BarChart3, ChevronRight, Award, RefreshCcw, Landmark, Compass, DollarSign, Wallet, ShoppingBag, Calendar, PieChart } from "lucide-react";
import { Account, Transaction } from "../../types";
import { IconMap } from "../../constants";
import { RatesService } from "../../services/RatesService";
import { safeParseDate } from "../../hooks/utils";

interface StoriesSectionProps {
  accounts: Account[];
  currentMonthTransactions: Transaction[];
  theme: string;
  setTheme: (theme: string) => void;
  setHistoryModal: (val: any) => void;
  setCalendarAnalyticsModal: (val: any) => void;
  setAnalyticsModal: (val: any) => void;
  categories: { id: string; name: string; color: string; icon: string }[];
}

interface Story {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
  slideCount: number;
}

export function StoriesSection({
  accounts,
  currentMonthTransactions,
  theme,
  setTheme,
  setHistoryModal,
  setCalendarAnalyticsModal,
  setAnalyticsModal,
  categories,
}: StoriesSectionProps) {
  const [viewedStories, setViewedStories] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("coinlover_viewed_stories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeStoryIndex, setActiveStoryIndex] = React.useState<number | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = React.useState<number>(0);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  // Gesture tracking refs
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);
  const touchStartTime = React.useRef(0);

  const mouseStartX = React.useRef(0);
  const mouseStartY = React.useRef(0);
  const mouseStartTime = React.useRef(0);

  // Tips Content (3 slides)
  const tips = [
    {
      title: "Сортировка жестом ⚙️",
      text: "Зажми и удерживай кошелек или категорию 1.5 секунды, чтобы войти в режим перетаскивания. Наведи порядок легким движением пальца!",
    },
    {
      title: "Быстрый ввод ✍️",
      text: "Перетащи иконку дохода на кошелек или кошелек на категорию расходов для моментальной записи транзакции. Drag-and-drop жесты делают учет приятным!",
    },
    {
      title: "Telegram-бот 🤖",
      text: "Устал вводить руками? Напиши нашему Telegram-боту, и он автоматически разнесет расходы из голосовых сообщений прямо в твою таблицу!",
    },
  ];

  // Simulated live rates
  const [rates] = React.useState(() => {
    const randomShift = (base: number) => base + (Math.random() - 0.5) * 0.4;
    return {
      fiat: [
        { code: "USD/RUB", value: randomShift(91.45).toFixed(2), change: "+0.32%", isUp: true },
        { code: "EUR/RUB", value: randomShift(98.60).toFixed(2), change: "-0.15%", isUp: false },
        { code: "USDT/RUB", value: randomShift(91.80).toFixed(2), change: "+0.08%", isUp: true },
      ],
      crypto: [
        { code: "BTC/USD", value: Math.round(67420 + (Math.random() - 0.5) * 300).toLocaleString(), change: "+2.40%", isUp: true },
        { code: "ETH/USD", value: Math.round(3480 + (Math.random() - 0.5) * 20).toLocaleString(), change: "+1.15%", isUp: true },
        { code: "SOL/USD", value: (168.45 + (Math.random() - 0.5) * 3).toFixed(2), change: "-0.85%", isUp: false },
      ]
    };
  });

  const stories: Story[] = [
    { id: "overview", title: "Обзор", icon: BarChart3, color: "#a78bfa", gradient: "from-[#a78bfa] to-[#6d5dfc]", slideCount: 3 },
    { id: "zen", title: "Дзен", icon: Flame, color: "#f43f5e", gradient: "from-[#f43f5e] to-[#ec4899]", slideCount: 3 },
    { id: "rates", title: "Курсы", icon: Coins, color: "#10b981", gradient: "from-[#10b981] to-[#059669]", slideCount: 2 },
    { id: "tips", title: "Фишки", icon: HelpCircle, color: "#3b82f6", gradient: "from-[#3b82f6] to-[#2563eb]", slideCount: 3 },
    { id: "actions", title: "Пульт", icon: Zap, color: "#eab308", gradient: "from-[#eab308] to-[#ca8a04]", slideCount: 1 },
  ];

  // Mark story as viewed
  const markAsViewed = (id: string) => {
    if (!viewedStories.includes(id)) {
      const updated = [...viewedStories, id];
      setViewedStories(updated);
      localStorage.setItem("coinlover_viewed_stories", JSON.stringify(updated));
    }
  };

  // Open story player
  const handleStoryClick = (index: number) => {
    setActiveStoryIndex(index);
    setActiveSlideIndex(0);
    setProgress(0);
    setIsPaused(false);
    markAsViewed(stories[index].id);
  };

  // Switch to next slide or next story
  const handleNext = () => {
    if (activeStoryIndex === null) return;
    const currentStory = stories[activeStoryIndex];

    if (activeSlideIndex < currentStory.slideCount - 1) {
      setActiveSlideIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      if (activeStoryIndex < stories.length - 1) {
        const nextIndex = activeStoryIndex + 1;
        setActiveStoryIndex(nextIndex);
        setActiveSlideIndex(0);
        setProgress(0);
        markAsViewed(stories[nextIndex].id);
      } else {
        setActiveStoryIndex(null);
      }
    }
  };

  // Switch to previous slide or previous story
  const handlePrev = () => {
    if (activeStoryIndex === null) return;

    if (activeSlideIndex > 0) {
      setActiveSlideIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      if (activeStoryIndex > 0) {
        const prevIndex = activeStoryIndex - 1;
        const prevStory = stories[prevIndex];
        setActiveStoryIndex(prevIndex);
        setActiveSlideIndex(prevStory.slideCount - 1);
        setProgress(0);
        markAsViewed(stories[prevIndex].id);
      } else {
        setProgress(0);
      }
    }
  };

  // Auto-advance logic (5 seconds per slide)
  React.useEffect(() => {
    if (activeStoryIndex === null || isPaused) return;

    const intervalTime = 50; // ms
    const increment = (intervalTime / 5000) * 100; // 5000ms duration

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeStoryIndex, activeSlideIndex, isPaused]);

  // Touch Gesture Handlers (swipes)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;
    setIsPaused(false);

    // Swipe down to close
    if (diffY > 80 && Math.abs(diffX) < 100) {
      setActiveStoryIndex(null);
      return;
    }

    // Swipes left (next) and right (prev)
    if (diffX > 80 && Math.abs(diffY) < 100) {
      handlePrev();
      return;
    }
    if (diffX < -80 && Math.abs(diffY) < 100) {
      handleNext();
      return;
    }
  };

  // Mouse Drag Gestures (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    mouseStartY.current = e.clientY;
    mouseStartTime.current = Date.now();
    setIsPaused(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const diffX = e.clientX - mouseStartX.current;
    const diffY = e.clientY - mouseStartY.current;
    setIsPaused(false);

    // Swipe down to close
    if (diffY > 80 && Math.abs(diffX) < 100) {
      setActiveStoryIndex(null);
      return;
    }

    // Swipes left (next) and right (prev)
    if (diffX > 80 && Math.abs(diffY) < 100) {
      handlePrev();
      return;
    }
    if (diffX < -80 && Math.abs(diffY) < 100) {
      handleNext();
      return;
    }
  };

  // Reset viewed stories for testing
  const resetStoriesState = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewedStories([]);
    localStorage.removeItem("coinlover_viewed_stories");
  };

  // --- Real financial calculations using RatesService for multi-currency safety ---
  const baseCurrency = RatesService.getBaseCurrency();
  
  const getSymbol = (code: string) => {
    if (!code || !isNaN(Number(code))) return "$";
    const symbols: Record<string, string> = { "USD": "$", "EUR": "€", "GBP": "£", "RUB": "₽", "RSD": "din", "BRL": "R$", "ARS": "ARS" };
    return symbols[code.toUpperCase()] || code;
  };
  const baseSymbol = getSymbol(baseCurrency);

  // Total balance base (precise cross-rate converted)
  const totalBalanceBase = Math.round(accounts.reduce((s, a) => {
    const aCurr = a.currency || baseCurrency;
    const balance = isNaN(Number(a.balance)) ? 0 : a.balance;
    return s + RatesService.convert(balance, aCurr, baseCurrency);
  }, 0));

  // Current month totals (precise cross-rate converted)
  const expensesThisMonth = Math.round(currentMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => {
      const account = accounts.find((a) => a.id === t.accountId);
      const sCurr = t.sourceCurrency || account?.currency || baseCurrency;
      const amount = isNaN(Number(t.sourceAmount)) ? 0 : t.sourceAmount;
      return s + RatesService.convert(amount, sCurr, baseCurrency);
    }, 0));

  const incomeThisMonth = Math.round(currentMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => {
      const account = accounts.find((a) => a.id === t.accountId);
      const tCurr = t.targetCurrency || account?.currency || baseCurrency;
      const amount = isNaN(Number(t.targetAmount)) ? 0 : t.targetAmount;
      return s + RatesService.convert(amount, tCurr, baseCurrency);
    }, 0));

  // Today totals - Highly robust today detection combining prefix matching and components check
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const todayPrefix = `${String(currentDay).padStart(2, '0')}.${String(currentMonth + 1).padStart(2, '0')}.${currentYear}`;

  const todayTransactions = currentMonthTransactions
    .filter((t) => {
      if (t.type !== "expense") return false;
      const dateStr = String(t.date || "").trim();
      
      // 1. Direct string prefix match (e.g. "22.05.2026 23:55" starts with "22.05.2026")
      if (dateStr.startsWith(todayPrefix)) return true;

      // 2. Component match via safeParseDate
      const d = safeParseDate(t.date);
      return (
        !isNaN(d.getTime()) &&
        d.getDate() === currentDay &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      );
    });

  const spentToday = Math.round(todayTransactions
    .reduce((s, t) => {
      const account = accounts.find((a) => a.id === t.accountId);
      const sCurr = t.sourceCurrency || account?.currency || baseCurrency;
      const amount = isNaN(Number(t.sourceAmount)) ? 0 : t.sourceAmount;
      return s + RatesService.convert(amount, sCurr, baseCurrency);
    }, 0));

  const latestTodayTransactions = [...todayTransactions]
    .sort((a, b) => safeParseDate(b.date).getTime() - safeParseDate(a.date).getTime())
    .slice(0, 3);

  const hasSpendToday = spentToday > 0;

  // Real data: Precise Currency Capital Split
  const totalInBase = accounts.reduce((sum, a) => {
    return sum + RatesService.convert(a.balance, a.currency, baseCurrency);
  }, 0);

  const currencyBaseMap: { [key: string]: number } = {};
  accounts.forEach((a) => {
    currencyBaseMap[a.currency] = (currencyBaseMap[a.currency] || 0) + RatesService.convert(a.balance, a.currency, baseCurrency);
  });

  const currencySplit = Object.keys(currencyBaseMap).map((cur) => {
    const totalOriginalAmt = accounts.filter(a => a.currency === cur).reduce((sum, a) => sum + a.balance, 0);
    const inBase = currencyBaseMap[cur];
    const percentage = totalInBase > 0 ? Math.round((inBase / totalInBase) * 100) : 0;
    return {
      currency: cur,
      amount: totalOriginalAmt,
      percentage: Math.round(percentage),
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Real data: TOP-3 Expenses Categories (Precise cross-rate converted to baseCurrency)
  const categoryExpensesMap: { [key: string]: number } = {};
  currentMonthTransactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const account = accounts.find((a) => a.id === t.accountId);
      const sCurr = t.sourceCurrency || account?.currency || baseCurrency;
      const amount = isNaN(Number(t.sourceAmount)) ? 0 : t.sourceAmount;
      const amountBase = RatesService.convert(amount, sCurr, baseCurrency);
      categoryExpensesMap[t.targetId] = (categoryExpensesMap[t.targetId] || 0) + amountBase;
    });

  const totalExpenses = Object.values(categoryExpensesMap).reduce((sum, amt) => sum + amt, 0);

  const topCategories = Object.keys(categoryExpensesMap)
    .map((catId) => {
      const category = categories.find((c) => c.id === catId);
      const amountBase = categoryExpensesMap[catId];
      const percentage = totalExpenses > 0 ? Math.round((amountBase / totalExpenses) * 100) : 0;
      return {
        id: catId,
        name: category?.name || "Другое",
        color: category?.color || "#6b7280",
        icon: category?.icon || "ShoppingBag",
        amount: amountBase,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Render Multi-Slide Content
  const renderStoryContent = (id: string, slideIdx: number) => {
    switch (id) {
      case "overview":
        if (slideIdx === 0) {
          return (
            <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-[#a78bfa]/20 flex items-center justify-center text-[#a78bfa] shadow-[0_0_20px_rgba(167,139,250,0.15)]">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)] font-sans tracking-wide">Твой май в цифрах</h3>
                    <p className="text-xs text-[var(--text-muted)]">Общая сводка активов</p>
                  </div>
                </div>

                <div className="mt-8 p-5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-4 backdrop-blur-md shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Общий баланс</span>
                    <div className="text-3xl font-black text-[var(--text-main)] font-sans mt-0.5">
                      {totalBalanceBase.toLocaleString()} <span className="text-sm font-normal text-[var(--text-muted)]">{baseSymbol}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--glass-border)]">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-emerald-500/70 tracking-wider">Получено</span>
                      <div className="text-lg font-bold text-emerald-500 mt-0.5">
                        +{incomeThisMonth.toLocaleString()} <span className="text-xs font-normal text-emerald-500/60">{baseSymbol}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-rose-500/70 tracking-wider">Потрачено</span>
                      <div className="text-lg font-bold text-rose-500 mt-0.5">
                        -{expensesThisMonth.toLocaleString()} <span className="text-xs font-normal text-rose-500/60">{baseSymbol}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center p-3 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Листай дальше, чтобы увидеть структуру капитала по валютам 👉
                </span>
              </div>
            </div>
          );
        } else if (slideIdx === 1) {
          return (
            <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-[#a78bfa]/20 flex items-center justify-center text-[#a78bfa] shadow-[0_0_20px_rgba(167,139,250,0.15)]">
                    <Coins size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)] font-sans tracking-wide">Валютный сплит</h3>
                    <p className="text-xs text-[var(--text-muted)]">Распределение твоего капитала</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3.5">
                  {currencySplit.map((split, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-2 backdrop-blur-md shadow-sm">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-sm text-[var(--text-main)]">{split.currency}</span>
                        <div className="text-right">
                          <span className="font-bold text-sm text-[var(--text-main)] block">{Math.round(split.amount).toLocaleString()} {split.currency}</span>
                          <span className="text-[10px] font-bold text-[var(--text-muted)]">{split.percentage}% от всех средств</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--text-muted)]/15 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
                          style={{ width: `${split.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center p-3 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Листай дальше, чтобы оценить использование доходов 👉
                </span>
              </div>
            </div>
          );
        } else {
          return (
            <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-[#a78bfa]/20 flex items-center justify-center text-[#a78bfa] shadow-[0_0_20px_rgba(167,139,250,0.15)]">
                    <Compass size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)] font-sans tracking-wide">Использование доходов</h3>
                    <p className="text-xs text-[var(--text-muted)]">Анализ сбережений</p>
                  </div>
                </div>

                {incomeThisMonth > 0 ? (
                  <div className="p-5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-4 backdrop-blur-md shadow-sm">
                    <div className="flex justify-between text-sm text-[var(--text-muted)]">
                      <span>Потрачено от полученного</span>
                      <span className="font-bold text-[var(--text-main)]">{Math.round((expensesThisMonth / incomeThisMonth) * 100)}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--text-muted)]/15 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                        style={{ width: `${Math.min((expensesThisMonth / incomeThisMonth) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-2">
                      Из каждых полученных 100 {baseSymbol} ты откладываешь <span className="font-bold text-[var(--text-main)]">{Math.max(0, Math.round(100 - (expensesThisMonth / incomeThisMonth) * 100))} {baseSymbol}</span>.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] text-center text-xs text-[var(--text-muted)] leading-relaxed shadow-sm">
                    🤷‍♂️ В этом месяце пока нет доходов. Запиши поступления, чтобы увидеть подробную динамику распределения бюджета!
                  </div>
                )}
              </div>

              <div className="text-center p-3 bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 rounded-2xl animate-pulse">
                <span className="text-xs font-semibold text-[var(--primary-color)]">
                  {incomeThisMonth > expensesThisMonth ? "💰 Отличная работа! Твой доход превышает расходы." : "⚠️ Будь осторожен, траты превысили доходы."}
                </span>
              </div>
            </div>
          );
        }

      case "zen":
        if (slideIdx === 0) {
          return (
            <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
              <div className="space-y-4 text-center">
                <div className={`mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)] animate-bounce duration-1000 ${hasSpendToday ? 'w-14 h-14' : 'w-20 h-20'}`}>
                  <Flame size={hasSpendToday ? 28 : 40} className="fill-rose-500/10" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-[var(--text-main)]">
                    {hasSpendToday ? "Финансовая карма" : "День без трат! 🔥"}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] tracking-wide">
                    {hasSpendToday ? "Все сегодняшние расходы под полным контролем" : "Твой кошелек сегодня полностью отдыхает"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-3.5 backdrop-blur-md text-left shadow-sm">
                  {hasSpendToday ? (
                    <p className="text-xs text-[var(--text-main)] opacity-90 leading-relaxed">
                      Сегодня записано трат на сумму <span className="font-bold text-rose-500">{spentToday.toLocaleString()} {baseSymbol}</span>. 
                      Каждая транзакция — это шаг к осознанному управлению капиталом.
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--text-main)] opacity-90 leading-relaxed">
                      Сегодня у тебя <span className="font-bold text-emerald-500">No-Spend Day</span>. Твой кошелек говорит спасибо, а свободные ресурсы накапливаются!
                    </p>
                  )}

                  {hasSpendToday && latestTodayTransactions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]/50">
                      <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">Детализация за день:</span>
                      <div className="space-y-1.5 max-h-[145px] overflow-y-auto hide-scrollbar">
                        {latestTodayTransactions.map((tx, idx) => {
                          const category = categories.find((c) => c.id === tx.targetId);
                          const Icon = IconMap[category?.icon || "ShoppingBag"] || ShoppingBag;
                          const catColor = category?.color || "#f43f5e";
                          return (
                            <div key={tx.id || idx} className="flex justify-between items-center p-2 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)]/40 backdrop-blur-sm">
                              <div className="flex items-center gap-2 max-w-[70%]">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: `${catColor}12`, border: `1px solid ${catColor}20` }}
                                >
                                  <Icon size={13} style={{ color: catColor }} />
                                </div>
                                <div className="truncate">
                                  <span className="font-bold text-[11px] text-[var(--text-main)] block truncate leading-snug">
                                    {category?.name || "Другое"}
                                  </span>
                                  {tx.comment && (
                                    <span className="text-[9px] text-[var(--text-muted)] block truncate leading-none mt-0.5 opacity-80">
                                      {tx.comment}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono font-bold text-xs text-rose-500/90 whitespace-nowrap">
                                -{Math.round(tx.sourceAmount).toLocaleString()} {getSymbol(tx.sourceCurrency)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {todayTransactions.length > 3 && (
                        <span className="text-[9px] text-[var(--text-muted)] font-bold block text-center pt-0.5 opacity-85">
                          + еще {todayTransactions.length - 3} трат за сегодня
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center p-3 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Листай дальше, чтобы увидеть топ-категории расходов 👉
                </span>
              </div>
            </div>
          );
        } else if (slideIdx === 1) {
          return (
            <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)] font-sans tracking-wide">Топ расходов</h3>
                    <p className="text-xs text-[var(--text-muted)]">Главные статьи расходов в мае (в {baseSymbol})</p>
                  </div>
                </div>

                {topCategories.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {topCategories.map((cat, idx) => {
                      const Icon = IconMap[cat.icon] || ShoppingBag;
                      return (
                        <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] backdrop-blur-md shadow-sm">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
                            >
                              <Icon size={18} style={{ color: cat.color }} />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-[var(--text-main)] block">{cat.name}</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{cat.percentage}% от всех трат</span>
                            </div>
                          </div>
                          <span className="font-bold text-sm text-[var(--text-main)]">
                            -{Math.round(cat.amount).toLocaleString()} {baseSymbol}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] text-center text-xs text-[var(--text-muted)] shadow-sm">
                    🤷‍♂️ В этом месяце пока нет расходов. Твои главные категории появятся здесь сразу после добавления трат!
                  </div>
                )}
              </div>

              <div className="text-center p-3 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Листай дальше, чтобы спланировать вечер 👉
                </span>
              </div>
            </div>
          );
        } else {
          return (
            <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
              <div className="space-y-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <Landmark size={28} />
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--text-main)]">Осознанный вечер</h3>
                  <p className="text-xs text-[var(--text-muted)]">Заверши день правильно</p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-3 text-left shadow-sm backdrop-blur-md">
                  <p className="text-xs text-[var(--text-main)] opacity-80 leading-relaxed">
                    Вечерний финансовый ритуал очищает мысли. Вспомни все сегодняшние покупки: кофе на ходу, такси или мелкие траты. Запиши их в пару кликов, чтобы поддерживать идеальный баланс и учет.
                  </p>
                  <div className="text-xs p-2.5 rounded bg-[var(--glass-item-active)] border border-[var(--glass-border)] text-[var(--text-main)] text-center font-bold">
                    🧘‍♂️ Твоя карма — в твоем контроле!
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveStoryIndex(null);
                  setCalendarAnalyticsModal({ isOpen: true });
                }}
                className="w-full py-3.5 rounded-2xl bg-[var(--glass-item-bg)] hover:bg-[var(--glass-item-active)] border border-[var(--glass-border)] font-bold text-xs uppercase tracking-wider text-[var(--text-main)] transition-all"
              >
                Открыть календарь трат
              </button>
            </div>
          );
        }

      case "rates":
        if (slideIdx === 0) {
          return (
            <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    <Coins size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)]">Фиатные курсы</h3>
                    <p className="text-xs text-[var(--text-muted)]">Мировые валюты к рублю</p>
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  {rates.fiat.map((rate, i) => (
                    <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] transition-all backdrop-blur-md shadow-sm">
                      <span className="font-bold text-sm text-[var(--text-main)] opacity-90">{rate.code}</span>
                      <div className="text-right">
                        <div className="font-bold text-sm text-[var(--text-main)]">{rate.value}</div>
                        <span className={`text-[10px] font-bold ${rate.isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {rate.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl text-center">
                <span className="text-[10px] text-[var(--text-muted)]">Листай дальше, чтобы увидеть криптовалюты 👉</span>
              </div>
            </div>
          );
        } else {
          return (
            <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)]">Криптовалюта</h3>
                    <p className="text-xs text-[var(--text-muted)]">Курсы цифровых активов</p>
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  {rates.crypto.map((rate, i) => (
                    <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] transition-all backdrop-blur-md shadow-sm">
                      <span className="font-bold text-sm text-[var(--text-main)] opacity-90">{rate.code}</span>
                      <div className="text-right">
                        <div className="font-bold text-sm text-[var(--text-main)]">{rate.value}</div>
                        <span className={`text-[10px] font-bold ${rate.isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {rate.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl text-center">
                <span className="text-[10px] text-[var(--text-muted)]">Курсы обновляются автоматически при синхронизации.</span>
              </div>
            </div>
          );
        }

      case "tips":
        return (
          <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[var(--text-main)]">Фишка #{slideIdx + 1}</h3>
                  <p className="text-xs text-[var(--text-muted)]">Секреты использования</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-4 shadow-sm backdrop-blur-md min-h-[180px] flex flex-col justify-center">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <Award size={18} />
                </div>
                <h4 className="font-bold text-base text-[var(--text-main)]">{tips[slideIdx].title}</h4>
                <p className="text-xs text-[var(--text-main)] opacity-80 leading-relaxed">{tips[slideIdx].text}</p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3.5 rounded-2xl bg-[var(--glass-item-bg)] hover:bg-[var(--glass-item-active)] border border-[var(--glass-border)] font-bold text-xs uppercase tracking-wider text-[var(--text-main)] flex items-center justify-center gap-2 transition-all"
            >
              {slideIdx === stories[3].slideCount - 1 ? "Закрыть советы" : "Далее"} <ChevronRight size={14} />
            </button>
          </div>
        );

      case "actions":
        return (
          <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[var(--text-main)]">Быстрый пульт</h3>
                  <p className="text-xs text-[var(--text-muted)]">Интерактивное управление</p>
                </div>
              </div>

              <div className="space-y-2">
                {/* Theme Action */}
                <button
                  onClick={() => setTheme(theme === "dark" ? "white" : theme === "white" ? "mint" : "dark")}
                  className="w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      {theme === "dark" ? <Sun size={16} /> : theme === "white" ? <Palette size={16} /> : <Moon size={16} />}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[var(--text-main)] block">Сменить тему</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{theme} theme</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </button>

                {/* Analytical Report Action */}
                <button
                  onClick={() => {
                    setActiveStoryIndex(null);
                    setHistoryModal({ isOpen: true, entity: { name: "Все транзакции", icon: "feed" }, type: "feed" });
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
                      <BarChart3 size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[var(--text-main)] block">История операций</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">Финансовая лента</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </button>

                {/* Calendar Action */}
                <button
                  onClick={() => {
                    setActiveStoryIndex(null);
                    setCalendarAnalyticsModal({ isOpen: true });
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[var(--text-main)] block">Календарь трат</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">Сетка расходов</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </button>

                {/* Analytics Action */}
                <button
                  onClick={() => {
                    setActiveStoryIndex(null);
                    setAnalyticsModal({ isOpen: true, type: "expense" });
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                      <PieChart size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[var(--text-main)] block">Аналитика трат</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">Диаграмма расходов</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </button>

                {/* Reset viewed stories */}
                <button
                  onClick={resetStoriesState}
                  className="w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                      <RefreshCcw size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[var(--text-main)] block">Сбросить просмотры</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">Обнулить кэш сторис</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveStoryIndex(null)}
              className="w-full py-3.5 rounded-2xl bg-[var(--glass-item-bg)] hover:bg-[var(--glass-item-active)] border border-[var(--glass-border)] font-bold text-xs uppercase tracking-wider text-[var(--text-main)] transition-all"
            >
              Готово
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <>
      {/* 1. Horizontal Stories Bar */}
      <section className="px-6 py-2 shrink-0 relative z-20">
        <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
          {stories.map((story, index) => {
            const Icon = story.icon;
            const isViewed = viewedStories.includes(story.id);
            return (
              <div
                key={story.id}
                onClick={() => handleStoryClick(index)}
                className="flex flex-col items-center space-y-1.5 cursor-pointer shrink-0 group"
              >
                {/* Story Circle wrapper */}
                <div
                  className={`w-[54px] h-[54px] rounded-full p-[2.5px] transition-all duration-300 ${
                    isViewed
                      ? "border border-[var(--glass-border)] bg-transparent"
                      : `bg-gradient-to-tr ${story.gradient} p-[2px] shadow-[0_0_12px_rgba(109,93,252,0.15)] group-hover:scale-105`
                  }`}
                >
                  {/* Inner circle */}
                  <div className="w-full h-full rounded-full bg-[var(--bg-color)] flex items-center justify-center border border-[var(--glass-border)] shadow-inner">
                    <Icon
                      size={20}
                      style={{ color: isViewed ? "var(--text-muted)" : story.color }}
                      className={`transition-all ${!isViewed ? "drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" : ""}`}
                    />
                  </div>
                </div>
                {/* Under-title */}
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    isViewed ? "text-[var(--text-muted)] opacity-60" : "text-[var(--text-main)] opacity-85"
                  } transition-colors`}
                >
                  {story.title}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Full-Screen Stories Player Modal */}
      {activeStoryIndex !== null && activeStory && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-2xl animate-in fade-in duration-200 select-none bg-[var(--bg-color)]/95"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          {/* Main Card with Premium linear glow */}
          <div
            className="w-full max-w-md h-full flex flex-col justify-between relative overflow-hidden bg-[var(--bg-color)] border-x border-[var(--glass-border)] shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing on tap details
          >
            {/* Transparent Tap Zone Left (25% width) for Navigating Back */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-[25%] z-40 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            />

            {/* Transparent Tap Zone Right (25% width) for Navigating Forward */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-[25%] z-40 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
            />

            {/* Ambient Background Glow matching the active story color */}
            <div
              className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-[0.08] blur-[100px] pointer-events-none transition-all duration-500"
              style={{ backgroundColor: activeStory.color }}
            />
            <div
              className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-[0.06] blur-[100px] pointer-events-none transition-all duration-500"
              style={{ backgroundColor: activeStory.color }}
            />

            {/* Top Segmented Progress Indicators matching slides count inside current story */}
            <div className="px-4 pt-4 pb-2 z-50 space-y-3">
              <div className="flex gap-1.5 w-full">
                {Array.from({ length: activeStory.slideCount }).map((_, idx) => {
                  let widthPercent = 0;
                  if (idx < activeSlideIndex) widthPercent = 100;
                  else if (idx === activeSlideIndex) widthPercent = progress;

                  return (
                    <div key={idx} className="h-[2.5px] flex-1 rounded-full bg-[var(--text-muted)]/20 overflow-hidden">
                      <div
                        className="h-full bg-[var(--text-main)] transition-all duration-75"
                        style={{
                          width: `${widthPercent}%`,
                          transitionTimingFunction: "linear",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Story Header */}
              <div className="flex justify-between items-center relative z-50">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${activeStory.color}15`, border: `1px solid ${activeStory.color}30` }}
                  >
                    {React.createElement(activeStory.icon, { size: 14, style: { color: activeStory.color } })}
                  </div>
                  <span className="text-xs font-bold text-[var(--text-main)] tracking-wide uppercase font-sans">
                    {activeStory.title}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStoryIndex(null);
                  }}
                  className="w-8 h-8 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all hover:scale-105 active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Story Content Area */}
            <div className="flex-1 px-4 py-2 relative z-10 overflow-y-auto hide-scrollbar">
              {renderStoryContent(activeStory.id, activeSlideIndex)}
            </div>

            {/* Bottom Swiped-up Helper */}
            <div className="pb-6 pt-2 text-center pointer-events-none opacity-40">
              <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
                ◀ Нажми по краям или свайпни ▶
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
