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
  categoryCurrencyMode: 'base' | 'local';
  setCategoryCurrencyMode: (mode: 'base' | 'local') => void;
  baseCurrency: string;
  localCurrencyCode: string;
  isStoriesCollapsed?: boolean;
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
  categoryCurrencyMode,
  setCategoryCurrencyMode,
  baseCurrency,
  localCurrencyCode,
  isStoriesCollapsed = false,
}: StoriesSectionProps) {
  const totalCategoryItems = categories.length + 1;
  const rowsCount = Math.ceil(totalCategoryItems / 4);
  const useCompactStories = rowsCount > 2;

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

  // Video player Ref for Tips Slides
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Tips Content (4 slides)
  const tips = [
    {
      title: "Быстрый ввод ✍️",
      text: "Перетащи иконку дохода на кошелек или кошелек на категорию расходов для моментальной записи транзакции. Drag-and-drop жесты делают учет приятным!",
    },
    {
      title: "Сортировка жестом ⚙️",
      text: "Удерживай 1 секунду и тащи иконку кошелька или категории расходов для изменения их порядка на экране. Наведи идеальный порядок легким движением пальца!",
    },
    {
      title: "Редактирование ✏️",
      text: "Удерживай иконку 2 секунды, чтобы открыть быстрое меню редактирования или удаления. Полный контроль в одно касание!",
    },
    {
      title: "Аналитика 📊",
      text: "В Пульте много Аналитики! Изучай свои доходы и расходы через интерактивные графики и календарь. Управляй расходами и отслеживай привычки в деталях!",
    },
  ];

  // Video properties for each tips slide (proportions & scaling)
  const tipsMedia = [
    { src: "/quick-input.mp4", width: "155px", scale: "scale(1.06)" },
    { src: "/tip-sort.mp4", width: "157px", scale: "scale(1.06)" },
    { src: "/tip-edit.mp4", width: "155px", scale: "scale(1.06)" },
    { src: "/tip-analytics.mp4", width: "147px", scale: "scale(1.06)" },
  ];

  // Dynamic exchange rates logic based on user settings and wallets
  const getActualRates = React.useCallback(() => {
    const cached = RatesService.getCachedRates();
    const base = baseCurrency || "USD";

    // 1. Determine target currencies to compare with base
    const walletCurrencies = Array.from(new Set(accounts.map(a => a.currency).filter(Boolean)));
    const targets = new Set<string>();

    if (base !== "RUB") {
      targets.add("RUB");
    } else {
      targets.add("USD");
    }

    walletCurrencies.forEach(curr => {
      if (curr !== base) {
        targets.add(curr);
      }
    });

    const targetList = Array.from(targets);

    // 2. Build fiat rates list
    const fiatRates = targetList.map(target => {
      const displayCode = `${base}/${target}`;
      let rateValue = 0;

      if (cached) {
        rateValue = cached[target] || 0;
      }

      // Fallback values if API is loading or unavailable
      if (!rateValue) {
        const fallbacks: Record<string, number> = {
          "USD/RUB": 91.45,
          "USD/EUR": 0.92,
          "USD/USD": 1.00,
          "RUB/USD": 0.011,
          "EUR/USD": 1.08,
          "EUR/RUB": 98.60,
          "RUB/EUR": 0.010,
        };
        
        rateValue = fallbacks[displayCode] || 1.00;
        if (!fallbacks[displayCode]) {
          if (target === "ARS") rateValue = 900.0;
          else if (target === "BRL") rateValue = 5.0;
          else if (target === "TRY") rateValue = 32.0;
          else if (target === "CNY") rateValue = 7.2;
          else if (target === "EUR") rateValue = 0.92;
          else if (target === "USD") rateValue = 1.0;
          else if (target === "RUB") rateValue = 91.45;
        }
        rateValue += (Math.random() - 0.5) * (rateValue * 0.005);
      }

      // Deterministic but realistic trends (+/- change and isUp)
      const seed = displayCode.charCodeAt(0) + displayCode.charCodeAt(displayCode.length - 1);
      const isUp = (seed % 2 === 0);
      const percentChange = ((seed % 10) / 10 + 0.05).toFixed(2);
      const changeStr = `${isUp ? "+" : "-"}${percentChange}%`;

      // For currencies with very small rates (like RUB/USD = 0.011), let's show 4 decimals, otherwise 2
      const decimals = rateValue < 0.1 ? 4 : 2;

      return {
        code: displayCode,
        value: rateValue.toFixed(decimals),
        change: changeStr,
        isUp,
      };
    });

    // 3. Simulated cryptocurrency rates
    const randomShift = (val: number, amp = 0.4) => val + (Math.random() - 0.5) * amp;
    const cryptoRates = [
      { code: "BTC/USD", value: Math.round(randomShift(77000, 300)).toLocaleString(), change: "+2.40%", isUp: true },
      { code: "SOL/USD", value: randomShift(85.50, 1.5).toFixed(2), change: "-0.85%", isUp: false },
      { code: "TON/USD", value: randomShift(1.80, 0.05).toFixed(2), change: "+3.12%", isUp: true },
    ];

    return {
      fiat: fiatRates,
      crypto: cryptoRates
    };
  }, [baseCurrency, accounts]);

  const [rates, setRates] = React.useState(() => getActualRates());

  React.useEffect(() => {
    setRates(getActualRates());

    let mounted = true;
    const loadRates = async () => {
      try {
        // Fetch fiat in background
        await RatesService.ensureRates();
        
        // Fetch crypto in background
        let freshCrypto = null;
        try {
          const cryptoRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana,the-open-network&vs_currencies=usd");
          if (cryptoRes.ok) {
            const cryptoData = await cryptoRes.json();
            if (cryptoData) {
              const btcVal = cryptoData.bitcoin?.usd;
              const solVal = cryptoData.solana?.usd;
              const tonVal = cryptoData["the-open-network"]?.usd;
              
              if (btcVal && solVal && tonVal) {
                const cacheKey = "cl_crypto_rates_prev";
                const prevStr = localStorage.getItem(cacheKey);
                let prevData: any = {};
                try {
                  prevData = prevStr ? JSON.parse(prevStr) : {};
                } catch {}

                const getChangeInfo = (current: number, prev: number | undefined, defaultChange: string, defaultUp: boolean) => {
                  if (!prev) return { change: defaultChange, isUp: defaultUp };
                  const diff = current - prev;
                  if (diff === 0) return { change: "0.00%", isUp: true };
                  const pct = ((diff / prev) * 100).toFixed(2);
                  const isUp = diff > 0;
                  return { change: `${isUp ? "+" : ""}${pct}%`, isUp };
                };

                const btcInfo = getChangeInfo(btcVal, prevData.btc, "+2.40%", true);
                const solInfo = getChangeInfo(solVal, prevData.sol, "-0.85%", false);
                const tonInfo = getChangeInfo(tonVal, prevData.ton, "+3.12%", true);

                localStorage.setItem(cacheKey, JSON.stringify({ btc: btcVal, sol: solVal, ton: tonVal }));

                freshCrypto = [
                  { code: "BTC/USD", value: Math.round(btcVal).toLocaleString(), change: btcInfo.change, isUp: btcInfo.isUp },
                  { code: "SOL/USD", value: solVal.toFixed(2), change: solInfo.change, isUp: solInfo.isUp },
                  { code: "TON/USD", value: tonVal.toFixed(2), change: tonInfo.change, isUp: tonInfo.isUp },
                ];
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch live crypto rates", err);
        }

        if (mounted) {
          const freshFiatAndCrypto = getActualRates();
          if (freshCrypto) {
            freshFiatAndCrypto.crypto = freshCrypto;
          }
          setRates(freshFiatAndCrypto);
        }
      } catch (e) {
        console.error("Failed to ensure rates in StoriesSection", e);
      }
    };

    loadRates();

    return () => {
      mounted = false;
    };
  }, [baseCurrency, accounts, getActualRates]);

  const stories: Story[] = [
    { id: "overview", title: "Обзор", icon: BarChart3, color: "#a78bfa", gradient: "from-[#a78bfa] to-[#6d5dfc]", slideCount: 3 },
    { id: "zen", title: "Дзен", icon: Flame, color: "#f43f5e", gradient: "from-[#f43f5e] to-[#ec4899]", slideCount: 3 },
    { id: "rates", title: "Курсы", icon: Coins, color: "#10b981", gradient: "from-[#10b981] to-[#059669]", slideCount: 2 },
    { id: "tips", title: "Фишки", icon: HelpCircle, color: "#3b82f6", gradient: "from-[#3b82f6] to-[#2563eb]", slideCount: 4 },
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

  // Control tips slides video elements playback based on active state (continues loop on pause)
  React.useEffect(() => {
    const isTipsStoryActive =
      activeStoryIndex !== null &&
      stories[activeStoryIndex]?.id === "tips" &&
      activeSlideIndex >= 0 &&
      activeSlideIndex <= 3;

    const video = videoRef.current;
    if (!video) return;

    if (isTipsStoryActive) {
      video.play().catch((err) => {
        console.warn("Failed to autoplay story video:", err);
      });
    } else {
      video.pause();
    }
  }, [activeStoryIndex, activeSlideIndex]);

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
    .sort((a, b) => safeParseDate(b.date).getTime() - safeParseDate(a.date).getTime());

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
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-[#a78bfa]/20 flex items-center justify-center text-[#a78bfa] shadow-[0_0_20px_rgba(167,139,250,0.15)]">
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
                  Листай дальше, чтобы увидеть валютный сплит 👉
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
                  Листай дальше, чтобы завершить обзор 👉
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
                      <div className="space-y-1.5 max-h-[178px] overflow-y-auto hide-scrollbar">
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
                      {todayTransactions.length > 4 && (
                        <span className="text-[9px] text-[var(--text-muted)] font-bold block text-center pt-0.5 opacity-85 animate-pulse">
                          Листай список, чтобы увидеть еще {todayTransactions.length - 4} трат ↕️
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center p-3 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Листай дальше, чтобы увидеть использование доходов 👉
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
                        className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500"
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
            <div className="space-y-6 flex-1 flex flex-col justify-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[var(--text-main)]">Фишка #{slideIdx + 1}</h3>
                  <p className="text-xs text-[var(--text-muted)]">Секреты использования</p>
                </div>
              </div>

              {slideIdx >= 0 && slideIdx <= 3 ? (
                <div 
                  className="relative rounded-2xl overflow-hidden border border-[var(--glass-border)] h-[320px] flex items-center justify-center mx-auto shadow-[0_4px_30px_rgba(0,0,0,0.3)] bg-transparent animate-in fade-in duration-200"
                  style={{ width: tipsMedia[slideIdx].width }}
                >
                  <video
                    key={slideIdx}
                    ref={videoRef}
                    src={tipsMedia[slideIdx].src}
                    className="w-full h-full object-cover"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: tipsMedia[slideIdx].scale,
                    }}
                    playsInline
                    muted
                    loop
                    autoPlay
                  />
                </div>
              ) : null}
            </div>

            {slideIdx >= 0 && slideIdx <= 3 ? (
              <div className="mt-4 p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-2 backdrop-blur-md shadow-sm animate-in fade-in duration-200">
                <h4 className="font-bold text-base text-[var(--text-main)]">{tips[slideIdx].title}</h4>
                <p className="text-xs text-[var(--text-main)] opacity-80 leading-relaxed">{tips[slideIdx].text}</p>
              </div>
            ) : null}
          </div>
        );

      case "actions":
        const { language, setLanguage, t } = useLanguage();
        // Fallback for slide index if it was missing or undefined
        const currentSlide = typeof activeSlideIndex !== 'undefined' ? activeSlideIndex : 0;
        
        return (
          <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
            {currentSlide === 0 ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)]">{t('Fast Control')}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{t('Interactive Control')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button onClick={() => { setActiveStoryIndex(null); setHistoryModal({ isOpen: true, entity: { name: t('Transactions History'), icon: "feed" }, type: "feed" }); }} className="w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500"><BarChart3 size={16} /></div>
                      <div>
                        <span className="font-bold text-xs text-[var(--text-main)] block">{t('Transactions History')}</span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{t('Financial Feed')}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </button>

                  <button onClick={() => { setActiveStoryIndex(null); setCalendarAnalyticsModal({ isOpen: true }); }} className="w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500"><Calendar size={16} /></div>
                      <div>
                        <span className="font-bold text-xs text-[var(--text-main)] block">{t('Expense Calendar')}</span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{t('Spending Grid')}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </button>

                  <button onClick={() => { setActiveStoryIndex(null); setAnalyticsModal({ isOpen: true, type: "expense" }); }} className="w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500"><PieChart size={16} /></div>
                      <div>
                        <span className="font-bold text-xs text-[var(--text-main)] block">{t('Spending Analytics')}</span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{t('Expense Chart')}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </button>
                  
                  {/* Button to navigate to slide 1 */}
                  <button onClick={() => setActiveSlideIndex(1)} className="w-full p-3.5 rounded-2xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm mt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500"><Settings size={16} /></div>
                      <div>
                        <span className="font-bold text-xs text-[var(--text-main)] block">{t('Settings')}</span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{t('App Configuration')}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveSlideIndex(0)} className="w-12 h-12 rounded-2xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-main)]">
                    <ChevronLeft size={24} />
                  </button>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)]">{t('Settings')}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{t('App Configuration')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')} className="p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] text-left space-y-2">
                    <Languages className="text-indigo-500" />
                    <span className="font-bold text-xs text-[var(--text-main)] block">{t('Language')}</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{language === 'en' ? 'English' : 'Русский'}</span>
                  </button>
                  <button onClick={() => setTheme(theme === "dark" ? "white" : theme === "white" ? "mint" : "dark")} className="p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] text-left space-y-2">
                    <Palette className="text-amber-500" />
                    <span className="font-bold text-xs text-[var(--text-main)] block">{t('Theme')}</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{theme}</span>
                  </button>
                  <button onClick={() => setCategoryCurrencyMode(categoryCurrencyMode === 'base' ? 'local' : 'base')} className="col-span-2 p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] text-left space-y-2">
                    <DollarSign className="text-emerald-500" />
                    <span className="font-bold text-xs text-[var(--text-main)] block">{t('Currency of Categories')}</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{categoryCurrencyMode === 'base' ? t('Base Currency') : t('Local Currency')}</span>
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => setActiveStoryIndex(null)} className="w-full py-3.5 rounded-2xl bg-[var(--glass-item-bg)] hover:bg-[var(--glass-item-active)] border border-[var(--glass-border)] font-bold text-xs uppercase tracking-wider text-[var(--text-main)] transition-all">{t('Done')}</button>
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
      <section className={`px-6 shrink-0 relative z-20 border-[var(--glass-border)]/30 transition-all duration-500 ease-in-out overflow-hidden origin-top-right ${isStoriesCollapsed ? "max-h-0 opacity-0 scale-90 translate-x-10 -translate-y-4 border-b-0 py-0" : "max-h-[120px] opacity-100 scale-100 translate-x-0 translate-y-0 pt-1 pb-2 border-b"}`}>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar py-0.5 animate-in fade-in duration-300">
          {stories.map((story, index) => {
            const Icon = story.icon;
            return (
              <div
                key={story.id}
                onClick={() => handleStoryClick(index)}
                className={`cursor-pointer shrink-0 group ${useCompactStories ? "" : "flex flex-col items-center space-y-1"}`}
              >
                {/* Story Card wrapper (vertical rounded rectangle) */}
                <div
                  className="w-[52px] h-[68px] rounded-xl p-[1px] transition-all duration-300 border border-[var(--glass-border)] bg-[rgba(255,255,255,0.01)] opacity-50 hover:opacity-90 hover:scale-105"
                >
                  {/* Inner card (Glassmorphism Bento Container) */}
                  <div className={`w-full h-full rounded-[10px] bg-[rgba(255,255,255,0.02)] backdrop-blur-md relative overflow-hidden shadow-inner flex ${
                    useCompactStories 
                      ? "flex-col items-center justify-start pt-3.5" 
                      : "items-center justify-center"
                  }`}>
                    <Icon
                      size={18}
                      className={`transition-all text-[var(--text-muted)] ${useCompactStories ? "transform -translate-y-0.5" : ""}`}
                    />
                    
                    {/* Текст внутри карточки (только в компактном режиме) */}
                    {useCompactStories && (
                      <span className="absolute bottom-1 w-full text-center text-[7.5px] font-black tracking-[0.15em] text-[var(--text-muted)] uppercase pointer-events-none select-none">
                        {story.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Текст под иконкой (только в классическом просторном режиме) */}
                {!useCompactStories && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider scale-90 text-[var(--text-muted)] transition-colors mt-0.5">
                    {story.title}
                  </span>
                )}
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
