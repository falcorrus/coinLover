import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, PieChart, Tag, RefreshCcw, MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";
import { Transaction, Category, IncomeSource } from "../types";
import { IconMap } from "../constants";
import { googleSheetsService } from "../services/googleSheets";

interface AnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    incomes: IncomeSource[];
    globalTransactions: Transaction[];
    initialType?: "expense" | "income";
    onItemClick?: (entity: any, type: "category" | "tag" | "income", transactions: Transaction[]) => void;
}
// Persistent cache outside component to avoid refetching during same session
const globalAnalyticsCache = new Map<string, Transaction[]>();

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ 
    isOpen, 
    onClose, 
    categories, 
    incomes,
    globalTransactions, 
    initialType = "expense",
    onItemClick 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisType, setAnalysisType] = useState<"expense" | "income">(initialType);
    const [tab, setTab] = useState<"categories" | "tags">("categories");
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

    // Reset type and expanded item when opening
    useEffect(() => {
        if (isOpen) {
            setAnalysisType(initialType);
            setExpandedItemId(null);
        }
    }, [isOpen, initialType]);

    // Swipe handlers for changing month
    const touchStartX = React.useRef(0);

    const toggleExpand = (id: string) => {
        setExpandedItemId(expandedItemId === id ? null : id);
        if (navigator.vibrate) navigator.vibrate(10);
    };

    // Fetch data when date changes
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const loadData = async () => {
            const yearStr = currentDate.getFullYear();
            const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
            const cacheKey = `${yearStr}-${monthStr}`;

            // 1. Check persistent caching first
            if (globalAnalyticsCache.has(cacheKey)) {
                setTransactions(globalAnalyticsCache.get(cacheKey)!);
                return;
            }

            // 2. Check globalTransactions for ANY month if not cached
            const monthTx = globalTransactions.filter(t => {
                const txDate = new Date(t.date.replace(/-/g, '/').replace('T', ' '));
                return txDate.getFullYear() === yearStr && (txDate.getMonth() + 1) === Number(monthStr);
            });

            if (monthTx.length > 0) {
                // Have some local data, use it instantly to avoid spinner
                setTransactions(globalTransactions);
                globalAnalyticsCache.set(cacheKey, globalTransactions);

                // Background refresh just this month in case of discrepancy
                googleSheetsService.fetchMonthData(cacheKey).then(data => {
                    if (isMounted && data && data.transactions) {
                        globalAnalyticsCache.set(cacheKey, data.transactions);
                        setTransactions(data.transactions);
                    }
                }).catch(() => { });
                return;
            }

            // 3. If no local data, show loader and fetch this specific month
            setIsLoading(true);
            try {
                const data = await googleSheetsService.fetchMonthData(cacheKey);
                if (isMounted) {
                    const fetchedTx = (data && data.transactions) ? data.transactions : [];
                    globalAnalyticsCache.set(cacheKey, fetchedTx);
                    setTransactions(fetchedTx);
                }
            } catch (err) {
                console.error("Failed to load month data", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadData();

        // Background pre-fetch previous 6 months
        for (let i = 1; i <= 6; i++) {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!globalAnalyticsCache.has(key)) {
                setTimeout(() => {
                    if (!globalAnalyticsCache.has(key)) {
                        googleSheetsService.fetchMonthData(key).then(data => {
                            if (data && data.transactions) {
                                globalAnalyticsCache.set(key, data.transactions);
                            }
                        }).catch(() => { });
                    }
                }, i * 400);
            }
        }

        return () => {
            isMounted = false;
        };
    }, [isOpen, currentDate, globalTransactions]);

    if (!isOpen) return null;

    const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));

    const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

    // Filter by type and month
    const filteredTx = transactions.filter(t => {
        if (t.type !== analysisType) return false;
        const txDate = new Date(t.date.replace(/-/g, '/').replace('T', ' '));
        return txDate.getFullYear() === currentDate.getFullYear() && txDate.getMonth() === currentDate.getMonth();
    });

    const totalUSD = filteredTx.reduce((sum, t) => sum + (t.sourceAmountUSD || t.sourceAmount || 0), 0);

    let listItems: { id: string, name: string, icon: any, color: string, amount: number, percent: number }[] = [];

    if (tab === "categories" || analysisType === "income") {
        const itemMap = new Map<string, number>();
        filteredTx.forEach(t => {
            const id = t.targetId; // Category for expense, IncomeSource for income
            itemMap.set(id, (itemMap.get(id) || 0) + (t.sourceAmountUSD || t.sourceAmount || 0));
        });

        itemMap.forEach((amount, id) => {
            if (analysisType === "expense") {
                const cat = categories.find(c => c.id === id);
                listItems.push({ 
                    id, 
                    name: cat ? cat.name : "Удаленная категория", 
                    icon: cat ? (IconMap[cat.icon] || MoreHorizontal) : MoreHorizontal, 
                    color: cat ? cat.color : "#6b7280", 
                    amount, 
                    percent: totalUSD > 0 ? (amount / totalUSD) * 100 : 0 
                });
            } else {
                const inc = incomes.find(i => i.id === id);
                listItems.push({ 
                    id, 
                    name: inc ? inc.name : "Удаленный источник", 
                    icon: TrendingUp, 
                    color: inc ? inc.color : "var(--success-color)", 
                    amount, 
                    percent: totalUSD > 0 ? (amount / totalUSD) * 100 : 0 
                });
            }
        });
    } else {
        const tagMap = new Map<string, number>();
        filteredTx.forEach(t => {
            const tagName = t.tag && t.tag.trim() ? t.tag.trim() : "Без тега";
            tagMap.set(tagName, (tagMap.get(tagName) || 0) + (t.sourceAmountUSD || t.sourceAmount || 0));
        });

        tagMap.forEach((amount, tagName) => {
            listItems.push({ 
                id: tagName, 
                name: tagName, 
                icon: Tag, 
                color: "var(--primary-color)", 
                amount, 
                percent: totalUSD > 0 ? (amount / totalUSD) * 100 : 0 
            });
        });
    }

    listItems.sort((a, b) => b.amount - a.amount);

    const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX.current;
        if (diff > 50) prevMonth(); else if (diff < -50) nextMonth();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div
                className="glass-panel bg-[var(--bg-color)]/90 w-full max-w-sm h-[80vh] flex flex-col overflow-hidden relative shadow-2xl shadow-[var(--shadow-color)]"
                onClick={e => e.stopPropagation()}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-[var(--glass-border)] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--primary-color)] ${analysisType === 'income' ? 'bg-[var(--success-color)]/20 text-[var(--success-color)]' : 'bg-[var(--primary-color)]/20 text-[var(--primary-color)]'}`}>
                            <PieChart size={20} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
                                {analysisType === "expense" ? "Аналитика расходов" : "Аналитика доходов"}
                            </h2>
                            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest leading-none mt-1">за период</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--glass-item-bg)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Main Type Selector (Income/Expense) */}
                <div className="flex p-2 gap-1 bg-[var(--glass-item-bg)]/30 border-b border-[var(--glass-border)]">
                    <button 
                        onClick={() => { setAnalysisType("expense"); setExpandedItemId(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black transition-all ${analysisType === "expense" ? 'bg-[var(--primary-color)] text-white shadow-lg' : 'text-[var(--text-muted)]'}`}
                    >
                        <TrendingDown size={12} /> РАСХОДЫ
                    </button>
                    <button 
                        onClick={() => { setAnalysisType("income"); setExpandedItemId(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black transition-all ${analysisType === "income" ? 'bg-[var(--success-color)] text-white shadow-lg' : 'text-[var(--text-muted)]'}`}
                    >
                        <TrendingUp size={12} /> ДОХОДЫ
                    </button>
                </div>

                {/* Month Selector */}
                <div className="flex justify-between items-center px-4 py-3 bg-[var(--glass-item-bg)]/50 shrink-0 border-b border-[var(--glass-border)]">
                    <button onClick={prevMonth} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">{monthName}</span>
                    <button onClick={nextMonth} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Tags Tab (only for expenses) */}
                {analysisType === "expense" && (
                    <div className="flex gap-2 p-4 shrink-0 border-b border-[var(--glass-border)]">
                        <button
                            onClick={() => setTab("categories")}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${tab === "categories" ? "bg-[var(--glass-item-active)] text-[var(--text-main)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-item-bg)]"}`}
                        >
                            КАТЕГОРИИ
                        </button>
                        <button
                            onClick={() => setTab("tags")}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${tab === "tags" ? "bg-[var(--glass-item-active)] text-[var(--text-main)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-item-bg)]"}`}
                        >
                            ТЕГИ
                        </button>
                    </div>
                )}

                {/* Total Summary */}
                <div className="px-6 py-4 shrink-0 flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-1">
                        {analysisType === "expense" ? "Всего потрачено" : "Всего получено"}
                    </span>
                    <span className={`text-3xl font-black ${analysisType === "income" ? 'text-[var(--success-color)]' : 'text-[var(--text-main)]'}`}>
                        ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6 relative">
                    {listItems.length === 0 && !isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-xs uppercase font-bold tracking-widest">
                            Нет данных
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {listItems.map(item => {
                                const isExpanded = expandedItemId === item.id;
                                
                                // Calculate tag breakdown for this category if expanded
                                let itemDetails: { name: string, amount: number, percent: number }[] = [];
                                if (isExpanded) {
                                    if (analysisType === "expense" && tab === "categories") {
                                        const catTx = filteredTx.filter(t => t.targetId === item.id);
                                        const tagMap = new Map<string, number>();
                                        catTx.forEach(t => {
                                            const tagName = t.tag && t.tag.trim() ? t.tag.trim() : "Без тега";
                                            tagMap.set(tagName, (tagMap.get(tagName) || 0) + (t.sourceAmountUSD || t.sourceAmount || 0));
                                        });
                                        tagMap.forEach((amount, name) => {
                                            itemDetails.push({ name, amount, percent: item.amount > 0 ? (amount / item.amount) * 100 : 0 });
                                        });
                                    } else if (analysisType === "income") {
                                        const incTx = filteredTx.filter(t => t.targetId === item.id);
                                        const tagMap = new Map<string, number>();
                                        incTx.forEach(t => {
                                            const tagName = t.tag && t.tag.trim() ? t.tag.trim() : "Без тега";
                                            tagMap.set(tagName, (tagMap.get(tagName) || 0) + (t.sourceAmountUSD || t.sourceAmount || 0));
                                        });
                                        tagMap.forEach((amount, name) => {
                                            itemDetails.push({ name, amount, percent: item.amount > 0 ? (amount / item.amount) * 100 : 0 });
                                        });
                                    }
                                    itemDetails.sort((a, b) => b.amount - a.amount);
                                }

                                return (
                                    <div key={item.id} className="flex flex-col">
                                        <div
                                            className={`flex flex-col gap-1.5 cursor-pointer hover:bg-[var(--glass-item-bg)] p-2 rounded-xl transition-all -mx-2 ${isExpanded ? 'bg-[var(--glass-item-bg)] shadow-inner' : ''}`}
                                            onClick={() => {
                                                if (analysisType === "income" || (analysisType === "expense" && tab === "categories")) {
                                                    toggleExpand(item.id);
                                                } else if (onItemClick) {
                                                    onItemClick(item, "tag", filteredTx);
                                                }
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-inner text-[var(--text-main)] bg-[var(--glass-item-bg)]" style={{ color: item.color }}>
                                                        <item.icon size={14} />
                                                    </div>
                                                    <span className="text-sm font-semibold text-[var(--text-main)]">{item.name}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-sm font-bold ${analysisType === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-main)]'}`}>
                                                        ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)]">{item.percent.toFixed(1)}%</span>
                                                        {(analysisType === "income" || (analysisType === "expense" && tab === "categories")) && (
                                                            <ChevronRight size={10} className={`text-[var(--text-muted)] transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full bg-[var(--glass-item-bg)] h-1.5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                                            </div>
                                        </div>

                                        {/* Tag details */}
                                        {isExpanded && itemDetails.length > 0 && (
                                            <div className="mt-2 ml-11 flex flex-col gap-3 border-l-2 border-[var(--glass-border)] pl-4 animate-in slide-in-from-top-2 duration-300">
                                                {itemDetails.map(tag => (
                                                    <div 
                                                        key={tag.name} 
                                                        className="flex justify-between items-center cursor-pointer group"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onItemClick) {
                                                                onItemClick(
                                                                    { ...item, name: tag.name, id: tag.name }, 
                                                                    "tag", 
                                                                    filteredTx.filter(t => t.targetId === item.id && (t.tag?.trim() || "Без тега") === tag.name)
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Tag size={10} className="text-[var(--text-muted)]" />
                                                            <span className="text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{tag.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-bold ${analysisType === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-main)]'}`}>
                                                                ${tag.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-[var(--text-muted)] w-8 text-right">{tag.percent.toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-[var(--bg-color)]/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in">
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.2)] mb-4">
                            <RefreshCcw size={28} className="animate-spin" />
                        </div>
                        <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest animate-pulse">Загружаю данные...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
