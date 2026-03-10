import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, RefreshCcw, Calendar } from "lucide-react";
import { Transaction } from "../types";
import { googleSheetsService } from "../services/googleSheets";

interface CalendarAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    globalTransactions: Transaction[];
    onItemClick?: (entity: any, type: "feed", transactions: Transaction[]) => void;
}

const globalCalendarCache = new Map<string, Transaction[]>();

export const CalendarAnalyticsModal: React.FC<CalendarAnalyticsModalProps> = ({ 
    isOpen, onClose, globalTransactions, onItemClick 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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

    // 2. Handlers
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
    }, [transactions, currentDate]);

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

    const getDailyData = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTx = filteredTx.filter(t => t.date.startsWith(dateStr));
        const expense = dayTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.sourceAmountUSD || 0), 0);
        const income = dayTx.filter(t => t.type === "income").reduce((s, t) => s + (t.sourceAmountUSD || 0), 0);
        return { expense, income, transactions: dayTx };
    };

    const totalMonthExpense = useMemo(() => filteredTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.sourceAmountUSD || 0), 0), [filteredTx]);
    const totalMonthIncome = useMemo(() => filteredTx.filter(t => t.type === "income").reduce((s, t) => s + (t.sourceAmountUSD || 0), 0), [filteredTx]);

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

                    <div className="flex justify-between items-center px-4 py-3 bg-[var(--glass-item-bg)]/50 shrink-0 border-b border-[var(--glass-border)]">
                        <button onClick={prevMonth} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><ChevronLeft size={20} /></button>
                        <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">{monthName}</span>
                        <button onClick={nextMonth} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><ChevronRight size={20} /></button>
                    </div>

                    <div className="px-6 py-6 shrink-0 flex gap-4">
                        <div className="flex-1 p-4 rounded-2xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex flex-col items-center">
                            <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-1">Расходы</span>
                            <span className="text-lg font-black text-[var(--text-main)]">${totalMonthExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex-1 p-4 rounded-2xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex flex-col items-center">
                            <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-1">Доходы</span>
                            <span className="text-lg font-black text-[var(--success-color)]">${totalMonthIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6 relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <RefreshCcw size={32} className="animate-spin text-[var(--primary-color)] opacity-20" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 mt-2">
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
                                        
                                        return (
                                            <button 
                                                key={day}
                                                onClick={() => {
                                                    if (hasData && onItemClick) {
                                                        const dateStr = `${String(day).padStart(2, '0')}.${String(currentDate.getMonth() + 1).padStart(2, '0')}.${currentDate.getFullYear()}`;
                                                        onItemClick({ name: dateStr, icon: "calendar" }, "feed", dayTx);
                                                    }
                                                }}
                                                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative border ${isToday ? 'border-[var(--primary-color)] shadow-[0_0_10px_rgba(109,93,252,0.2)]' : 'border-transparent'} ${hasData ? 'bg-[var(--glass-item-bg)] hover:bg-[var(--glass-item-active)] active:scale-90' : 'opacity-40 cursor-default'}`}
                                            >
                                                <span className={`text-xs font-bold ${isToday ? 'text-[var(--primary-color)]' : 'text-[var(--text-main)]'}`}>{day}</span>
                                                <div className="flex gap-0.5">
                                                    {income > 0 && <div className="w-1 h-1 rounded-full bg-[var(--success-color)] shadow-[0_0_5px_var(--success-color)]" />}
                                                    {expense > 0 && <div className="w-1 h-1 rounded-full bg-[var(--primary-color)] shadow-[0_0_5px_var(--primary-color)]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
