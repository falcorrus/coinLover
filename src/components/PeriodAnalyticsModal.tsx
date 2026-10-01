import React, { useState, useEffect, useMemo } from "react";
import { 
    X, ChevronRight, ChevronUp, ChevronDown, BarChart3, 
    RefreshCcw, Tag, CheckSquare, Circle, Layers, CheckCircle2,
    Wallet, TrendingUp, TrendingDown
} from "lucide-react";
import { Transaction, Category, IncomeSource, Account } from "../types";
import { IconMap } from "../constants";
import { safeParseDate } from "../hooks/utils";
import { googleSheetsService } from "../services/googleSheets";
import { RatesService } from "../services/RatesService";

interface PeriodAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    incomes: IncomeSource[];
    accounts: Account[];
    globalTransactions: Transaction[];
    currencyMode: "base" | "local";
    localCurrencyCode: string;
    baseCurrency?: string;
    baseSymbol?: string;
    onItemClick?: (entity: any, type: "category" | "tag" | "income" | "account", transactions: Transaction[]) => void;
}

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

export const PeriodAnalyticsModal: React.FC<PeriodAnalyticsModalProps> = ({
    isOpen,
    onClose,
    categories,
    incomes,
    accounts,
    globalTransactions,
    currencyMode,
    localCurrencyCode,
    baseCurrency = "USD",
    baseSymbol = "$",
    onItemClick
}) => {
    const [transactions, setTransactions] = useState<Transaction[]>(globalTransactions || []);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
    const [isChartCollapsed, setIsChartCollapsed] = useState<boolean>(false);

    // Initial category selection from localStorage or all by default
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(() => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                const saved = localStorage.getItem("cl_period_selected_categories");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return new Set(parsed);
                    }
                }
            }
        } catch { /* ignore */ }
        return new Set(categories.map(c => c.id));
    });

    // Initial income selection from localStorage or all by default
    const [selectedIncomeIds, setSelectedIncomeIds] = useState<Set<string>>(() => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                const saved = localStorage.getItem("cl_period_selected_incomes");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return new Set(parsed);
                    }
                }
            }
        } catch { /* ignore */ }
        return new Set(incomes.map(i => i.id));
    });

    // Save category selection
    const updateCategorySelection = (newSet: Set<string>) => {
        setSelectedCategoryIds(newSet);
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                localStorage.setItem("cl_period_selected_categories", JSON.stringify(Array.from(newSet)));
            }
        } catch { /* ignore */ }
    };

    // Save income selection
    const updateIncomeSelection = (newSet: Set<string>) => {
        setSelectedIncomeIds(newSet);
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                localStorage.setItem("cl_period_selected_incomes", JSON.stringify(Array.from(newSet)));
            }
        } catch { /* ignore */ }
    };

    // Load transactions if globalTransactions is empty
    useEffect(() => {
        if (!isOpen) return;
        if (globalTransactions.length > 0) {
            setTransactions(globalTransactions);
            return;
        }

        let isMounted = true;
        setIsLoading(true);
        googleSheetsService.fetchSettings().then(data => {
            if (isMounted && data?.transactions) {
                setTransactions(data.transactions);
            }
        }).catch(err => {
            console.error("Failed to load transactions for PeriodAnalyticsModal", err);
        }).finally(() => {
            if (isMounted) setIsLoading(false);
        });

        return () => { isMounted = false; };
    }, [isOpen, globalTransactions]);

    // Format currency symbol
    const displaySymbol = useMemo(() => {
        const getSymbol = (code: string) => {
            const symbols: Record<string, string> = { "USD": "$", "EUR": "€", "GBP": "£", "RUB": "₽", "BRL": "R$" };
            return symbols[code.toUpperCase()] || code.toUpperCase();
        };
        const baseCur = RatesService.getBaseCurrency() || baseCurrency;
        return currencyMode === 'base' ? (baseSymbol || getSymbol(baseCur)) : getSymbol(localCurrencyCode);
    }, [currencyMode, baseCurrency, baseSymbol, localCurrencyCode]);

    // Converter helper
    const toDisplayAmount = (baseAmt: number) => {
        if (currencyMode === 'base') return baseAmt;
        const baseCur = RatesService.getBaseCurrency() || baseCurrency;
        return RatesService.convert(baseAmt, baseCur, localCurrencyCode);
    };

    // Parse transaction amount in Base currency
    const getTxAmountInBase = (t: Transaction) => {
        const baseCur = RatesService.getBaseCurrency() || baseCurrency;
        const account = accounts.find(a => a.id === t.accountId || a.name === t.accountId);
        const sCurr = t.sourceCurrency || account?.currency || baseCur;
        const tCurr = t.targetCurrency || account?.currency || baseCur;
        
        if (t.type === "expense") {
            return (t.sourceAmountUSD && t.sourceAmountUSD !== 0 && baseCur === 'USD')
                ? t.sourceAmountUSD
                : RatesService.convert(t.sourceAmount || 0, sCurr, baseCur);
        } else if (t.type === "income") {
            return (t.targetAmountUSD && t.targetAmountUSD !== 0 && baseCur === 'USD')
                ? t.targetAmountUSD
                : RatesService.convert(t.targetAmount || 0, tCurr, baseCur);
        }
        return 0;
    };

    // Dynamic Months Definition: up to 12 months based on existing data, minimum 1 (current month)
    const monthsRange = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Find earliest transaction date within the last 12 months
        const maxMonthsBack = 11; // 0..11 => 12 months total
        let earliestMonthsAgo = 0; // default to only current month if no data

        transactions.forEach(t => {
            const d = safeParseDate(t.date);
            if (isNaN(d.getTime())) return;
            const yDiff = currentYear - d.getFullYear();
            const mDiff = currentMonth - d.getMonth();
            const totalMonthsDiff = yDiff * 12 + mDiff;

            // Only consider transactions between 0 and 11 months ago (or in current/future)
            if (totalMonthsDiff >= 0 && totalMonthsDiff <= maxMonthsBack) {
                if (totalMonthsDiff > earliestMonthsAgo) {
                    earliestMonthsAgo = totalMonthsDiff;
                }
            } else if (totalMonthsDiff > maxMonthsBack) {
                // If there are older transactions, cap at max 12 months
                earliestMonthsAgo = maxMonthsBack;
            }
        });

        const list = [];
        for (let i = earliestMonthsAgo; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            const key = `${y}-${String(m + 1).padStart(2, '0')}`;
            const monthNumber = m + 1; // 1..12
            const isCurrent = (y === currentYear && m === currentMonth);
            
            list.push({
                key,
                date: d,
                year: y,
                monthIndex: m,
                monthNumber,
                isCurrent,
                shortName: d.toLocaleString('ru-RU', { month: 'short' }).replace('.', ''),
                fullName: d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
            });
        }
        return list;
    }, [transactions]);

    // Filter transactions for the calculated period
    const periodStart = monthsRange[0].date;
    const periodTransactions = useMemo(() => {
        return transactions.filter(t => {
            const d = safeParseDate(t.date);
            return !isNaN(d.getTime()) && d >= periodStart;
        });
    }, [transactions, periodStart]);

    // Active timeframe transactions for the bottom categories list:
    // If a month is selected, only that month's transactions; otherwise all 12 months
    const activeTimeframeTransactions = useMemo(() => {
        if (!selectedMonthKey) return periodTransactions;
        const mObj = monthsRange.find(m => m.key === selectedMonthKey);
        if (!mObj) return periodTransactions;
        return periodTransactions.filter(t => {
            const d = safeParseDate(t.date);
            return d.getFullYear() === mObj.year && d.getMonth() === mObj.monthIndex;
        });
    }, [periodTransactions, selectedMonthKey, monthsRange]);



    // Compute Category/Income/Account Totals for the active timeframe
    const listItems = useMemo(() => {
        if (activeTab === "expense") {
            const map = new Map<string, { amount: number; txs: Transaction[] }>();
            categories.forEach(c => map.set(c.id, { amount: 0, txs: [] }));

            activeTimeframeTransactions.forEach(t => {
                if (t.type === "expense") {
                    const amt = getTxAmountInBase(t);
                    const current = map.get(t.targetId) || { amount: 0, txs: [] };
                    current.amount += amt;
                    current.txs.push(t);
                    map.set(t.targetId, current);
                }
            });

            const list = categories.map(c => {
                const data = map.get(c.id) || { amount: 0, txs: [] };
                const Icon = IconMap[c.icon] || Tag;
                return {
                    id: c.id,
                    name: c.name,
                    icon: Icon,
                    color: c.color || "#6b7280",
                    baseAmount: data.amount,
                    displayAmount: toDisplayAmount(data.amount),
                    transactions: data.txs,
                    percent: 0
                };
            });

            const totalAll = list.reduce((sum, item) => sum + item.baseAmount, 0);
            list.forEach(item => {
                item.percent = totalAll > 0 ? (item.baseAmount / totalAll) * 100 : 0;
            });

            return list.sort((a, b) => b.baseAmount - a.baseAmount);
        } else {
            // Income mode
            const map = new Map<string, { amount: number; txs: Transaction[] }>();
            incomes.forEach(i => map.set(i.id, { amount: 0, txs: [] }));

            activeTimeframeTransactions.forEach(t => {
                if (t.type === "income") {
                    const amt = getTxAmountInBase(t);
                    const current = map.get(t.targetId) || { amount: 0, txs: [] };
                    current.amount += amt;
                    current.txs.push(t);
                    map.set(t.targetId, current);
                }
            });

            const list = incomes.map(inc => {
                const data = map.get(inc.id) || { amount: 0, txs: [] };
                const Icon = IconMap[inc.icon] || Tag;
                return {
                    id: inc.id,
                    name: inc.name,
                    icon: Icon,
                    color: inc.color || "#10b981",
                    baseAmount: data.amount,
                    displayAmount: toDisplayAmount(data.amount),
                    transactions: data.txs,
                    percent: 0
                };
            });

            const totalAll = list.reduce((sum, item) => sum + item.baseAmount, 0);
            list.forEach(item => {
                item.percent = totalAll > 0 ? (item.baseAmount / totalAll) * 100 : 0;
            });

            return list.sort((a, b) => b.baseAmount - a.baseAmount);
        }
    }, [activeTab, categories, incomes, activeTimeframeTransactions, currencyMode, localCurrencyCode, baseCurrency]);

    // Monthly Bar Chart Data
    const monthlyBarData = useMemo(() => {
        return monthsRange.map(m => {
            let monthIncomeBase = 0;
            let monthExpenseBase = 0;

            periodTransactions.forEach(t => {
                const d = safeParseDate(t.date);
                if (d.getFullYear() === m.year && d.getMonth() === m.monthIndex) {
                    const amt = getTxAmountInBase(t);
                    if (t.type === "income") {
                        if (selectedIncomeIds.has(t.targetId)) {
                            monthIncomeBase += amt;
                        }
                    } else if (t.type === "expense") {
                        if (selectedCategoryIds.has(t.targetId)) {
                            monthExpenseBase += amt;
                        }
                    }
                }
            });

            return {
                ...m,
                incomeBase: monthIncomeBase,
                expenseBase: monthExpenseBase,
                displayIncome: toDisplayAmount(monthIncomeBase),
                displayExpense: toDisplayAmount(monthExpenseBase),
                displayNet: toDisplayAmount(monthIncomeBase - monthExpenseBase)
            };
        });
    }, [monthsRange, periodTransactions, selectedCategoryIds, selectedIncomeIds, accounts, currencyMode, localCurrencyCode, baseCurrency]);

    // Max value for chart scaling
    const maxChartValue = useMemo(() => {
        let max = 0;
        monthlyBarData.forEach(d => {
            if (d.displayIncome > max) max = d.displayIncome;
            if (d.displayExpense > max) max = d.displayExpense;
        });
        return max > 0 ? max : 1;
    }, [monthlyBarData]);

    // Summary calculation (either for selected month or 12-month total)
    const summaryData = useMemo(() => {
        if (selectedMonthKey) {
            const m = monthlyBarData.find(item => item.key === selectedMonthKey);
            if (m) {
                return {
                    title: `${m.fullName}`,
                    subtitle: `Месяц № ${m.monthNumber}`,
                    income: m.displayIncome,
                    expense: m.displayExpense,
                    net: m.displayNet,
                    isMonthView: true
                };
            }
        }

        // Period totals (up to 12 months)
        const totalIncome = monthlyBarData.reduce((s, m) => s + m.displayIncome, 0);
        const totalExpense = monthlyBarData.reduce((s, m) => s + m.displayExpense, 0);
        const totalNet = totalIncome - totalExpense;
        const monthsCount = monthlyBarData.length;

        const getMonthsWord = (n: number) => {
            if (n % 10 === 1 && n % 100 !== 11) return "месяц";
            if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "месяца";
            return "месяцев";
        };

        return {
            title: `За ${monthsCount} ${getMonthsWord(monthsCount)}`,
            subtitle: "Cash Flow",
            income: totalIncome,
            expense: totalExpense,
            net: totalNet,
            isMonthView: false
        };
    }, [selectedMonthKey, monthlyBarData]);

    // Chart Bar Colors: Green for Income, Yellow for Expenses
    const INCOME_COLOR = "#10b981"; // Зеленый (Emerald)
    const EXPENSE_COLOR = "#eab308"; // Желтый (Yellow)

    // Multi-select helpers
    const currentSelectedIds = activeTab === "expense" 
        ? selectedCategoryIds 
        : selectedIncomeIds;
    const currentTotalCount = activeTab === "expense" 
        ? categories.length 
        : incomes.length;
    const isAllSelected = currentSelectedIds.size === currentTotalCount;

    const toggleAll = () => {
        if (activeTab === "expense") {
            if (isAllSelected) {
                updateCategorySelection(new Set());
            } else {
                updateCategorySelection(new Set(categories.map(c => c.id)));
            }
        } else {
            if (isAllSelected) {
                updateIncomeSelection(new Set());
            } else {
                updateIncomeSelection(new Set(incomes.map(i => i.id)));
            }
        }
        if (navigator.vibrate) navigator.vibrate(15);
    };

    const toggleItemSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (activeTab === "expense") {
            const next = new Set<string>(selectedCategoryIds);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            updateCategorySelection(next);
        } else {
            const next = new Set<string>(selectedIncomeIds);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            updateIncomeSelection(next);
        }
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const toggleExpandItem = (id: string) => {
        setExpandedItemId(prev => prev === id ? null : id);
        if (navigator.vibrate) navigator.vibrate(10);
    };

    // Sub-breakdown for expanded item (tags for categories/incomes)
    const getItemDetails = (item: any) => {

        const tagMap = new Map<string, number>();
        item.transactions.forEach((t: Transaction) => {
            const tagName = t.tag?.trim() || "Без тега";
            const amt = getTxAmountInBase(t);
            tagMap.set(tagName, (tagMap.get(tagName) || 0) + amt);
        });

        const details: { name: string; baseAmount: number; displayAmount: number; percent: number; color: string }[] = [];
        tagMap.forEach((amt, name) => {
            details.push({
                name,
                baseAmount: amt,
                displayAmount: toDisplayAmount(amt),
                percent: item.baseAmount > 0 ? (amt / item.baseAmount) * 100 : 0,
                color: getTagColor(name)
            });
        });

        return details.sort((a, b) => b.baseAmount - a.baseAmount);
    };

    if (!isOpen) return null;

    // Dynamic SVG Chart Dimensions
    const svgWidth = 360;
    const svgHeight = 175;
    const paddingX = 12;
    const chartBaseline = 135;
    const maxBarHeight = 95;

    const monthsCount = monthsRange.length;
    const slotWidth = (svgWidth - paddingX * 2) / Math.max(1, monthsCount);

    // Adaptive bar width and gap for fewer months (thicker bars for better touch & clickability)
    const { barWidth, barGap, barRadius } = useMemo(() => {
        if (monthsCount <= 2) {
            return { barWidth: 32, barGap: 6, barRadius: 6 };
        }
        if (monthsCount <= 4) {
            return { barWidth: 22, barGap: 4, barRadius: 4 };
        }
        if (monthsCount <= 6) {
            return { barWidth: 16, barGap: 3, barRadius: 3 };
        }
        if (monthsCount <= 8) {
            return { barWidth: 12, barGap: 3, barRadius: 3 };
        }
        return { barWidth: 8, barGap: 2, barRadius: 2 };
    }, [monthsCount]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] animate-in fade-in duration-300 flex justify-center" onClick={onClose}>
            <div className="w-full max-w-md landscape-modal-width h-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="bg-[var(--bg-color)] w-full h-full flex flex-col overflow-hidden relative shadow-2xl safe-pt period-modal-content">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-[var(--glass-border)] shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                title="Закрыть"
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                            >
                                <BarChart3 size={20} />
                            </button>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Период</h2>
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest leading-none mt-1">
                                    {monthsCount === 12 ? "12 месяцев" : `До 12 мес (${monthsCount} ${monthsCount === 1 ? 'месяц' : [2, 3, 4].includes(monthsCount) ? 'месяца' : 'месяцев'})`} • Cash Flow
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 rounded-xl bg-[var(--glass-item-bg)] flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--glass-item-active)] transition-colors border border-[var(--glass-border)]"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Summary Cards with Income / Expense Toggles */}
                    <div className="px-6 py-3.5 shrink-0 bg-[var(--glass-item-bg)]/40 border-b border-[var(--glass-border)]">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wide">{summaryData.title}</span>
                                {summaryData.isMonthView && (
                                    <button 
                                        onClick={() => setSelectedMonthKey(null)}
                                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-tight"
                                    >
                                        Сбросить
                                    </button>
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{summaryData.subtitle}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {/* Income Button (Clickable Toggle) */}
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("income");
                                    setExpandedItemId(null);
                                    if (navigator.vibrate) navigator.vibrate(10);
                                }}
                                className={`flex flex-col p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                                    activeTab === "income" 
                                        ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.02]' 
                                        : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] opacity-75'
                                }`}
                            >
                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: INCOME_COLOR }} />
                                    Доход
                                </span>
                                <span className="text-xs font-black text-emerald-400 mt-0.5 truncate">
                                    +{displaySymbol} {Math.round(summaryData.income).toLocaleString()}
                                </span>
                            </button>

                            {/* Expense Button (Clickable Toggle) */}
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("expense");
                                    setExpandedItemId(null);
                                    if (navigator.vibrate) navigator.vibrate(10);
                                }}
                                className={`flex flex-col p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                                    activeTab === "expense" 
                                        ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.3)] scale-[1.02]' 
                                        : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-item-active)] opacity-75'
                                }`}
                            >
                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: EXPENSE_COLOR }} />
                                    Расход
                                </span>
                                <span className="text-xs font-black text-[var(--text-main)] mt-0.5 truncate">
                                    -{displaySymbol} {Math.round(summaryData.expense).toLocaleString()}
                                </span>
                            </button>

                            {/* Net / Balance */}
                            <div className="flex flex-col bg-[var(--glass-item-bg)] p-2.5 rounded-xl border border-[var(--glass-border)]">
                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1">
                                    Сальдо
                                </span>
                                <span className={`text-xs font-black mt-0.5 truncate ${summaryData.net >= 0 ? 'text-[var(--success-color)]' : 'text-rose-400'}`}>
                                    {summaryData.net >= 0 ? '+' : ''}{displaySymbol} {Math.round(summaryData.net).toLocaleString()}
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* Chart Section */}
                    <div className="px-4 py-2.5 shrink-0 flex flex-col items-center border-b border-[var(--glass-border)] relative">
                        {/* Legend & Controls Bar */}
                        <div className="flex justify-between items-center w-full px-2 mb-1 text-[9px] font-bold text-[var(--text-muted)]">
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab("income"); setExpandedItemId(null); }}
                                    className={`flex items-center gap-1.5 transition-opacity cursor-pointer ${activeTab === 'income' ? 'opacity-100 font-black' : 'opacity-65'}`}
                                >
                                    <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: INCOME_COLOR }} />
                                    <span>Доходы</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab("expense"); setExpandedItemId(null); }}
                                    className={`flex items-center gap-1.5 transition-opacity cursor-pointer ${activeTab === 'expense' ? 'opacity-100 font-black' : 'opacity-65'}`}
                                >
                                    <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: EXPENSE_COLOR }} />
                                    <span>Расходы</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                {selectedMonthKey ? (
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedMonthKey(null)}
                                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                                    >
                                        Нажмите для сброса
                                    </button>
                                ) : (
                                    <span className="text-[9px] font-semibold opacity-70">
                                        Тапните столбец для месяца
                                    </span>
                                )}

                                {/* Collapse / Expand Chart Arrow Button */}
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsChartCollapsed(prev => !prev);
                                        if (navigator.vibrate) navigator.vibrate(10);
                                    }}
                                    title={isChartCollapsed ? "Развернуть график" : "Свернуть график"}
                                    className="w-6 h-6 rounded-lg bg-[var(--glass-item-bg)] hover:bg-[var(--glass-item-active)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer border border-[var(--glass-border)]"
                                >
                                    {isChartCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Dual Bar Chart SVG (Collapsible) */}
                        {!isChartCollapsed && (
                            <div className="w-full relative animate-in fade-in zoom-in-95 duration-200">
                                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
                                    {/* Grid lines */}
                                    <line x1={paddingX} y1={chartBaseline - maxBarHeight} x2={svgWidth - paddingX} y2={chartBaseline - maxBarHeight} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                    <line x1={paddingX} y1={chartBaseline - maxBarHeight / 2} x2={svgWidth - paddingX} y2={chartBaseline - maxBarHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                    <line x1={paddingX} y1={chartBaseline} x2={svgWidth - paddingX} y2={chartBaseline} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

                                    {monthlyBarData.map((m, idx) => {
                                        const slotX = paddingX + idx * slotWidth;
                                        const slotCenter = slotX + slotWidth / 2;
                                        const isSelected = selectedMonthKey === m.key;

                                        // Bar calculations
                                        const incomeH = m.displayIncome > 0 ? Math.max(3, (m.displayIncome / maxChartValue) * maxBarHeight) : 0;
                                        const expenseH = m.displayExpense > 0 ? Math.max(3, (m.displayExpense / maxChartValue) * maxBarHeight) : 0;

                                        const incomeX = slotCenter - barWidth - barGap / 2;
                                        const expenseX = slotCenter + barGap / 2;
                                        const incomeY = chartBaseline - incomeH;
                                        const expenseY = chartBaseline - expenseH;

                                        return (
                                            <g 
                                                key={m.key} 
                                                className="cursor-pointer group"
                                                onClick={() => {
                                                    setSelectedMonthKey(prev => prev === m.key ? null : m.key);
                                                    if (navigator.vibrate) navigator.vibrate(10);
                                                }}
                                            >
                                                {/* Hover / Active backdrop pill */}
                                                <rect 
                                                    x={slotX + 1} 
                                                    y={22} 
                                                    width={slotWidth - 2} 
                                                    height={chartBaseline - 22 + 28} 
                                                    rx={6} 
                                                    fill={isSelected ? "rgba(255,255,255,0.1)" : "transparent"}
                                                    className="group-hover:fill-white/5 transition-colors"
                                                />

                                                {/* Income Bar */}
                                                {incomeH > 0 && (
                                                    <rect 
                                                        x={incomeX} 
                                                        y={incomeY} 
                                                        width={barWidth} 
                                                        height={incomeH} 
                                                        rx={barRadius} 
                                                        fill={INCOME_COLOR} 
                                                        className="transition-all duration-300"
                                                        style={{ 
                                                            fill: INCOME_COLOR,
                                                            opacity: selectedMonthKey && !isSelected ? 0.35 : 1,
                                                            filter: isSelected ? 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' : 'none'
                                                        }}
                                                    />
                                                )}

                                                {/* Expense Bar */}
                                                {expenseH > 0 && (
                                                    <rect 
                                                        x={expenseX} 
                                                        y={expenseY} 
                                                        width={barWidth} 
                                                        height={expenseH} 
                                                        rx={barRadius} 
                                                        fill={EXPENSE_COLOR} 
                                                        className="transition-all duration-300"
                                                        style={{ 
                                                            fill: EXPENSE_COLOR,
                                                            opacity: selectedMonthKey && !isSelected ? 0.35 : 1,
                                                            filter: isSelected ? 'drop-shadow(0 0 6px rgba(234,179,8,0.5))' : 'none'
                                                        }}
                                                    />
                                                )}

                                                {/* Month Label in Legend (e.g. "Май" if <= 6 months, or 1..12) */}
                                                <text 
                                                    x={slotCenter} 
                                                    y={151} 
                                                    textAnchor="middle" 
                                                    fontSize={monthsCount <= 6 ? 11 : 10} 
                                                    fontWeight={isSelected || m.isCurrent ? "900" : "600"} 
                                                    fill={isSelected ? "var(--text-main)" : (m.isCurrent ? "var(--primary-color)" : "var(--text-muted)")}
                                                    className="transition-colors capitalize"
                                                >
                                                    {monthsCount <= 6 ? m.shortName : m.monthNumber}
                                                </text>

                                                {/* Current Month Indicator Dot */}
                                                {m.isCurrent && (
                                                    <circle 
                                                        cx={slotCenter} 
                                                        cy={161} 
                                                        r={2} 
                                                        fill="var(--primary-color, #6d5dfc)" 
                                                    />
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Bottom Category/Income Selector Header */}
                    <div className="flex justify-between items-center px-6 py-3 shrink-0 border-b border-[var(--glass-border)]">
                        <button 
                            type="button"
                            onClick={toggleAll}
                            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors group cursor-pointer"
                        >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isAllSelected ? 'bg-[var(--primary-color)]/20 border-[var(--primary-color)] text-[var(--primary-color)]' : 'bg-transparent border-[var(--glass-border)] text-[var(--text-muted)]'}`}>
                                {isAllSelected ? <CheckSquare size={13} /> : <Circle size={10} />}
                            </div>
                            <span>{isAllSelected ? "СНЯТЬ ВСЕ" : "ВЫБРАТЬ ВСЕ"}</span>
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                {selectedMonthKey ? "За месяц" : `За ${monthsCount} мес`}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] bg-[var(--glass-item-bg)] px-2.5 py-1 rounded-xl border border-[var(--glass-border)]">
                                <Layers size={11} className={
                                    activeTab === "expense" ? "text-amber-400" : "text-emerald-400"
                                } />
                                <span>{currentSelectedIds.size} из {currentTotalCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Categories / Incomes List */}
                    <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-2">
                        {listItems.length === 0 && !isLoading ? (
                            <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-xs uppercase font-bold tracking-widest">
                                {activeTab === "expense" 
                                    ? "Нет данных о расходах" 
                                    : "Нет данных о доходах"}
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-[var(--glass-border)]/50">
                                {listItems.map(item => {
                                    const isSelected = currentSelectedIds.has(item.id);
                                    const isExpanded = expandedItemId === item.id;
                                    const details = isExpanded ? getItemDetails(item) : [];

                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`flex flex-col py-3.5 transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-35 grayscale'}`}
                                        >
                                            {/* Main Row */}
                                            <div className="flex items-center gap-3.5">
                                                {/* Left: Squircle Icon ONLY (Toggles Selection / Visibility) */}
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleItemSelection(item.id, e);
                                                    }}
                                                    title={isSelected ? "Отключить" : "Включить"}
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 transition-transform hover:scale-105 active:scale-95 cursor-pointer select-none"
                                                    style={{ 
                                                        backgroundColor: isSelected ? `${item.color}20` : 'rgba(255,255,255,0.05)',
                                                        color: isSelected ? item.color : '#94a3b8'
                                                    }}
                                                >
                                                    <item.icon size={18} />
                                                </div>

                                                {/* Entire horizontal area from title to amount & chevron expands details */}
                                                <div 
                                                    onClick={() => toggleExpandItem(item.id)}
                                                    className="flex-1 min-w-0 flex items-center justify-between cursor-pointer py-1 select-none group"
                                                >
                                                    {/* Category / Income / Account Title */}
                                                    <span className="text-sm font-bold text-[var(--text-main)] truncate group-hover:text-indigo-400 transition-colors pr-2">
                                                        {item.name}
                                                    </span>

                                                    {/* Right: Amount & Percent & Chevron */}
                                                    <div className="flex flex-col items-end shrink-0 pl-2">
                                                        <span className="text-sm font-black text-[var(--text-main)]">
                                                            {displaySymbol} {Math.round(item.displayAmount).toLocaleString()}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                                                            {item.nativeAmount !== undefined && item.currency && item.currency !== localCurrencyCode && (
                                                                <span className="opacity-70 text-[10px] mr-1">
                                                                    ({Math.round(item.nativeAmount).toLocaleString()} {item.currency})
                                                                </span>
                                                            )}
                                                            <span>{item.percent.toFixed(1)}%</span>
                                                            <ChevronRight size={12} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress Bar (SCR-20260930-muoj.png style) */}
                                            <div className="w-full bg-[var(--glass-item-bg)]/80 h-1.5 rounded-full overflow-hidden mt-2.5">
                                                <div 
                                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                                    style={{ 
                                                        width: `${item.percent}%`,
                                                        backgroundColor: isSelected ? item.color : 'rgba(255,255,255,0.1)'
                                                    }}
                                                />
                                            </div>

                                            {/* Expandable Tag Details */}
                                            {isExpanded && details.length > 0 && (
                                                <div className="mt-3 ml-12 flex flex-col gap-2.5 border-l-2 border-[var(--glass-border)] pl-4 animate-in slide-in-from-top-2 duration-300">
                                                    {details.map(d => (
                                                        <div key={d.name} className="flex justify-between items-center text-xs">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Tag size={11} style={{ color: d.color }} className="shrink-0" />
                                                                <span className="text-[var(--text-muted)] truncate">{d.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 font-bold shrink-0">
                                                                <span className="text-[var(--text-main)]">
                                                                    {displaySymbol} {Math.round(d.displayAmount).toLocaleString()}
                                                                </span>
                                                                <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">
                                                                    {d.percent.toFixed(0)}%
                                                                </span>
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
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.2)] mb-4">
                                <RefreshCcw size={28} className="animate-spin" />
                            </div>
                            <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest animate-pulse">
                                Загружаю данные...
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
