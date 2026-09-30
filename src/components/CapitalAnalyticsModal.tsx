import React, { useState, useEffect, useMemo } from "react";
import { 
    X, ChevronRight, ChevronUp, ChevronDown, 
    RefreshCcw, Wallet, TrendingUp, TrendingDown, 
    CheckSquare, Circle, Layers, Landmark
} from "lucide-react";
import { Transaction, Account } from "../types";
import { IconMap } from "../constants";
import { safeParseDate } from "../hooks/utils";
import { googleSheetsService } from "../services/googleSheets";
import { RatesService } from "../services/RatesService";
import { BalanceHistoryService } from "../services/balanceHistoryService";
import { useLanguage } from "../contexts/LanguageContext";

interface CapitalAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
    transactions?: Transaction[];
    globalTransactions?: Transaction[];
    currencyMode?: "base" | "local";
    localCurrencyCode?: string;
    baseCurrency?: string;
    baseSymbol?: string;
    onItemClick?: (account: Account, transactions: Transaction[]) => void;
}

export const CapitalAnalyticsModal: React.FC<CapitalAnalyticsModalProps> = ({
    isOpen,
    onClose,
    accounts,
    transactions: propTransactions,
    globalTransactions,
    currencyMode = "base",
    localCurrencyCode = "USD",
    baseCurrency = "USD",
    baseSymbol = "$",
    onItemClick
}) => {
    let t = (k: string) => k;
    try {
        const langContext = useLanguage();
        if (langContext && langContext.t) t = langContext.t;
    } catch {
        // Outside LanguageProvider fallback
    }
    const initialTxs = propTransactions || globalTransactions || [];
    const [transactions, setTransactions] = useState<Transaction[]>(initialTxs);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
    const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
    const [isChartCollapsed, setIsChartCollapsed] = useState<boolean>(false);

    // Initial account selection from localStorage or all by default
    const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(() => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                const saved = localStorage.getItem("cl_capital_selected_accounts");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return new Set(parsed);
                    }
                }
            }
        } catch { /* ignore */ }
        return new Set(accounts.map(a => a.id));
    });

    const updateAccountSelection = (newSet: Set<string>) => {
        setSelectedAccountIds(newSet);
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                localStorage.setItem("cl_capital_selected_accounts", JSON.stringify(Array.from(newSet)));
            }
        } catch { /* ignore */ }
    };

    // Load transactions if empty
    useEffect(() => {
        if (!isOpen) return;
        const currentList = propTransactions || globalTransactions || [];
        if (currentList.length > 0) {
            setTransactions(currentList);
            return;
        }

        let isMounted = true;
        setIsLoading(true);
        googleSheetsService.fetchSettings().then(data => {
            if (isMounted && data?.transactions) {
                setTransactions(data.transactions);
            }
        }).catch(err => {
            console.error("CapitalAnalyticsModal: failed to load transactions", err);
        }).finally(() => {
            if (isMounted) setIsLoading(false);
        });

        return () => { isMounted = false; };
    }, [isOpen, propTransactions, globalTransactions]);

    // Format currency amount helper
    const toDisplayAmount = (baseAmt: number): number => {
        if (currencyMode === "local" && localCurrencyCode && localCurrencyCode !== baseCurrency) {
            return RatesService.convert(baseAmt, baseCurrency, localCurrencyCode);
        }
        return baseAmt;
    };

    const displaySymbol = currencyMode === "local" ? (localCurrencyCode || baseSymbol) : baseSymbol;

    // 12-month calendar slots
    const monthsRange = useMemo(() => {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        const list = [];

        const monthNames = [
            "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
            "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
        ];
        const monthShortNames = [
            "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
            "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
        ];

        for (let i = 11; i >= 0; i--) {
            const d = new Date(curYear, curMonth - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            const key = `${y}-${String(m + 1).padStart(2, "0")}`;
            const shortYear = String(y).slice(-2);
            list.push({
                key,
                year: y,
                monthIndex: m,
                monthNumber: m + 1,
                name: monthNames[m],
                shortName: monthShortNames[m],
                shortWithYear: `${monthShortNames[m]} '${shortYear}`,
                fullName: `${monthNames[m]} ${y}`,
                isCurrent: i === 0
            });
        }
        return list;
    }, []);

    // Filter transactions for period
    const periodTransactions = useMemo(() => {
        if (monthsRange.length === 0) return [];
        const startKey = monthsRange[0].key;
        return transactions.filter(t => {
            const d = safeParseDate(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            return key >= startKey;
        });
    }, [transactions, monthsRange]);

    // Historical monthly balances across 12 months using BalanceHistoryService
    const monthlyBalances = useMemo(() => {
        return BalanceHistoryService.computeMonthlyBalances(
            accounts,
            transactions,
            monthsRange,
            baseCurrency,
            selectedAccountIds
        );
    }, [accounts, transactions, monthsRange, baseCurrency, selectedAccountIds]);

    // Active snapshot (either selected month or latest/today)
    const activeBalanceRecord = useMemo(() => {
        if (selectedMonthKey) {
            return monthlyBalances.find(b => b.monthKey === selectedMonthKey) || monthlyBalances[monthlyBalances.length - 1];
        }
        return monthlyBalances[monthlyBalances.length - 1];
    }, [selectedMonthKey, monthlyBalances]);

    // 12-month change in balance (from 1st month to 12th month)
    const period12mBalanceChange = useMemo(() => {
        if (monthlyBalances.length < 2) return { change: 0, percent: 0 };
        const first = monthlyBalances[0].totalBase;
        const last = monthlyBalances[monthlyBalances.length - 1].totalBase;
        const diff = last - first;
        const pct = first !== 0 ? (diff / Math.abs(first)) * 100 : 0;
        return {
            change: toDisplayAmount(diff),
            percent: Math.round(pct * 10) / 10
        };
    }, [monthlyBalances, currencyMode, localCurrencyCode, baseCurrency]);

    // Transactions for active selected month (to show in expanded account details)
    const activeTimeframeTransactions = useMemo(() => {
        if (!selectedMonthKey) return periodTransactions;
        const mObj = monthsRange.find(m => m.key === selectedMonthKey);
        if (!mObj) return periodTransactions;
        return periodTransactions.filter(t => {
            const d = safeParseDate(t.date);
            return d.getFullYear() === mObj.year && d.getMonth() === mObj.monthIndex;
        });
    }, [periodTransactions, selectedMonthKey, monthsRange]);

    // List of accounts on the active snapshot date
    const accountList = useMemo(() => {
        const snapshots = activeBalanceRecord?.accountBalances || [];
        const totalBase = snapshots.reduce((sum, a) => {
            if (selectedAccountIds.has(a.accountId)) {
                return sum + a.baseBalance;
            }
            return sum;
        }, 0);

        const list = accounts.map(acc => {
            const found = snapshots.find(b => b.accountId === acc.id);
            const nativeAmount = found ? found.nativeBalance : Number(acc.balance) || 0;
            const baseAmount = found ? found.baseBalance : RatesService.convert(nativeAmount, acc.currency || baseCurrency || "USD", baseCurrency || "USD");
            const Icon = acc.icon ? (IconMap[acc.icon] || Wallet) : Wallet;

            const aid = String(acc.id || "").toLowerCase();
            const aname = String(acc.name || "").toLowerCase();
            const txs = activeTimeframeTransactions.filter(t => {
                const txAcc = String(t.accountId || "").toLowerCase();
                const txTarget = String(t.targetId || "").toLowerCase();
                return txAcc === aid || (aname !== "" && txAcc === aname) || txTarget === aid || (aname !== "" && txTarget === aname);
            });

            // 12-month historical breakdown for this specific account (newest month at the top)
            const monthlyHistory = monthsRange.map((mObj, mIdx) => {
                const rec = monthlyBalances.find(b => b.monthKey === mObj.key);
                const foundInMonth = rec?.accountBalances.find(a => a.accountId === acc.id);
                const nativeBal = foundInMonth ? foundInMonth.nativeBalance : Number(acc.balance) || 0;
                const baseBal = foundInMonth ? foundInMonth.baseBalance : RatesService.convert(nativeBal, acc.currency || baseCurrency || "USD", baseCurrency || "USD");
                const displayBal = toDisplayAmount(baseBal);

                // Previous month in chronological array for delta
                const prevMObj = mIdx > 0 ? monthsRange[mIdx - 1] : null;
                let deltaBase = 0;
                let hasDelta = false;
                if (prevMObj) {
                    const prevRec = monthlyBalances.find(b => b.monthKey === prevMObj.key);
                    const prevFound = prevRec?.accountBalances.find(a => a.accountId === acc.id);
                    if (prevFound) {
                        deltaBase = baseBal - prevFound.baseBalance;
                        hasDelta = true;
                    }
                }

                return {
                    monthKey: mObj.key,
                    year: mObj.year,
                    monthIndex: mObj.monthIndex,
                    monthNumber: mObj.monthNumber,
                    name: mObj.name,
                    shortName: mObj.shortName,
                    shortWithYear: mObj.shortWithYear,
                    isCurrent: mObj.isCurrent,
                    nativeBalance: nativeBal,
                    baseBalance: baseBal,
                    displayBalance: displayBal,
                    deltaBase,
                    displayDelta: toDisplayAmount(deltaBase),
                    hasDelta
                };
            }).slice().reverse();

            return {
                account: acc,
                id: acc.id,
                name: acc.name,
                icon: Icon,
                color: acc.color || "#6366f1",
                currency: acc.currency,
                nativeAmount,
                baseAmount,
                displayAmount: toDisplayAmount(baseAmount),
                transactions: txs,
                monthlyHistory,
                percent: totalBase > 0 && selectedAccountIds.has(acc.id) ? (baseAmount / totalBase) * 100 : 0
            };
        });

        return list.sort((a, b) => b.baseAmount - a.baseAmount);
    }, [accounts, activeBalanceRecord, selectedAccountIds, activeTimeframeTransactions, monthsRange, monthlyBalances, currencyMode, localCurrencyCode, baseCurrency]);

    // Selection helpers
    const isAllSelected = selectedAccountIds.size === accounts.length;

    const toggleAll = () => {
        if (isAllSelected) {
            updateAccountSelection(new Set());
        } else {
            updateAccountSelection(new Set(accounts.map(a => a.id)));
        }
        if (navigator.vibrate) navigator.vibrate(15);
    };

    const toggleAccountSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const next = new Set<string>(selectedAccountIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        updateAccountSelection(next);
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const toggleExpandAccount = (id: string) => {
        setExpandedAccountId(prev => prev === id ? null : id);
        if (navigator.vibrate) navigator.vibrate(10);
    };

    // Summary calculation for the Hero Card
    const summaryData = useMemo(() => {
        const balAmount = activeBalanceRecord ? toDisplayAmount(activeBalanceRecord.totalBase) : 0;

        if (selectedMonthKey) {
            const m = monthsRange.find(item => item.key === selectedMonthKey);
            return {
                title: m ? `Остаток • ${m.shortWithYear}` : "Остаток на конец месяца",
                subtitle: m ? `Месяц № ${m.monthNumber} • ${m.year}` : "",
                balance: balAmount,
                change: activeBalanceRecord?.changeFromPrevMonthBase !== undefined 
                    ? toDisplayAmount(activeBalanceRecord.changeFromPrevMonthBase) 
                    : undefined,
                percentChange: activeBalanceRecord?.percentChangeFromPrevMonth,
                isMonthView: true
            };
        }

        return {
            title: `Остаток на сегодня`,
            subtitle: "12 месяцев динамики",
            balance: balAmount,
            change: period12mBalanceChange.change,
            percentChange: period12mBalanceChange.percent,
            isMonthView: false
        };
    }, [selectedMonthKey, activeBalanceRecord, monthsRange, period12mBalanceChange, currencyMode, localCurrencyCode, baseCurrency]);

    // SVG Area Chart calculations
    const svgWidth = 360;
    const svgHeight = 165;
    const paddingX = 14;
    const chartTop = 28;
    const chartBottom = 125;
    const chartHeight = chartBottom - chartTop;
    const slotWidth = (svgWidth - paddingX * 2) / 12;

    const chartPoints = useMemo(() => {
        const balances = monthlyBalances.map(b => toDisplayAmount(b.totalBase));
        const maxB = Math.max(...balances, 1);
        const minB = Math.min(...balances, 0);
        const range = maxB - minB > 0 ? maxB - minB : 1;

        return balances.map((b, idx) => {
            const x = paddingX + idx * slotWidth + slotWidth / 2;
            const normalized = (b - minB) / range;
            const y = chartBottom - normalized * chartHeight;
            return {
                x,
                y,
                value: b,
                record: monthlyBalances[idx]
            };
        });
    }, [monthlyBalances, slotWidth, chartBottom, chartHeight, paddingX, currencyMode, localCurrencyCode, baseCurrency]);

    // SVG Line and Area paths
    const linePath = useMemo(() => {
        if (chartPoints.length === 0) return "";
        return chartPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    }, [chartPoints]);

    const areaPath = useMemo(() => {
        if (chartPoints.length === 0) return "";
        const first = chartPoints[0];
        const last = chartPoints[chartPoints.length - 1];
        return `${linePath} L ${last.x.toFixed(1)} ${chartBottom} L ${first.x.toFixed(1)} ${chartBottom} Z`;
    }, [linePath, chartPoints, chartBottom]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] animate-in fade-in duration-300 flex justify-center" onClick={onClose}>
            <div className="w-full max-w-md landscape-modal-width h-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="bg-[var(--bg-color)] w-full h-full flex flex-col overflow-hidden relative shadow-2xl safe-pt capital-modal-content">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-[var(--glass-border)] shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                title="Закрыть"
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                            >
                                <Landmark size={20} />
                            </button>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
                                    {t('Capital')}
                                </h2>
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest leading-none mt-1">
                                    {t('Capital Dynamics')} • 12 месяцев
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-[var(--glass-item-bg)] flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--glass-item-active)] transition-colors border border-[var(--glass-border)] cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Summary Hero Card */}
                    <div className="px-6 py-3.5 shrink-0 bg-[var(--glass-item-bg)]/40 border-b border-[var(--glass-border)]">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider truncate">
                                {summaryData.title}
                            </span>
                            {summaryData.isMonthView && (
                                <button 
                                    onClick={() => setSelectedMonthKey(null)}
                                    className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-tight cursor-pointer"
                                >
                                    Сбросить к сегодня
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-[var(--text-main)] tracking-tight">
                                    {displaySymbol} {Math.round(summaryData.balance).toLocaleString()}
                                </span>
                            </div>

                            {/* Dynamics Change Badge */}
                            {summaryData.change !== undefined && (
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 ${
                                    summaryData.change >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                                }`}>
                                    {summaryData.change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                    <span>{summaryData.change >= 0 ? '+' : ''}{displaySymbol} {Math.round(Math.abs(summaryData.change)).toLocaleString()}</span>
                                    {summaryData.percentChange !== undefined && (
                                        <span className="opacity-75 font-semibold text-[9px]">
                                            ({summaryData.change >= 0 ? '+' : ''}{summaryData.percentChange.toFixed(1)}%)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="px-4 py-2.5 shrink-0 flex flex-col items-center border-b border-[var(--glass-border)] relative">
                        {/* Legend & Controls Bar */}
                        <div className="flex justify-between items-center w-full px-2 mb-1 text-[9px] font-bold text-[var(--text-muted)]">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-1 rounded-full bg-indigo-400" />
                                <span>Остаток на конец каждого месяца</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {selectedMonthKey ? (
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedMonthKey(null)}
                                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                                    >
                                        Сбросить месяц
                                    </button>
                                ) : (
                                    <span className="text-[9px] font-semibold opacity-70">
                                        Тапните точку для среза
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

                        {/* Area Chart SVG (Collapsible) */}
                        {!isChartCollapsed && (
                            <div className="w-full relative animate-in fade-in zoom-in-95 duration-200">
                                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
                                    <defs>
                                        <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
                                            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>

                                    {/* Grid lines */}
                                    <line x1={paddingX} y1={chartTop} x2={svgWidth - paddingX} y2={chartTop} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                    <line x1={paddingX} y1={chartTop + chartHeight / 2} x2={svgWidth - paddingX} y2={chartTop + chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                    <line x1={paddingX} y1={chartBottom} x2={svgWidth - paddingX} y2={chartBottom} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

                                    {/* Filled Area */}
                                    {areaPath && (
                                        <path d={areaPath} fill="url(#capitalGradient)" className="transition-all duration-300" />
                                    )}

                                    {/* Neon Line */}
                                    {linePath && (
                                        <path 
                                            d={linePath} 
                                            fill="none" 
                                            stroke="#818cf8" 
                                            strokeWidth={2.5} 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            className="transition-all duration-300"
                                            style={{
                                                filter: 'drop-shadow(0 0 6px rgba(129,140,248,0.75))'
                                            }}
                                        />
                                    )}

                                    {/* Monthly interactive columns and dots */}
                                    {chartPoints.map((p, idx) => {
                                        const m = monthsRange[idx];
                                        const isSelected = selectedMonthKey === m.key;
                                        const slotX = paddingX + idx * slotWidth;

                                        return (
                                            <g 
                                                key={m.key} 
                                                className="cursor-pointer group"
                                                onClick={() => {
                                                    setSelectedMonthKey(prev => prev === m.key ? null : m.key);
                                                    if (navigator.vibrate) navigator.vibrate(10);
                                                }}
                                            >
                                                {/* Backdrop touch target */}
                                                <rect 
                                                    x={slotX} 
                                                    y={chartTop} 
                                                    width={slotWidth} 
                                                    height={chartBottom - chartTop + 24} 
                                                    rx={6} 
                                                    fill={isSelected ? "rgba(255,255,255,0.1)" : "transparent"}
                                                    className="group-hover:fill-white/5 transition-colors"
                                                />

                                                {/* Vertical dashed guide for selected month */}
                                                {isSelected && (
                                                    <line 
                                                        x1={p.x} 
                                                        y1={chartTop} 
                                                        x2={p.x} 
                                                        y2={chartBottom} 
                                                        stroke="#818cf8" 
                                                        strokeWidth={1} 
                                                        strokeDasharray="2 2" 
                                                    />
                                                )}

                                                {/* Point Dot */}
                                                <circle 
                                                    cx={p.x} 
                                                    cy={p.y} 
                                                    r={isSelected ? 5 : 3} 
                                                    fill={isSelected ? "#ffffff" : "#818cf8"} 
                                                    stroke={isSelected ? "#818cf8" : "#ffffff"} 
                                                    strokeWidth={2} 
                                                    className="transition-all duration-300"
                                                    style={{ 
                                                        filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,255,255,0.9))' : 'none'
                                                    }}
                                                />

                                                {/* Month Number in Legend (1..12) */}
                                                <text 
                                                    x={p.x} 
                                                    y={145} 
                                                    textAnchor="middle" 
                                                    fontSize={10} 
                                                    fontWeight={isSelected || m.isCurrent ? "900" : "600"} 
                                                    fill={isSelected ? "var(--text-main)" : (m.isCurrent ? "var(--primary-color)" : "var(--text-muted)")}
                                                    className="transition-colors"
                                                >
                                                    {m.monthNumber}
                                                </text>

                                                {/* Current Month Indicator Dot */}
                                                {m.isCurrent && (
                                                    <circle 
                                                        cx={p.x} 
                                                        cy={155} 
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

                    {/* Accounts Selector Header */}
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
                                {selectedMonthKey ? (monthsRange.find(m => m.key === selectedMonthKey)?.shortWithYear || "На конец месяца") : "На сегодня"}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] bg-[var(--glass-item-bg)] px-2.5 py-1 rounded-xl border border-[var(--glass-border)]">
                                <Layers size={11} className="text-indigo-400" />
                                <span>{selectedAccountIds.size} из {accounts.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Accounts List */}
                    <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-2">
                        {accountList.length === 0 && !isLoading ? (
                            <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-xs uppercase font-bold tracking-widest">
                                Нет счетов
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-[var(--glass-border)]/50">
                                {accountList.map(item => {
                                    const isSelected = selectedAccountIds.has(item.id);
                                    const isExpanded = expandedAccountId === item.id;
                                    const Icon = item.icon;

                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`flex flex-col py-3.5 transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-35 grayscale'}`}
                                        >
                                            {/* Main Row */}
                                            <div className="flex items-center gap-3.5">
                                                {/* Left Icon (Squircle) - Toggles Selection / Filter */}
                                                <div 
                                                    onClick={(e) => toggleAccountSelection(item.id, e)}
                                                    className="relative cursor-pointer group shrink-0"
                                                    title={isSelected ? "Отключить" : "Включить"}
                                                >
                                                    <div 
                                                        className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-sm group-hover:scale-105 active:scale-95"
                                                        style={{ 
                                                            backgroundColor: `${item.color}20`,
                                                            border: `1.5px solid ${isSelected ? item.color : 'rgba(255,255,255,0.1)'}`
                                                        }}
                                                    >
                                                        <Icon size={18} style={{ color: item.color }} />
                                                    </div>

                                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                                        isSelected 
                                                            ? 'bg-emerald-500 border-black text-black' 
                                                            : 'bg-zinc-800 border-zinc-600 text-transparent'
                                                    }`}>
                                                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
                                                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Middle & Right Content: Click to Expand / Collapse */}
                                                <div 
                                                    onClick={() => toggleExpandAccount(item.id)}
                                                    className="flex-1 min-w-0 flex items-center justify-between cursor-pointer group select-none"
                                                >
                                                    <div className="flex flex-col min-w-0 pr-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-bold text-[var(--text-main)] truncate group-hover:text-indigo-400 transition-colors">
                                                                {item.name}
                                                            </span>
                                                            <ChevronRight 
                                                                size={13} 
                                                                className={`text-[var(--text-muted)] transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-90 text-[var(--primary-color)]' : 'group-hover:translate-x-0.5'}`} 
                                                            />
                                                        </div>

                                                        {/* Progress bar of asset share in total capital */}
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="w-20 h-1.5 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)]/50 overflow-hidden shrink-0">
                                                                <div 
                                                                    className="h-full rounded-full transition-all duration-500" 
                                                                    style={{ 
                                                                        width: `${Math.min(100, Math.max(0, item.percent))}%`,
                                                                        backgroundColor: item.color 
                                                                    }} 
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                                                                {item.percent.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Balance Amounts */}
                                                    <div className="flex flex-col items-end shrink-0 pl-2">
                                                        <span className="text-xs font-black text-[var(--text-main)] truncate">
                                                            {displaySymbol} {Math.round(item.displayAmount).toLocaleString()}
                                                        </span>
                                                        {item.currency && item.currency !== baseCurrency && (
                                                            <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                                                                {Math.round(item.nativeAmount).toLocaleString()} {item.currency}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Monthly Breakdown (One line per month) */}
                                            {isExpanded && (
                                                <div className="mt-2.5 ml-13 pl-3 border-l-2 border-[var(--glass-border)] flex flex-col gap-1.5 py-1 animate-in fade-in duration-200">
                                                    <div className="flex items-center justify-between px-2 pb-1 text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] opacity-80">
                                                        <span>Месяц</span>
                                                        <div className="flex items-center gap-5">
                                                            <span>Динамика</span>
                                                            <span>Остаток</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-1 max-h-56 overflow-y-auto hide-scrollbar pr-1">
                                                        {item.monthlyHistory.map(mHist => {
                                                            const isMonthSelected = selectedMonthKey === mHist.monthKey;
                                                            return (
                                                                <div 
                                                                    key={mHist.monthKey}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedMonthKey(prev => prev === mHist.monthKey ? null : mHist.monthKey);
                                                                    }}
                                                                    className={`flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-xl transition-all cursor-pointer select-none group ${
                                                                        isMonthSelected 
                                                                            ? 'bg-indigo-500/25 border border-indigo-500/40 text-[var(--text-main)] shadow-sm' 
                                                                            : 'bg-[var(--glass-item-bg)]/50 hover:bg-[var(--glass-item-active)] border border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                                                    }`}
                                                                >
                                                                    {/* Left: Date / Month name (clean & short) */}
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                                            isMonthSelected 
                                                                                ? 'bg-indigo-400' 
                                                                                : mHist.isCurrent 
                                                                                    ? 'bg-[var(--primary-color)]' 
                                                                                    : 'bg-zinc-600 group-hover:bg-zinc-400'
                                                                        }`} />
                                                                        <span className={`font-bold tracking-tight ${isMonthSelected ? 'text-indigo-300' : mHist.isCurrent ? 'text-[var(--text-main)]' : ''}`}>
                                                                            {mHist.shortWithYear}
                                                                        </span>
                                                                        {mHist.isCurrent && (
                                                                            <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-[var(--primary-color)]/20 text-[var(--primary-color)] tracking-wider">
                                                                                Тек
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Right: Amounts (Delta and Balance) */}
                                                                    <div className="flex items-center gap-3 shrink-0">
                                                                        {/* Month-over-month delta badge */}
                                                                        {mHist.hasDelta ? (
                                                                            <span className={`text-[10px] font-bold ${
                                                                                mHist.deltaBase > 0 
                                                                                    ? 'text-emerald-400' 
                                                                                    : mHist.deltaBase < 0 
                                                                                        ? 'text-rose-400' 
                                                                                        : 'text-[var(--text-muted)] opacity-60'
                                                                            }`}>
                                                                                {mHist.deltaBase > 0 ? '+' : mHist.deltaBase < 0 ? '-' : ''}{displaySymbol} {Math.round(Math.abs(mHist.displayDelta)).toLocaleString()}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] text-[var(--text-muted)] opacity-30">—</span>
                                                                        )}

                                                                        {/* Total balance on this month */}
                                                                        <div className="flex flex-col items-end min-w-[70px]">
                                                                            <span className={`font-black text-right ${isMonthSelected ? 'text-[var(--text-main)]' : 'text-[var(--text-main)]'}`}>
                                                                                {displaySymbol} {Math.round(mHist.displayBalance).toLocaleString()}
                                                                            </span>
                                                                            {item.currency && item.currency !== baseCurrency && (
                                                                                <span className="text-[8px] font-semibold text-[var(--text-muted)] text-right">
                                                                                    {Math.round(mHist.nativeBalance).toLocaleString()} {item.currency}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
