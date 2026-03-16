import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, ChevronLeft, ChevronRight, RefreshCcw, Calendar, Wallet, AlertCircle, LayoutGrid, List } from "lucide-react";
import { Transaction, Account, Category, IncomeSource } from "../types";
import { googleSheetsService } from "../services/googleSheets";
import { IconMap } from "../constants";

interface CalendarAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    globalTransactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    incomes: IncomeSource[];
    onItemClick?: (entity: any, type: "feed", transactions: Transaction[]) => void;
}

const globalCalendarCache = new Map<string, Transaction[]>();

export const CalendarAnalyticsModal: React.FC<CalendarAnalyticsModalProps> = ({ 
    isOpen, onClose, globalTransactions, accounts, categories, incomes, onItemClick 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
    const [viewMode, setViewMode] = useState<"timeline" | "month">("timeline");
    const timelineRef = useRef<HTMLDivElement>(null);

    // 1. Effects
    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;
        
        const loadData = async () => {
            const yearStr = currentDate.getFullYear();
            const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
            const cacheKey = `${yearStr}-${monthStr}`;

            const globalMonthTx = globalTransactions.filter(t => {
                const txDate = new Date(t.date.replace(/-/g, '/').replace('T', ' '));
                return txDate.getFullYear() === yearStr && (txDate.getMonth() + 1) === Number(monthStr);
            });

            if (globalMonthTx.length > 0) {
                setTransactions(globalTransactions);
                globalCalendarCache.set(cacheKey, globalTransactions);
                return;
            }

            if (globalCalendarCache.has(cacheKey)) {
                setTransactions(globalCalendarCache.get(cacheKey)!);
                return;
            }

            setIsLoading(true);
            try {
                const data = await googleSheetsService.fetchMonthData(cacheKey);
                if (isMounted) {
                    const fetchedTx = (data && data.transactions) ? data.transactions : [];
                    globalCalendarCache.set(cacheKey, fetchedTx);
                    setTransactions(fetchedTx);
                }
            } catch (err) {
                console.error("Failed to load month data", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        loadData();
    }, [isOpen, currentDate, globalTransactions]);

    // Auto-scroll to selected day in timeline mode
    useEffect(() => {
        if (viewMode === "timeline" && selectedDay && timelineRef.current) {
            const timer = setTimeout(() => {
                const element = timelineRef.current?.querySelector(`[data-day="${selectedDay}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [viewMode, selectedDay, currentDate]);

    // 2. Handlers
    const goToToday = () => {
        const today = new Date();
        setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
        setSelectedDay(today.getDate());
    };

    const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

    // 3. Calendar logic
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const filteredTx = useMemo(() => {
        return transactions.filter(t => {
            const txDate = new Date(t.date.replace(/-/g, '/').replace('T', ' '));
            return txDate.getFullYear() === currentDate.getFullYear() && txDate.getMonth() === currentDate.getMonth();
        });
    }, [transactions, currentDate.getFullYear(), currentDate.getMonth()]); // Use specific parts of date for stability

    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const firstDay = (firstDayOfMonth(year, month) + 6) % 7; // Adjust to Monday start
        
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let d = 1; d <= totalDays; d++) days.push(d);
        return days;
    }, [currentDate]);

    const timelineDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const days = [];
        for (let d = 1; d <= totalDays; d++) days.push(d);
        return days;
    }, [currentDate]);

    const getDailyData = (day: number) => {
        const dayTx = filteredTx.filter(t => {
            const txDate = new Date(t.date.replace(/-/g, '/').replace('T', ' '));
            return txDate.getDate() === day;
        });
        const expense = dayTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.sourceAmountUSD || 0), 0);
        const income = dayTx.filter(t => t.type === "income").reduce((s, t) => s + (t.sourceAmountUSD || 0), 0);
        return { expense, income, transactions: dayTx };
    };

    const selectedDayData = selectedDay ? getDailyData(selectedDay) : null;

    const getCounterpartInfo = (tx: Transaction) => {
        let isOutflow = tx.type !== "income";
        let counterpartItem: Account | Category | IncomeSource | undefined;
        
        if (tx.type === "expense") {
            counterpartItem = categories.find(c => c.id === tx.targetId);
        } else if (tx.type === "income") {
            counterpartItem = incomes.find(i => i.id === tx.targetId);
        } else if (tx.type === "transfer") {
            counterpartItem = accounts.find(a => a.id === tx.targetId);
        }

        return { item: counterpartItem, isOutflow };
    };

    const getAmountStr = (tx: any, isOutflow: boolean) => {
        const sAmt = tx.sourceAmount ?? tx.amount ?? 0;
        const sAmtUsd = tx.sourceAmountUSD ?? tx.amountUSD;
        const sCurr = tx.sourceCurrency ?? (accounts.find(a => a.id === tx.accountId)?.currency || "USD");

        const txType = tx.type?.toLowerCase();
        const color = txType === "transfer" 
            ? "text-indigo-400" 
            : (isOutflow 
                ? (txType === "expense" ? "text-[#D4AF37]" : "text-[var(--danger-color)]") 
                : "text-[var(--success-color)]");

        const sign = txType === "transfer" ? "" : (isOutflow ? "-" : "+");

        return {
            amount: `${sign}${sAmt.toLocaleString()} ${sCurr}`,
            usdAmount: (sCurr !== "USD" && sAmtUsd) ? `${sign}$${sAmtUsd.toLocaleString()}` : null,
            color
        };
    };

    const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] animate-in fade-in duration-300 flex justify-center" 
            onClick={onClose}
        >
            <div className="w-full max-w-md h-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div 
                    className="bg-[var(--bg-color)] w-full h-full flex flex-col overflow-hidden relative shadow-2xl"
                    style={{ paddingTop: `env(safe-area-inset-top)` }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-[var(--glass-border)] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--primary-color)] bg-[var(--primary-color)]/20 text-[var(--primary-color)]`}>
                                <Calendar size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Календарь операций</h2>
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest leading-none mt-1">активность по дням</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--glass-item-bg)] flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--glass-item-active)] transition-colors border border-[var(--glass-border)]"><X size={20} /></button>
                    </div>

                    {/* Month Selection & View Toggle */}
                    <div className="flex justify-between items-center px-4 py-3 bg-[var(--glass-item-bg)]/50 shrink-0 border-b border-[var(--glass-border)]">
                        <div className="flex items-center gap-[5px]">
                            <div className="flex bg-black/20 p-1 rounded-xl border border-[var(--glass-border)] gap-0.5">
                                <button 
                                    onClick={() => setViewMode("timeline")}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'timeline' ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                    title="Список"
                                >
                                    <List size={16} />
                                </button>
                                <button 
                                    onClick={() => setViewMode("month")}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'month' ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                    title="Сетка"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                            </div>
                            <div className="flex bg-black/20 p-1 rounded-xl border border-[var(--glass-border)]">
                                <button 
                                    onClick={goToToday}
                                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all flex items-center justify-center"
                                    title="Сегодня"
                                >
                                    <Calendar size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={prevMonth} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><ChevronLeft size={20} /></button>
                            <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest min-w-[120px] text-center">{monthName}</span>
                            <button onClick={nextMonth} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><ChevronRight size={20} /></button>
                        </div>
                    </div>

                    {/* Calendar View Area */}
                    <div className="shrink-0">
                        {viewMode === "month" ? (
                            <div className="px-6 py-6 animate-in fade-in duration-300">
                                <div className="grid grid-cols-7 gap-1">
                                    {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => (
                                        <div key={d} className="text-[10px] font-black text-[var(--text-muted)] uppercase text-center py-2">{d}</div>
                                    ))}
                                    {calendarDays.map((day, i) => {
                                        if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;
                                        const { expense, income, transactions: dayTx } = getDailyData(day);
                                        const hasData = dayTx.length > 0;
                                        const today = new Date();
                                        const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
                                        const isSelected = selectedDay === day;
                                        
                                        return (
                                            <button 
                                                key={day}
                                                onClick={() => {
                                                    setSelectedDay(day === selectedDay ? null : day);
                                                }}
                                                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative border 
                                                    ${isSelected ? 'bg-[var(--primary-color)]/20 border-[var(--primary-color)] shadow-[0_0_15px_rgba(109,93,252,0.3)]' : isToday ? 'border-[var(--primary-color)]/50' : 'border-transparent'} 
                                                    ${(hasData || isSelected) ? 'bg-[var(--glass-item-bg)] hover:bg-[var(--glass-item-active)] active:scale-90' : 'opacity-40 cursor-default'}
                                                `}
                                            >
                                                <span className={`text-xs font-bold ${isSelected || isToday ? 'text-[var(--primary-color)]' : 'text-[var(--text-main)]'}`}>{day}</span>
                                                <div className="flex gap-0.5">
                                                    {income > 0 && <div className="w-1 h-1 rounded-full bg-[var(--success-color)] shadow-[0_0_5px_var(--success-color)]" />}
                                                    {expense > 0 && <div className="w-1 h-1 rounded-full bg-[var(--primary-color)] shadow-[0_0_5px_var(--primary-color)]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div 
                                ref={timelineRef}
                                className="flex overflow-x-auto hide-scrollbar gap-2 px-6 py-8 animate-in slide-in-from-right-4 duration-300"
                            >
                                {timelineDays.map((day) => {
                                    const { expense, income, transactions: dayTx } = getDailyData(day);
                                    const hasData = dayTx.length > 0;
                                    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                    const dName = dayNames[dateObj.getDay()];
                                    const today = new Date();
                                    const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
                                    const isSelected = selectedDay === day;

                                    return (
                                        <button
                                            key={day}
                                            data-day={day}
                                            onClick={() => {
                                                setSelectedDay(day === selectedDay ? null : day);
                                            }}
                                            className={`w-14 shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border
                                                ${isSelected 
                                                    ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/30' 
                                                    : isToday 
                                                        ? 'bg-[var(--glass-item-bg)] border-[var(--primary-color)]/50' 
                                                        : 'bg-[var(--glass-item-bg)]/50 border-transparent'}
                                                ${(hasData || isSelected) ? 'opacity-100' : 'opacity-30'}
                                            `}
                                        >
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>{dName}</span>
                                            <span className="text-base font-black tracking-tight">{day}</span>
                                            <div className="flex gap-0.5 mt-1">
                                                {income > 0 && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[var(--success-color)]'}`} />}
                                                {expense > 0 && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/50' : 'bg-[var(--primary-color)]'}`} />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Transaction List */}
                    <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6 relative border-t border-[var(--glass-border)] pt-4">
                        {isLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <RefreshCcw size={32} className="animate-spin text-[var(--primary-color)] opacity-20" />
                            </div>
                        ) : selectedDayData && selectedDayData.transactions.length > 0 ? (
                            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
                                        {String(selectedDay).padStart(2, '0')}.{String(currentDate.getMonth() + 1).padStart(2, '0')}.{currentDate.getFullYear()}
                                    </span>
                                    <div className="flex gap-3">
                                        {selectedDayData.income > 0 && (
                                            <span className="text-[10px] font-black text-[var(--success-color)]">+${selectedDayData.income.toLocaleString()}</span>
                                        )}
                                        {selectedDayData.expense > 0 && (
                                            <span className="text-[10px] font-black text-[var(--danger-color)]">-${selectedDayData.expense.toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {selectedDayData.transactions.map(tx => {
                                        const { item, isOutflow } = getCounterpartInfo(tx);
                                        const status = { isBroken: !accounts.find(a => a.id === tx.accountId) || (!categories.find(c => c.id === tx.targetId) && tx.type === 'expense') };
                                        const Icon = item ? (IconMap[(item as any).icon] || Wallet) : (status.isBroken ? AlertCircle : Wallet);
                                        const amountInfo = getAmountStr(tx, isOutflow);
                                        
                                        const s = accounts.find(a => a.id === tx.accountId);
                                        let displayName = "";
                                        if (tx.type === "expense") {
                                            const dName = categories.find(c => c.id === tx.targetId)?.name || "?";
                                            displayName = `${s?.name || "?"} → ${dName}`;
                                        } else if (tx.type === "income") {
                                            const dName = incomes.find(i => i.id === tx.targetId)?.name || "?";
                                            displayName = `${dName} → ${s?.name || "?"}`;
                                        } else {
                                            const dName = accounts.find(a => a.id === tx.targetId)?.name || "?";
                                            displayName = `${s?.name || "?"} → ${dName}`;
                                        }

                                        return (
                                            <div 
                                                key={tx.id} 
                                                className="flex justify-between items-center bg-[var(--glass-item-bg)]/30 p-3 rounded-2xl border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] transition-colors cursor-pointer"
                                                onClick={() => {
                                                    if (onItemClick) {
                                                        const dateStr = `${String(selectedDay).padStart(2, '0')}.${String(currentDate.getMonth() + 1).padStart(2, '0')}.${currentDate.getFullYear()}`;
                                                        onItemClick({ name: dateStr, icon: "calendar" }, "feed", [tx]);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative shadow-inner shrink-0 ${status.isBroken ? 'bg-rose-500/20 text-rose-500' : 'bg-[var(--glass-item-bg)] text-[var(--text-muted)]'}`} style={{ color: !status.isBroken ? (item as any)?.color : undefined }}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-sm font-bold text-[var(--text-main)] truncate">{displayName}</span>
                                                        {tx.tag && <span className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mt-0.5">{tx.tag}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 pl-2">
                                                    <span className={`text-sm font-black ${amountInfo.color}`}>{amountInfo.amount}</span>
                                                    {amountInfo.usdAmount && <span className="text-[10px] text-[var(--text-muted)] font-bold opacity-60">≈ {amountInfo.usdAmount}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-30 gap-3">
                                <Calendar size={40} className="text-[var(--text-muted)]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Выберите день для просмотра</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
