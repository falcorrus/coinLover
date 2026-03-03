import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, PieChart, Tag, RefreshCcw, MoreHorizontal } from "lucide-react";
import { Transaction, Category } from "../types";
import { IconMap } from "../constants";
import { googleSheetsService } from "../services/googleSheets";

interface AnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
}
export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, categories }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [tab, setTab] = useState<"categories" | "tags">("categories");

    // Cache to prevent refetching the same month while the modal is open
    const monthCache = React.useRef(new Map<string, Transaction[]>());

    // Swipe handlers for changing month
    const touchStartX = React.useRef(0);

    // Clear cache when modal closes to ensure fresh data on next open
    useEffect(() => {
        if (!isOpen) {
            monthCache.current.clear();
        }
    }, [isOpen]);

    // Fetch data when date changes
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const loadData = async () => {
            const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

            // Return cached data immediately if available
            if (monthCache.current.has(monthStr)) {
                setTransactions(monthCache.current.get(monthStr) || []);
                return;
            }

            setIsLoading(true);
            const data = await googleSheetsService.fetchMonthData(monthStr);

            if (isMounted) {
                const fetchedTx = (data && data.transactions) ? data.transactions : [];
                monthCache.current.set(monthStr, fetchedTx);
                setTransactions(fetchedTx);
                setIsLoading(false);
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [isOpen, currentDate]);

    if (!isOpen) return null;

    const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));

    const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

    // Compute stats - apply strict client-side filtering by the selected month
    const expenses = transactions.filter(t => {
        if (t.type !== "expense") return false;

        const txDate = new Date(t.date);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth();

        return txYear === currentDate.getFullYear() && txMonth === currentDate.getMonth();
    });

    const totalUSD = expenses.reduce((sum, t) => sum + (t.amountUSD ?? t.amount), 0);

    let listItems: { id: string, name: string, icon: any, color: string, amount: number, percent: number }[] = [];

    if (tab === "categories") {
        const catMap = new Map<string, number>();
        expenses.forEach(t => {
            const catId = t.targetId;
            catMap.set(catId, (catMap.get(catId) || 0) + (t.amountUSD ?? t.amount));
        });

        catMap.forEach((amount, catId) => {
            const cat = categories.find(c => c.id === catId);
            const name = cat ? cat.name : "Удаленная категория";
            const icon = cat ? (IconMap[cat.icon] || MoreHorizontal) : MoreHorizontal;
            const color = cat ? cat.color : "#6b7280";
            const percent = totalUSD > 0 ? (amount / totalUSD) * 100 : 0;

            listItems.push({ id: catId, name, icon, color, amount, percent });
        });
    } else {
        const tagMap = new Map<string, number>();
        expenses.forEach(t => {
            const tagName = t.tag && t.tag.trim() ? t.tag.trim() : "Без тега";
            tagMap.set(tagName, (tagMap.get(tagName) || 0) + (t.amountUSD ?? t.amount));
        });

        tagMap.forEach((amount, tagName) => {
            const percent = totalUSD > 0 ? (amount / totalUSD) * 100 : 0;
            listItems.push({ id: tagName, name: tagName, icon: Tag, color: "#6d5dfc", amount, percent });
        });
    }

    // Sort descending
    listItems.sort((a, b) => b.amount - a.amount);

    // Swipe handlers for changing month
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX.current;
        if (diff > 50) prevMonth();
        else if (diff < -50) nextMonth();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div
                className="glass-panel w-full max-w-sm h-[80vh] flex flex-col overflow-hidden relative"
                onClick={e => e.stopPropagation()}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#6d5dfc]/20 text-[#6d5dfc] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(109,93,252,0.5)]">
                            <PieChart size={20} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-sm font-black text-white uppercase tracking-wider">Аналитика</h2>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">Расходы за период</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Month Selector */}
                <div className="flex justify-between items-center px-4 py-3 bg-white/[0.02] shrink-0 border-b border-white/5">
                    <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-xs font-bold text-white uppercase tracking-widest">{monthName}</span>
                    <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-4 shrink-0 border-b border-white/5">
                    <button
                        onClick={() => setTab("categories")}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${tab === "categories" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white hover:bg-white/5"}`}
                    >
                        КАТЕГОРИИ
                    </button>
                    <button
                        onClick={() => setTab("tags")}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${tab === "tags" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white hover:bg-white/5"}`}
                    >
                        ТЕГИ
                    </button>
                </div>

                {/* Total Summary */}
                <div className="px-6 py-4 shrink-0 flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Всего расходов</span>
                    <span className="text-3xl font-black text-white">
                        ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6 relative">
                    {listItems.length === 0 && !isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs uppercase font-bold tracking-widest">
                            Нет данных
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {listItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-inner text-white bg-white/5" style={{ color: item.color }}>
                                                <item.icon size={14} />
                                            </div>
                                            <span className="text-sm font-semibold text-white">{item.name}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-bold text-white">
                                                ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500">{item.percent.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-[#050505]/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in">
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.2)] mb-4">
                            <RefreshCcw size={28} className="animate-spin" />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-widest animate-pulse">Загружаю данные...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
