import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, ChevronLeft, ChevronRight, PieChart, List, Tag, RefreshCcw, MoreHorizontal, TrendingUp, TrendingDown, CheckCircle2, Circle } from "lucide-react";
import { Transaction, Category, IncomeSource, Account } from "../types";
import { IconMap } from "../constants";
import { googleSheetsService } from "../services/googleSheets";

interface AnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    incomes: IncomeSource[];
    accounts: Account[];
    globalTransactions: Transaction[];
    initialType?: "expense" | "income";
    onItemClick?: (entity: any, type: "category" | "tag" | "income" | "account", transactions: Transaction[]) => void;
}

const globalAnalyticsCache = new Map<string, Transaction[]>();

// --- Helpers ---

const getStoredSelections = () => {
    try {
        const stored = localStorage.getItem("cl_analytics_selections");
        if (!stored) return null;
        const { date, data } = JSON.parse(stored);
        if (date !== new Date().toDateString()) {
            localStorage.removeItem("cl_analytics_selections");
            return null;
        }
        const parsedData: Record<string, Set<string>> = {};
        Object.keys(data).forEach(key => { parsedData[key] = new Set(data[key]); });
        return parsedData;
    } catch { return null; }
};

const saveStoredSelections = (selections: Record<string, Set<string>>) => {
    const data: Record<string, string[]> = {};
    Object.keys(selections).forEach(key => { data[key] = Array.from(selections[key]); });
    localStorage.setItem("cl_analytics_selections", JSON.stringify({ date: new Date().toDateString(), data }));
};

const TAG_COLORS = [
    "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899",
    "#f43f5e", "#fb923c", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"
];

const getTagColor = (name: string) => {
    if (name === "Без тега") return "#94a3b8";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

// --- Sub-components ---

interface DetailItemProps {
    detail: any;
    analysisType: "expense" | "income";
    onClick: () => void;
}

const DetailItem: React.FC<DetailItemProps> = ({ detail, analysisType, onClick }) => (
    <div className="flex justify-between items-center cursor-pointer group" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <div className="flex items-center gap-2">
            <detail.icon size={10} style={{ color: detail.color }} className="shrink-0" />
            <span className="text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{detail.name}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${analysisType === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-main)]'}`}>
                ${detail.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] font-bold text-[var(--text-muted)] w-8 text-right">{detail.percent.toFixed(0)}%</span>
        </div>
    </div>
);

// --- Main Component ---

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ 
    isOpen, onClose, categories, incomes, accounts, globalTransactions, initialType = "expense", onItemClick 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisType, setAnalysisType] = useState<"expense" | "income">(initialType);
    const [tab, setTab] = useState<"categories" | "tags">("categories");
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [viewType, setViewType] = useState<"list" | "chart">("list");
    const initializedKeys = useRef<Set<string>>(new Set());

    const [selections, setSelections] = useState<Record<string, Set<string>>>(() => 
        getStoredSelections() || { income: new Set(), expense_categories: new Set(), expense_tags: new Set() }
    );

    const currentKey = useMemo(() => analysisType === "income" ? (tab === "categories" ? "income" : "income_tags") : `expense_${tab}`, [analysisType, tab]);
    const selectedIds = useMemo(() => selections[currentKey] || new Set(), [selections, currentKey]);

    const filteredTx = useMemo(() => transactions.filter(t => {
        if (t.type !== analysisType) return false;
        const txDate = new Date(t.date.replace(/-/g, '/').replace('T', ' '));
        return txDate.getFullYear() === currentDate.getFullYear() && txDate.getMonth() === currentDate.getMonth();
    }), [transactions, analysisType, currentDate]);

    const getTxUSD = (t: Transaction) => {
        const val = t.sourceAmountUSD || t.targetAmountUSD || t.sourceAmount || 0;
        return isNaN(Number(val)) ? 0 : Number(val);
    };

    const listItems = useMemo(() => {
        let items: { id: string, name: string, icon: any, color: string, amount: number, percent: number }[] = [];
        if (tab === "categories") {
            const itemMap = new Map<string, number>();
            filteredTx.forEach(t => itemMap.set(t.targetId, (itemMap.get(t.targetId) || 0) + getTxUSD(t)));
            itemMap.forEach((amount, id) => {
                if (analysisType === "expense") {
                    const cat = categories.find(c => c.id === id);
                    items.push({ id, name: cat?.name || "Удаленная категория", icon: cat ? (IconMap[cat.icon] || MoreHorizontal) : MoreHorizontal, color: cat?.color || "#6b7280", amount, percent: 0 });
                } else {
                    const inc = incomes.find(i => i.id === id);
                    items.push({ id, name: inc?.name || "Удаленный источник", icon: TrendingUp, color: inc?.color || "var(--success-color)", amount, percent: 0 });
                }
            });
        } else {
            const tagMap = new Map<string, number>();
            filteredTx.forEach(t => {
                const tagName = t.tag?.trim() || "Без тега";
                tagMap.set(tagName, (tagMap.get(tagName) || 0) + getTxUSD(t));
            });
            tagMap.forEach((amount, id) => items.push({ id, name: id, icon: Tag, color: getTagColor(id), amount, percent: 0 }));
        }
        items.sort((a, b) => b.amount - a.amount);
        const total = items.reduce((s, i) => s + i.amount, 0);
        return items.map(i => ({ ...i, percent: total > 0 ? (i.amount / total) * 100 : 0 }));
    }, [filteredTx, tab, analysisType, categories, incomes]);

    const displayedTotal = useMemo(() => listItems.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + i.amount, 0), [listItems, selectedIds]);

    useEffect(() => { if (isOpen) { setAnalysisType(initialType); setExpandedItemId(null); } }, [isOpen, initialType]);

    useEffect(() => {
        if (isOpen && listItems.length > 0 && !initializedKeys.current.has(currentKey)) {
            const stored = getStoredSelections();
            if (!stored || !stored[currentKey] || stored[currentKey].size === 0) {
                setSelections(prev => {
                    const next = { ...prev, [currentKey]: new Set(listItems.map(i => i.id)) };
                    saveStoredSelections(next);
                    return next;
                });
            }
            initializedKeys.current.add(currentKey);
        }
    }, [listItems, isOpen, currentKey]);

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;
        const loadData = async () => {
            const cacheKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const globalMonthTx = globalTransactions.filter(t => {
                const d = new Date(t.date.replace(/-/g, '/').replace('T', ' '));
                return d.getFullYear() === currentDate.getFullYear() && (d.getMonth() + 1) === (currentDate.getMonth() + 1);
            });
            if (globalMonthTx.length > 0) { setTransactions(globalTransactions); globalAnalyticsCache.set(cacheKey, globalTransactions); return; }
            if (globalAnalyticsCache.has(cacheKey)) { setTransactions(globalAnalyticsCache.get(cacheKey)!); return; }
            setIsLoading(true);
            try {
                const data = await googleSheetsService.fetchMonthData(cacheKey);
                if (isMounted) {
                    const tx = data?.transactions || [];
                    globalAnalyticsCache.set(cacheKey, tx);
                    setTransactions(tx);
                }
            } catch (err) { console.error(err); } finally { if (isMounted) setIsLoading(false); }
        };
        loadData();
        return () => { isMounted = false; };
    }, [isOpen, currentDate, globalTransactions]);

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const nextSet = new Set(selectedIds);
        if (nextSet.has(id)) nextSet.delete(id); else nextSet.add(id);
        const next = { ...selections, [currentKey]: nextSet };
        setSelections(next); saveStoredSelections(next);
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const toggleAll = () => {
        const ids = listItems.map(i => i.id);
        const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id));
        const nextSet = new Set(selectedIds);
        if (allSelected) ids.forEach(id => nextSet.delete(id)); else ids.forEach(id => nextSet.add(id));
        const next = { ...selections, [currentKey]: nextSet };
        setSelections(next); saveStoredSelections(next);
        if (navigator.vibrate) navigator.vibrate(20);
    };

    const getItemDetails = (item: any) => {
        let details: any[] = [];
        if (tab === "categories") {
            const subTx = filteredTx.filter(t => t.targetId === item.id);
            const map = new Map<string, number>();
            subTx.forEach(t => { const n = t.tag?.trim() || "Без тега"; map.set(n, (map.get(n) || 0) + getTxUSD(t)); });
            map.forEach((amount, name) => details.push({ id: name, name, icon: Tag, color: getTagColor(name), amount, percent: item.amount > 0 ? (amount / item.amount) * 100 : 0 }));
        } else {
            const subTx = filteredTx.filter(t => (t.tag?.trim() || "Без тега") === item.name);
            const map = new Map<string, number>();
            subTx.forEach(t => map.set(t.targetId, (map.get(t.targetId) || 0) + getTxUSD(t)));
            map.forEach((amount, id) => {
                if (analysisType === "expense") {
                    const cat = categories.find(c => c.id === id);
                    details.push({ id, name: cat?.name || "Удаленная категория", icon: cat ? (IconMap[cat.icon] || MoreHorizontal) : MoreHorizontal, color: cat?.color || "#6b7280", amount, percent: item.amount > 0 ? (amount / item.amount) * 100 : 0 });
                } else {
                    const inc = incomes.find(i => i.id === id);
                    details.push({ id, name: inc?.name || "Удаленный источник", icon: TrendingUp, color: inc?.color || "var(--success-color)", amount, percent: item.amount > 0 ? (amount / item.amount) * 100 : 0 });
                }
            });
        }
        return details.sort((a, b) => b.amount - a.amount);
    };

    if (!isOpen) return null;

    const isAllVisibleSelected = listItems.length > 0 && listItems.every(id => selectedIds.has(id.id));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] animate-in fade-in duration-300 flex justify-center" onClick={onClose}>
            <div className="w-full max-w-md h-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="bg-[var(--bg-color)] w-full h-full flex flex-col overflow-hidden relative shadow-2xl" style={{ paddingTop: `env(safe-area-inset-top)` }}>
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-[var(--glass-border)] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--primary-color)] ${analysisType === 'income' ? 'bg-[var(--success-color)]/20 text-[var(--success-color)]' : 'bg-[var(--primary-color)]/20 text-[var(--primary-color)]'}`}><PieChart size={20} /></div>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">{analysisType === "expense" ? "Аналитика расходов" : "Аналитика доходов"}</h2>
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest leading-none mt-1">за период</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--glass-item-bg)] flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--glass-item-active)] transition-colors border border-[var(--glass-border)]"><X size={20} /></button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex p-2 gap-1 bg-[var(--glass-item-bg)]/30 border-b border-[var(--glass-border)]">
                        <button onClick={() => { setAnalysisType("expense"); setExpandedItemId(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black transition-all ${analysisType === "expense" ? 'bg-[var(--primary-color)] text-white shadow-lg' : 'text-[var(--text-muted)]'}`}><TrendingDown size={12} /> РАСХОДЫ</button>
                        <button onClick={() => { setAnalysisType("income"); setExpandedItemId(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black transition-all ${analysisType === "income" ? 'bg-[var(--success-color)] text-white shadow-lg' : 'text-[var(--text-muted)]'}`}><TrendingUp size={12} /> ДОХОДЫ</button>
                    </div>

                    {/* Date Navigation */}
                    <div className="flex justify-between items-center px-4 py-3 bg-[var(--glass-item-bg)]/50 shrink-0 border-b border-[var(--glass-border)]">
                        <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><ChevronLeft size={20} /></button>
                        <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">{currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><ChevronRight size={20} /></button>
                    </div>

                    {/* Tab Selection */}
                    <div className="flex gap-2 p-4 shrink-0 border-b border-[var(--glass-border)]">
                        <button onClick={() => { setTab("categories"); setExpandedItemId(null); }} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${tab === "categories" ? "bg-[var(--glass-item-active)] text-[var(--text-main)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-item-bg)]"}`}>{analysisType === "expense" ? "КАТЕГОРИИ" : "ИСТОЧНИКИ"}</button>
                        <button onClick={() => { setTab("tags"); setExpandedItemId(null); }} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${tab === "tags" ? "bg-[var(--glass-item-active)] text-[var(--text-main)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-item-bg)]"}`}>ТЕГИ</button>
                    </div>

                    <div className="px-6 py-4 shrink-0 flex flex-col items-center relative">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-1">{analysisType === "expense" ? "Всего потрачено" : "Всего получено"}</span>
                        <span className={`text-3xl font-black ${analysisType === "income" ? 'text-[var(--success-color)]' : 'text-[var(--text-main)]'}`}>${displayedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="px-6 pb-2 shrink-0 flex justify-between items-center">
                        <button onClick={toggleAll} className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors uppercase tracking-widest group">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isAllVisibleSelected ? 'bg-[var(--primary-color)]/20 border-[var(--primary-color)] text-[var(--primary-color)]' : 'bg-transparent border-[var(--glass-border)] text-[var(--text-muted)]'}`}>{isAllVisibleSelected ? <CheckCircle2 size={12} /> : <Circle size={12} />}</div>
                            {isAllVisibleSelected ? "Снять все" : "Выбрать все"}
                        </button>
                        <button 
                            onClick={() => { setViewType(v => v === "list" ? "chart" : "list"); if (navigator.vibrate) navigator.vibrate(10); }}
                            className="w-8 h-8 rounded-lg bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                        >
                            {viewType === "list" ? <PieChart size={16} /> : <List size={16} />}
                        </button>
                    </div>

                    {/* Content View (List or Chart) */}
                    <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6 relative">
                        {listItems.length === 0 && !isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-xs uppercase font-bold tracking-widest">Нет данных</div>
                        ) : viewType === "chart" ? (
                            <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-95 duration-500">
                                <div className="relative w-64 h-64 mb-8">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        {(() => {
                                            let currentAngle = 0;
                                            const total = displayedTotal;
                                            return listItems.map(item => {
                                                if (!selectedIds.has(item.id)) return null;
                                                const slicePercent = (item.amount / total) * 100;
                                                const largeArcFlag = slicePercent > 50 ? 1 : 0;
                                                
                                                const startX = 50 + 45 * Math.cos((currentAngle * Math.PI) / 50);
                                                const startY = 50 + 45 * Math.sin((currentAngle * Math.PI) / 50);
                                                currentAngle += slicePercent;
                                                const endX = 50 + 45 * Math.cos((currentAngle * Math.PI) / 50);
                                                const endY = 50 + 45 * Math.sin((currentAngle * Math.PI) / 50);

                                                return (
                                                    <path
                                                        key={item.id}
                                                        d={`M 50 50 L ${startX} ${startY} A 45 45 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                                                        fill={item.color}
                                                        className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                                                        onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                                                        style={{ 
                                                            filter: expandedItemId === item.id ? 'brightness(1.2) drop-shadow(0 0 5px rgba(255,255,255,0.2))' : 'none',
                                                            transform: expandedItemId === item.id ? 'scale(1.05)' : 'none',
                                                            transformOrigin: 'center'
                                                        }}
                                                    />
                                                );
                                            });
                                        })()}
                                        <circle cx="50" cy="50" r="25" fill="var(--bg-color)" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-tighter mb-0.5">Total</span>
                                        <span className="text-sm font-black text-[var(--text-main)]">${Math.round(displayedTotal).toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                {/* Chart Legend */}
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3 w-full">
                                    {listItems.filter(i => selectedIds.has(i.id)).slice(0, 6).map(item => (
                                        <div key={item.id} className="flex items-center gap-2 min-w-0" onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}>
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                            <span className="text-[10px] font-bold text-[var(--text-main)] truncate uppercase tracking-widest">{item.name}</span>
                                            <span className="text-[9px] font-medium text-[var(--text-muted)] ml-auto">{item.percent.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                    {listItems.filter(i => selectedIds.has(i.id)).length > 6 && (
                                        <div className="col-span-2 text-center text-[9px] text-[var(--text-muted)] uppercase font-bold mt-2 opacity-50">и еще {listItems.filter(i => selectedIds.has(i.id)).length - 6} категорий</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 mt-2">
                                {listItems.map(item => {
                                    const isExpanded = expandedItemId === item.id;
                                    const isSelected = selectedIds.has(item.id);
                                    const details = isExpanded ? getItemDetails(item) : [];

                                    return (
                                        <div key={item.id} className={`flex flex-col transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                                            <div className={`flex flex-col gap-1.5 p-2 rounded-xl transition-all -mx-2 cursor-pointer ${isExpanded ? 'bg-[var(--glass-item-bg)] shadow-inner' : ''}`} onClick={() => { setExpandedItemId(isExpanded ? null : item.id); if (navigator.vibrate) navigator.vibrate(10); }}>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div onClick={(e) => toggleSelect(item.id, e)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer shrink-0 border ${isSelected ? 'bg-[var(--glass-item-bg)] border-transparent' : 'bg-transparent border-[var(--glass-border)]'}`} style={{ color: isSelected ? item.color : 'transparent' }}>{isSelected ? <item.icon size={14} /> : <Circle size={10} className="text-[var(--text-muted)] opacity-50" />}</div>
                                                        <span className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{item.name}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-sm font-bold ${!isSelected ? 'text-[var(--text-muted)]' : (analysisType === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-main)]')}`}>${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] font-bold text-[var(--text-muted)]">{item.percent.toFixed(1)}%</span>
                                                            <ChevronRight size={10} className={`text-[var(--text-muted)] transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-[var(--glass-item-bg)] h-1.5 rounded-xl overflow-hidden"><div className="h-full rounded-xl transition-all duration-1000 ease-out" style={{ width: `${item.percent}%`, backgroundColor: isSelected ? item.color : 'rgba(255,255,255,0.1)' }} /></div>
                                            </div>
                                            {isExpanded && details.length > 0 && (
                                                <div className="mt-2 ml-11 flex flex-col gap-3 border-l-2 border-[var(--glass-border)] pl-4 animate-in slide-in-from-top-2 duration-300">
                                                    {details.map(detail => (
                                                        <DetailItem key={detail.id} detail={detail} analysisType={analysisType} onClick={() => {
                                                            if (!onItemClick) return;
                                                            const eType = analysisType === "income" ? (tab === "categories" ? "income" : "tag") : (tab === "tags" ? "category" : "tag");
                                                            const filter = filteredTx.filter(t => {
                                                                if (analysisType === "income") {
                                                                    return tab === "categories" ? (t.targetId === item.id && (t.tag?.trim() || "Без тега") === detail.name) : ((t.tag?.trim() || "Без тега") === item.name && t.targetId === detail.id);
                                                                }
                                                                return tab === "tags" ? ((t.tag?.trim() || "Без тега") === item.name && t.targetId === detail.id) : (t.targetId === item.id && (t.tag?.trim() || "Без тега") === detail.name);
                                                            });
                                                            onItemClick({ ...detail }, eType, filter);
                                                        }} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {isLoading && (
                        <div className="absolute inset-0 bg-[var(--bg-color)]/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.2)] mb-4"><RefreshCcw size={28} className="animate-spin" /></div>
                            <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest animate-pulse">Загружаю данные...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
