import * as React from "react";
import { Flame, Zap, HelpCircle, X, Palette, BarChart3, ChevronRight, Landmark, Compass, DollarSign, ShoppingBag, Calendar, PieChart, Languages, ChevronLeft, Coins } from "lucide-react";
import { Account, Transaction } from "../../types";
import { IconMap } from "../../constants";
import { RatesService } from "../../services/RatesService";
import { safeParseDate } from "../../hooks/utils";
import { useLanguage } from "../../contexts/LanguageContext";

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
  isStoriesCollapsed = false,
}: StoriesSectionProps) {
  const { t, language, setLanguage } = useLanguage();
  const totalCategoryItems = categories.length + 1;
  const rowsCount = Math.ceil(totalCategoryItems / 4);
  const useCompactStories = rowsCount > 2;

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
  const modalRef = React.useRef<HTMLDivElement>(null);
  const hasPushedHistory = React.useRef(false);

  // Tips Content (4 slides)
  const tips = [
    {
      title: t('Long Press'),
      text: t('Quick actions on accounts'),
    },
    {
      title: t('Drag & Drop'),
      text: t('Reorder your categories'),
    },
    {
      title: t('Safe Mode'),
      text: t('Hide balances in public'),
    },
    {
      title: t('Dark Theme'),
      text: t('Easy on the eyes'),
    },
  ];

  const tipsMedia = [
    { src: "/quick-input.mp4", width: "155px", scale: "scale(1.06)" },
    { src: "/tip-sort.mp4", width: "157px", scale: "scale(1.06)" },
    { src: "/tip-edit.mp4", width: "155px", scale: "scale(1.06)" },
    { src: "/tip-analytics.mp4", width: "147px", scale: "scale(1.06)" },
  ];

  const stories: Story[] = [
    { 
      id: "overview", 
      title: t('Overview'), 
      icon: BarChart3, 
      color: "#6d5dfc", 
      gradient: "from-[#6d5dfc] to-[#f472b6]", 
      slideCount: 3 
    },
    { 
      id: "zen", 
      title: t('Zen'), 
      icon: Flame, 
      color: "#6d5dfc", 
      gradient: "from-[#6d5dfc] to-[#f472b6]", 
      slideCount: 3 
    },
    { 
      id: "tips", 
      title: t('Tips'), 
      icon: HelpCircle, 
      color: "#6d5dfc", 
      gradient: "from-[#6d5dfc] to-[#f472b6]", 
      slideCount: 4 
    },
    { 
      id: "actions", 
      title: t('Pult'), 
      icon: Zap, 
      color: "#6d5dfc", 
      gradient: "from-[#6d5dfc] to-[#f472b6]", 
      slideCount: 1 
    },
  ];

  const handleStoryClick = (index: number) => {
    setActiveStoryIndex(index);
    setActiveSlideIndex(0);
    setProgress(0);
    setIsPaused(false);
  };

  const closeStories = () => {
    // To prevent tap-through on mobile devices where a click event fires on the underlying screen after closing,
    // we transition closing to the next macro-task.
    setTimeout(() => {
      setActiveStoryIndex(null);
    }, 150);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeStoryIndex !== null) {
        closeStories();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStoryIndex]);

  // Browser history sync to prevent back-swipe from exiting the application
  React.useEffect(() => {
    if (activeStoryIndex !== null) {
      // Stories modal opened - push a state
      window.history.pushState({ isStoryOpen: true }, "");
      hasPushedHistory.current = true;
    } else {
      // Stories modal closed - pop state if pushed
      if (hasPushedHistory.current) {
        window.history.back();
        hasPushedHistory.current = false;
      }
    }
  }, [activeStoryIndex]);

  React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If the back button/gesture was triggered
      if (activeStoryIndex !== null) {
        hasPushedHistory.current = false;
        setActiveStoryIndex(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeStoryIndex]);

  const handleNext = () => {
    if (activeStoryIndex === null) return;
    const currentStory = stories[activeStoryIndex];

    if (activeSlideIndex < currentStory.slideCount - 1) {
      setActiveSlideIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      closeStories();
    }
  };

  const handlePrev = (isSwipe: boolean = false) => {
    if (activeStoryIndex === null) return;

    if (activeSlideIndex > 0) {
      setActiveSlideIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      if (isSwipe) {
        // Только при жесте свайпа (isSwipe === true) на первом слайде любой сторис возвращаем на Главную
        closeStories();
      } else {
        // При обычном клике/тапе в левую зону переходим на предыдущую сторис (если есть)
        if (activeStoryIndex > 0) {
          const prevIndex = activeStoryIndex - 1;
          const prevStory = stories[prevIndex];
          setActiveStoryIndex(prevIndex);
          setActiveSlideIndex(prevStory.slideCount - 1);
          setProgress(0);
        } else {
          // Если это первая сторис и первый слайд, то обычный тап назад просто сбрасывает прогресс, а не закрывает
          setProgress(0);
        }
      }
    }
  };

  React.useEffect(() => {
    if (activeStoryIndex === null || isPaused) return;
    const intervalTime = 50;
    const increment = (intervalTime / 5000) * 100;
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

  React.useEffect(() => {
    const isTipsStoryActive = activeStoryIndex !== null && stories[activeStoryIndex]?.id === "tips" && activeSlideIndex >= 0 && activeSlideIndex <= 3;
    const video = videoRef.current;
    if (!video) return;
    if (isTipsStoryActive) { video.play().catch(() => {}); } else { video.pause(); }
  }, [activeStoryIndex, activeSlideIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartTime.current = Date.now();
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchStartTime.current = Date.now();
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartX.current;
    const diffY = endY - touchStartY.current;
    setIsPaused(false);

    // Check if the event target is inside the scrollable content
    const isInsideScrollable = (target: EventTarget | null): boolean => {
      if (!target) return false;
      let el = target as HTMLElement;
      while (el && el !== document.body) {
        if (el.classList && el.classList.contains('scrollable-content')) {
          return true;
        }
        el = el.parentElement as HTMLElement;
      }
      return false;
    };
    
    const insideScrollable = isInsideScrollable(e.target);

    // If inside scrollable content, ignore swipes (to let native scroll work)
    if (insideScrollable) {
      return;
    }

    if (diffY > 80 && Math.abs(diffX) < 100) { closeStories(); return; }
    if (diffX > 80 && Math.abs(diffY) < 100) { handlePrev(true); return; }
    if (diffX < -80 && Math.abs(diffY) < 100) { handleNext(); return; }

    // Tap detection inside the modal boundaries ONLY if clicking designated story-tap-zone overlays
    if (Math.abs(diffX) < 15 && Math.abs(diffY) < 15) {
      const isTapZone = (target: EventTarget | null): boolean => {
        if (!target) return false;
        let el = target as HTMLElement;
        while (el && el !== document.body) {
          if (el.classList && el.classList.contains('story-tap-zone')) {
            return true;
          }
          el = el.parentElement as HTMLElement;
        }
        return false;
      };

      if (isTapZone(e.target) && modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        const clickX = endX - rect.left;
        if (clickX < rect.width * 0.25) {
          handlePrev(false);
        } else if (clickX > rect.width * 0.25) {
          handleNext();
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (Date.now() - touchStartTime.current < 800) return;
    mouseStartX.current = e.clientX;
    mouseStartY.current = e.clientY;
    setIsPaused(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (Date.now() - touchStartTime.current < 800) return;
    const endX = e.clientX;
    const endY = e.clientY;
    const diffX = endX - mouseStartX.current;
    const diffY = endY - mouseStartY.current;
    setIsPaused(false);

    // Check if the event target is inside the scrollable content
    const isInsideScrollable = (target: EventTarget | null): boolean => {
      if (!target) return false;
      let el = target as HTMLElement;
      while (el && el !== document.body) {
        if (el.classList && el.classList.contains('scrollable-content')) {
          return true;
        }
        el = el.parentElement as HTMLElement;
      }
      return false;
    };
    
    const insideScrollable = isInsideScrollable(e.target);

    // If inside scrollable content, ignore swipes (to let native scroll work)
    if (insideScrollable) {
      return;
    }

    if (diffY > 80 && Math.abs(diffX) < 100) { closeStories(); return; }
    if (diffX > 80 && Math.abs(diffY) < 100) { handlePrev(true); return; }
    if (diffX < -80 && Math.abs(diffY) < 100) { handleNext(); return; }

    // Tap detection inside the modal boundaries ONLY if clicking designated story-tap-zone overlays
    if (Math.abs(diffX) < 15 && Math.abs(diffY) < 15) {
      const isTapZone = (target: EventTarget | null): boolean => {
        if (!target) return false;
        let el = target as HTMLElement;
        while (el && el !== document.body) {
          if (el.classList && el.classList.contains('story-tap-zone')) {
            return true;
          }
          el = el.parentElement as HTMLElement;
        }
        return false;
      };

      if (isTapZone(e.target) && modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        const clickX = endX - rect.left;
        if (clickX < rect.width * 0.25) {
          handlePrev(false);
        } else if (clickX > rect.width * 0.25) {
          handleNext();
        }
      }
    }
  };

  const baseSymbol = RatesService.getSymbol(baseCurrency);
  const totalBalanceBase = Math.round(accounts.reduce((s, a) => s + RatesService.convert(a.balance, a.currency, baseCurrency), 0));
  const expensesThisMonth = Math.round(currentMonthTransactions.filter(t => t.type === "expense").reduce((s, t) => {
    const account = accounts.find(a => a.id === t.accountId);
    return s + RatesService.convert(t.sourceAmount, t.sourceCurrency || account?.currency || baseCurrency, baseCurrency);
  }, 0));
  const incomeThisMonth = Math.round(currentMonthTransactions.filter(t => t.type === "income").reduce((s, t) => {
    const account = accounts.find(a => a.id === t.accountId);
    return s + RatesService.convert(t.targetAmount, t.targetCurrency || account?.currency || baseCurrency, baseCurrency);
  }, 0));

  const now = new Date();
  const todayTransactions = currentMonthTransactions.filter(t => {
    if (t.type !== "expense") return false;
    const d = safeParseDate(t.date);
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const spentToday = Math.round(todayTransactions.reduce((s, t) => {
    const account = accounts.find(a => a.id === t.accountId);
    return s + RatesService.convert(t.sourceAmount, t.sourceCurrency || account?.currency || baseCurrency, baseCurrency);
  }, 0));
  const hasSpendToday = spentToday > 0;

  const currencyBaseMap: Record<string, number> = {};
  accounts.forEach(a => { currencyBaseMap[a.currency] = (currencyBaseMap[a.currency] || 0) + RatesService.convert(a.balance, a.currency, baseCurrency); });
  const currencySplit = Object.keys(currencyBaseMap).map(cur => ({
    currency: cur,
    amount: accounts.filter(a => a.currency === cur).reduce((s, a) => s + a.balance, 0),
    percentage: totalBalanceBase > 0 ? Math.round((currencyBaseMap[cur] / totalBalanceBase) * 100) : 0
  })).sort((a, b) => b.percentage - a.percentage);

  const categoryExpensesMap: Record<string, number> = {};
  currentMonthTransactions.filter(t => t.type === "expense").forEach(t => {
    const account = accounts.find(a => a.id === t.accountId);
    categoryExpensesMap[t.targetId] = (categoryExpensesMap[t.targetId] || 0) + RatesService.convert(t.sourceAmount, t.sourceCurrency || account?.currency || baseCurrency, baseCurrency);
  });
  const topCategories = Object.keys(categoryExpensesMap).map(catId => {
    const category = categories.find(c => c.id === catId);
    return {
      id: catId,
      name: category?.name || t('Other'),
      color: category?.color || "#6b7280",
      icon: category?.icon || "ShoppingBag",
      amount: categoryExpensesMap[catId],
      percentage: expensesThisMonth > 0 ? Math.round((categoryExpensesMap[catId] / expensesThisMonth) * 100) : 0
    };
  }).sort((a, b) => b.amount - a.amount).slice(0, 3);

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
                    <h3 className="font-bold text-lg text-[var(--text-main)]">{t('Your May in Numbers')}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{t('Total Assets Summary')}</p>
                  </div>
                </div>
                <div className="mt-8 p-5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-4 backdrop-blur-md shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">{t('Total Balance')}</span>
                    <div className="text-3xl font-black text-[var(--text-main)] mt-0.5">{totalBalanceBase.toLocaleString()} <span className="text-sm font-normal text-[var(--text-muted)]">{baseSymbol}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--glass-border)]">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-emerald-500/70 tracking-wider">{t('Received')}</span>
                      <div className="text-lg font-bold text-emerald-500 mt-0.5">+{incomeThisMonth.toLocaleString()} <span className="text-xs font-normal text-emerald-500/60">{baseSymbol}</span></div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-rose-500/70 tracking-wider">{t('Spent')}</span>
                      <div className="text-lg font-bold text-rose-500 mt-0.5">-{expensesThisMonth.toLocaleString()} <span className="text-xs font-normal text-rose-500/60">{baseSymbol}</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center p-3 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-muted)]">{t('Swipe for top categories')} 👉</span>
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
                    <h3 className="font-bold text-lg text-[var(--text-main)]">{t('Top Categories')}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{t('Main Expenses')} ({baseSymbol})</p>
                  </div>
                </div>
                {topCategories.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {topCategories.map((cat, idx) => {
                      const Icon = IconMap[cat.icon] || ShoppingBag;
                      return (
                        <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] backdrop-blur-md shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>
                              <Icon size={18} style={{ color: cat.color }} />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-[var(--text-main)] block">{cat.name}</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{cat.percentage}% {t('of total spent')}</span>
                            </div>
                          </div>
                          <span className="font-bold text-sm text-[var(--text-main)]">-{Math.round(cat.amount).toLocaleString()} {baseSymbol}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] text-center text-xs text-[var(--text-muted)] shadow-sm">
                    🤷‍♂️ {t('No expenses yet this month.')}
                  </div>
                )}
              </div>
              <div className="text-center p-3 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-[10px] text-[var(--text-muted)]">{t('Swipe for wallet split')} 👉</span>
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
                    <h3 className="font-bold text-lg text-[var(--text-main)]">{t('Wallet Distribution')}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{t('Capital structure')}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3.5">
                  {currencySplit.map((split, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-2 backdrop-blur-md shadow-sm">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-sm text-[var(--text-main)]">{split.currency}</span>
                        <div className="text-right">
                          <span className="font-bold text-sm text-[var(--text-main)] block">{Math.round(split.amount).toLocaleString()} {split.currency}</span>
                          <span className="text-[10px] font-bold text-[var(--text-muted)]">{split.percentage}% {t('of total assets')}</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--text-muted)]/15 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${split.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
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
                  <h3 className="font-bold text-lg text-[var(--text-main)]">{hasSpendToday ? t('Financial Karma') : t('No-Spend Day! 🔥')}</h3>
                  <p className="text-[10px] text-[var(--text-muted)] tracking-wide">{hasSpendToday ? t('Today expenses are under control') : t('Your wallet is resting today')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-3.5 backdrop-blur-md text-left shadow-sm">
                  {hasSpendToday ? (
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--text-main)] opacity-90 leading-relaxed">{t('Spent today')}: <span className="font-bold text-rose-500">{spentToday.toLocaleString()} {baseSymbol}</span>.</p>
                      <div className="space-y-2 pt-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('Day Detail')}</p>
                        {todayTransactions.slice(0, 5).map((tx, i) => {
                          const category = categories.find(c => c.id === tx.targetId);
                          const account = accounts.find(a => a.id === tx.accountId);
                          const currency = tx.sourceCurrency || account?.currency || baseCurrency;
                          const amountBase = Math.round(RatesService.convert(tx.sourceAmount, currency, baseCurrency));
                          return (
                            <div key={i} className="flex items-center justify-between group">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px]" style={{ backgroundColor: `${category?.color || '#666'}15`, color: category?.color || '#666' }}>
                                  {React.createElement(IconMap[category?.icon || 'shopping-bag'] || ShoppingBag, { size: 12 })}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-[var(--text-main)] leading-none">{category?.name || t('Other')}</span>
                                  {tx.comment && <span className="text-[9px] text-[var(--text-muted)] truncate max-w-[120px] leading-tight">{tx.comment}</span>}
                                </div>
                              </div>
                              <span className="text-[11px] font-black text-[var(--text-main)]">-{amountBase.toLocaleString()} {baseSymbol}</span>
                            </div>
                          );
                        })}
                        {todayTransactions.length > 5 && (
                          <p className="text-[9px] text-center text-[var(--text-muted)] pt-1 italic opacity-60">+ {t('and')} {todayTransactions.length - 5} {t('more today')}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-main)] opacity-90 leading-relaxed">{t('Today is a No-Spend Day. Good job!')}</p>
                  )}
                </div>
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
                    <h3 className="font-bold text-lg text-[var(--text-main)]">{t('Financial Balance')}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{t('Savings analysis')}</p>
                  </div>
                </div>
                {incomeThisMonth > 0 ? (
                  <div className="p-5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] space-y-4 backdrop-blur-md shadow-sm">
                    <div className="flex justify-between text-sm text-[var(--text-muted)]">
                      <span>{t('Spent from income')}</span>
                      <span className="font-bold text-[var(--text-main)]">{Math.round((expensesThisMonth / incomeThisMonth) * 100)}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--text-muted)]/15 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500" style={{ width: `${Math.min((expensesThisMonth / incomeThisMonth) * 100, 100)}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] text-center text-xs text-[var(--text-muted)] shadow-sm">
                    🤷‍♂️ {t('No income recorded yet this month.')}
                  </div>
                )}
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
                  <h3 className="font-bold text-lg text-[var(--text-main)]">{t('Zen Mode')}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{t('Finish your day right')}</p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveStoryIndex(null); setCalendarAnalyticsModal({ isOpen: true }); }} 
                className="pointer-events-auto relative z-50 w-full py-3.5 rounded-2xl bg-[var(--glass-item-bg)] hover:bg-[var(--glass-item-active)] border border-[var(--glass-border)] font-bold text-xs uppercase tracking-wider text-[var(--text-main)] transition-all"
              >
                {t('Open Expense Calendar')}
              </button>
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
                  <h3 className="font-bold text-lg text-[var(--text-main)]">{t('Useful Tips')} #{slideIdx + 1}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{t('App Secrets')}</p>
                </div>
              </div>
              {slideIdx >= 0 && slideIdx <= 3 ? (
                <div className="relative rounded-2xl overflow-hidden border border-[var(--glass-border)] h-[320px] flex items-center justify-center mx-auto shadow-[0_4px_30px_rgba(0,0,0,0.3)] bg-transparent animate-in fade-in duration-200" style={{ width: tipsMedia[slideIdx].width }}>
                  <video key={slideIdx} ref={videoRef} src={tipsMedia[slideIdx].src} className="w-full h-full object-cover" style={{ width: "100%", height: "100%", objectFit: "cover", transform: tipsMedia[slideIdx].scale }} playsInline muted loop autoPlay />
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
        return (
          <div className="flex flex-col h-full justify-between py-6 px-4 animate-in fade-in duration-300">
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
                <button onClick={(e) => { e.stopPropagation(); setHistoryModal({ isOpen: true, entity: { name: t('Transactions History'), icon: "feed" }, type: "feed" }); setTimeout(() => setActiveStoryIndex(null), 50); }} className="pointer-events-auto w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500"><BarChart3 size={16} /></div>
                    <div>
                      <span className="font-bold text-xs text-[var(--text-main)] block">{t('Transactions History')}</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{t('Financial Feed')}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </button>

                <button onClick={(e) => { e.stopPropagation(); setCalendarAnalyticsModal({ isOpen: true }); setTimeout(() => setActiveStoryIndex(null), 50); }} className="pointer-events-auto w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500"><Calendar size={16} /></div>
                    <div>
                      <span className="font-bold text-xs text-[var(--text-main)] block">{t('Expense Calendar')}</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{t('Spending Grid')}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </button>

                <button onClick={(e) => { e.stopPropagation(); setAnalyticsModal({ isOpen: true, type: "expense" }); setTimeout(() => setActiveStoryIndex(null), 50); }} className="pointer-events-auto w-full p-3.5 rounded-2xl bg-[var(--glass-card-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] flex items-center justify-between text-left transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500"><PieChart size={16} /></div>
                    <div>
                      <span className="font-bold text-xs text-[var(--text-main)] block">{t('Spending Analytics')}</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-black">{t('Expense Chart')}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </button>
                
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button onClick={(e) => { e.stopPropagation(); setLanguage(language === 'en' ? 'ru' : 'en'); }} className="pointer-events-auto p-3 rounded-2xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex flex-col items-center justify-center gap-1 hover:bg-[var(--glass-item-active)] transition-all">
                    <Languages size={18} className="text-indigo-500" />
                    <span className="text-[10px] font-bold text-[var(--text-main)] uppercase">{language}</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setTheme(theme === "dark" ? "white" : theme === "white" ? "mint" : "dark"); }} className="pointer-events-auto p-3 rounded-2xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex flex-col items-center justify-center gap-1 hover:bg-[var(--glass-item-active)] transition-all">
                    <Palette size={18} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-[var(--text-main)] uppercase truncate w-full text-center">{theme}</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setCategoryCurrencyMode(categoryCurrencyMode === 'base' ? 'local' : 'base'); }} className="pointer-events-auto p-3 rounded-2xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex flex-col items-center justify-center gap-1 hover:bg-[var(--glass-item-active)] transition-all">
                    <DollarSign size={18} className="text-emerald-500" />
                    <span className="text-[10px] font-bold text-[var(--text-main)] uppercase">{categoryCurrencyMode === 'base' ? 'base' : 'loc'}</span>
                  </button>
                </div>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setActiveStoryIndex(null); }} className="pointer-events-auto w-full py-3.5 rounded-2xl bg-[var(--glass-item-bg)] hover:bg-[var(--glass-item-active)] border border-[var(--glass-border)] font-bold text-xs uppercase tracking-wider text-[var(--text-main)] transition-all">{t('Done')}</button>
          </div>
        );

      default:
        return null;
    }
  };

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <>
      <section className={`px-6 shrink-0 relative z-20 border-[var(--glass-border)]/30 transition-all duration-500 ease-in-out overflow-hidden origin-top-right ${isStoriesCollapsed ? "max-h-0 opacity-0 scale-90 translate-x-10 -translate-y-4 border-b-0 py-0" : "max-h-[125px] opacity-100 scale-100 translate-x-0 translate-y-0 pt-1 pb-3 border-b"}`}>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar py-0.5 animate-in fade-in duration-300">
          {stories.map((story, index) => {
            const Icon = story.icon;
            
            return (
              <div
                key={story.id}
                onClick={() => handleStoryClick(index)}
                className="cursor-pointer shrink-0 group flex flex-col items-center"
              >
                <div className="w-[52px] h-[68px] rounded-[12px] p-[1.5px] transition-all duration-300 border border-[var(--glass-border)] bg-[var(--glass-item-bg)] hover:scale-105 active:scale-95 shadow-sm">
                  <div className="w-full h-full rounded-[10px] relative overflow-hidden flex flex-col items-center justify-center">
                    <Icon
                      size={18}
                      className={`transition-all ${useCompactStories ? "transform -translate-y-0.5" : ""}`}
                      style={{ color: story.color }}
                    />
                    {useCompactStories && (
                      <span className="absolute bottom-1 w-full text-center text-[7px] font-black tracking-[0.1em] uppercase pointer-events-none select-none text-[var(--text-main)]">
                        {story.title}
                      </span>
                    )}
                  </div>
                </div>
                {!useCompactStories && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider scale-90 transition-colors mt-1.5 text-[var(--text-main)]">
                    {story.title}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {activeStoryIndex !== null && activeStory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-2xl animate-in fade-in duration-200 select-none bg-[var(--bg-color)]/95" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
          <div ref={modalRef} className="w-full max-w-md h-full flex flex-col justify-between relative overflow-hidden bg-[var(--bg-color)] border-x border-[var(--glass-border)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="story-tap-zone absolute left-0 top-20 bottom-0 w-[25%] z-[999] cursor-pointer" />
            <div className="story-tap-zone absolute right-0 top-20 bottom-0 w-[25%] z-[999] cursor-pointer" />
            <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-[0.08] blur-[100px] pointer-events-none transition-all duration-500" style={{ backgroundColor: activeStory.color }} />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-[0.06] blur-[100px] pointer-events-none transition-all duration-500" style={{ backgroundColor: activeStory.color }} />
            <div className="px-4 pt-4 pb-2 z-50 space-y-3">
              <div className="flex gap-1.5 w-full">
                {Array.from({ length: activeStory.slideCount }).map((_, idx) => {
                  let widthPercent = idx < activeSlideIndex ? 100 : (idx === activeSlideIndex ? progress : 0);
                  return (
                    <div key={idx} className="h-[2.5px] flex-1 rounded-full bg-[var(--text-muted)]/20 overflow-hidden">
                      <div className="h-full bg-[var(--text-main)] transition-all duration-75" style={{ width: `${widthPercent}%`, transitionTimingFunction: "linear" }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center relative z-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${activeStory.color}15`, border: `1px solid ${activeStory.color}30` }}>
                    {React.createElement(activeStory.icon, { size: 14, style: { color: activeStory.color } })}
                  </div>
                  <span className="text-xs font-bold text-[var(--text-main)] tracking-wide uppercase font-sans">{activeStory.title}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); closeStories(); }} 
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all hover:scale-105 active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="scrollable-content flex-1 px-4 py-2 relative z-50 pointer-events-auto overflow-y-auto hide-scrollbar">
              {renderStoryContent(activeStory.id, activeSlideIndex)}
            </div>
            <div className="pb-6 pt-2 text-center pointer-events-none opacity-40">
              <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-bold">◀ Нажми по краям или свайпни ▶</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
