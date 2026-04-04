import React, { useState } from "react";
import { X, ArrowDownLeft, ArrowUpRight, ArrowRight, Wallet, Pencil, Tag, ArrowRightLeft, AlertCircle, Check } from "lucide-react";
import { Transaction, Account, Category, IncomeSource } from "../types";
import { IconMap } from "../constants";
import { safeParseDate } from "../hooks/utils";
import { RatesService } from "../services/RatesService";

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entity: any;
    entityType: "account" | "category" | "income" | "tag" | "feed" | null;
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    incomes: IncomeSource[];
    onEditTransaction?: (tx: Transaction) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
    isOpen, onClose, entity, entityType, transactions, accounts, categories, incomes, onEditTransaction
}) => {
    const [repairingTx, setRepairingTx] = useState<{ tx: Transaction, field: "source" | "target" } | null>(null);

    if (!isOpen || !entity || !entityType) return null;

    let filteredTransactions: Transaction[] = [];
    if (entityType === "account") {
        filteredTransactions = transactions.filter(t => t.accountId === entity.id || t.targetId === entity.id);
    } else if (entityType === "category") {
        filteredTransactions = transactions.filter(t => t.targetId === entity.id);
    } else if (entityType === "income") {
        filteredTransactions = transactions.filter(t => t.accountId === entity.id || t.targetId === entity.id);
    } else if (entityType === "tag") {
        filteredTransactions = transactions.filter(t => t.tag === entity.name && t.type === "expense");
    } else if (entityType === "feed") {
        filteredTransactions = transactions;
    }

    const sortedTransactions = [...filteredTransactions].sort((a, b) =>
        safeParseDate(b.date).getTime() - safeParseDate(a.date).getTime()
    );

    const checkBroken = (tx: Transaction) => {
        const acc = accounts.find(a => a.id === tx.accountId);
        let targetExists = false;
        if (tx.type === "expense") targetExists = categories.some(c => c.id === tx.targetId);
        else if (tx.type === "income") targetExists = incomes.some(i => i.id === tx.targetId);
        else if (tx.type === "transfer") targetExists = accounts.some(a => a.id === tx.targetId);

        return {
            sourceBroken: !acc,
            targetBroken: !targetExists,
            isBroken: !acc || !targetExists
        };
    };

    const getCounterpartInfo = (tx: Transaction) => {
        let isOutflow = true;
        if (entityType === "account") {
            if (tx.accountId === entity.id) isOutflow = tx.type !== "income";
            else isOutflow = false;
        } else if (entityType === "category" || entityType === "tag") {
            isOutflow = true;
        } else if (entityType === "income") {
            isOutflow = false;
        } else if (entityType === "feed") {
            isOutflow = tx.type !== "income";
        }

        let counterpartItem: Account | Category | IncomeSource | undefined;
        const aid = String(tx.accountId || "").trim().toLowerCase();
        if (tx.type === "expense") {
            counterpartItem = (entityType === "category" || entityType === "tag") 
                ? accounts.find(a => String(a.id).trim().toLowerCase() === aid || String(a.name).trim().toLowerCase() === aid)
                : categories.find(c => c.id === tx.targetId);
        } else if (tx.type === "income") {
            counterpartItem = (entityType === "income")
                ? accounts.find(a => String(a.id).trim().toLowerCase() === aid || String(a.name).trim().toLowerCase() === aid)
                : incomes.find(i => i.id === tx.targetId);
        } else if (tx.type === "transfer") {
            const otherId = String(tx.accountId === entity.id ? tx.targetId : tx.accountId).trim().toLowerCase();
            counterpartItem = accounts.find(a => String(a.id).trim().toLowerCase() === otherId || String(a.name).trim().toLowerCase() === otherId);
        }

        return { item: counterpartItem, isOutflow };
    };

    const getAmountStr = (tx: any, isOutflow: boolean) => {
        const baseCurrency = RatesService.getBaseCurrency();
        const sAmt = tx.sourceAmount ?? tx.amount ?? 0;
        const sAmtUsd = tx.sourceAmountUSD ?? tx.amountUSD;
        // Robust account lookup
        const aid = String(tx.accountId || "").trim().toLowerCase();
        const account = accounts.find(a => String(a.id).trim().toLowerCase() === aid || String(a.name).trim().toLowerCase() === aid);
        const sCurr = tx.sourceCurrency || (account?.currency || baseCurrency);
        const tAmt = tx.targetAmount ?? tx.amountLocal ?? sAmt;
        const tCurr = tx.targetCurrency || tx.currencyLocal || (account?.currency || baseCurrency);

        const getSymbol = (code: string) => {
            const symbols: Record<string, string> = { "USD": "$", "EUR": "€", "GBP": "£", "RUB": "₽", "RSD": "din", "BRL": "R$", "ARS": "ARS" };
            return symbols[code.toUpperCase()] || code;
        };

        let displayAmount = entityType === "account" ? sAmt : tAmt;
        let displayCurrency = entityType === "account" ? sCurr : tCurr;
        const displaySymbol = getSymbol(displayCurrency);

        const baseSymbol = getSymbol(baseCurrency);

        // Calculate amount in base currency for secondary display
        let secondaryAmount = null;
        if (displayCurrency !== baseCurrency) {
            const amtInBase = (baseCurrency === 'USD' && sAmtUsd) 
                ? sAmtUsd 
                : RatesService.convert(displayAmount, displayCurrency, baseCurrency);
            secondaryAmount = Math.round(amtInBase);
        }

        const txType = tx.type?.toLowerCase();
        const color = txType === "transfer" 
            ? "text-indigo-400" 
            : (isOutflow 
                ? (txType === "expense" ? "text-[#D4AF37]" : "text-[var(--danger-color)]") 
                : "text-[var(--success-color)]");

        const sign = (txType === "transfer" && entityType === "feed") ? "" : (isOutflow ? "-" : "+");

        return {
            amount: `${sign}${displaySymbol} ${displayAmount.toLocaleString()}`,
            secondaryAmount: secondaryAmount !== null ? `${sign}${baseSymbol} ${secondaryAmount.toLocaleString()}` : null,
            color
        };
    };

    const handleTransactionClick = (tx: Transaction) => {
        const status = checkBroken(tx);
        if (status.sourceBroken) {
            setRepairingTx({ tx, field: "source" });
        } else if (status.targetBroken) {
            setRepairingTx({ tx, field: "target" });
        } else {
            onEditTransaction?.(tx);
        }
    };

    const handleRepair = (newId: string, type: "account" | "category" | "income") => {
        if (!repairingTx) return;
        const updatedTx = { ...repairingTx.tx };
        
        if (repairingTx.field === "source") {
            updatedTx.accountId = newId;
            // When fixing source (the wallet), update source currency to match the new wallet
            const acc = accounts.find(a => a.id === newId);
            if (acc) updatedTx.sourceCurrency = acc.currency;
        } else {
            updatedTx.targetId = newId;
            // Handle cross-type repair (e.g. broken transfer becoming an expense)
            if (updatedTx.type === "transfer" && type === "category") {
                updatedTx.type = "expense";
            } else if (updatedTx.type === "expense" && type === "account") {
                updatedTx.type = "transfer";
            }
            
            // If target is an account, update target currency to match it
            if (type === "account") {
                const acc = accounts.find(a => a.id === newId);
                if (acc) updatedTx.targetCurrency = acc.currency;
            }
        }
        
        onEditTransaction?.(updatedTx); // Pass to numpad for confirmation
        setRepairingTx(null);
    };

    const EntityIcon = entityType === "tag" ? Tag : (IconMap[entity.icon] || Wallet);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex flex-col items-center justify-end p-4 animate-in fade-in slide-in-from-bottom-10" onClick={onClose}>
            <div className="glass-panel bg-[var(--bg-color)]/90 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-2xl shadow-[var(--shadow-color)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-[var(--glass-border)] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_currentColor]" style={{ color: entity.color || "var(--primary-color)" }}><EntityIcon size={20} /></div>
                        <div className="flex flex-col"><h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">{entity.name}</h2><span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">История</span></div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--glass-item-bg)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
                    {sortedTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)] gap-2"><span className="text-sm font-semibold">Нет записей</span><span className="text-xs opacity-60">Транзакции пока отсутствуют</span></div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {sortedTransactions.map(tx => {
                                const { item, isOutflow } = getCounterpartInfo(tx);
                                const status = checkBroken(tx);
                                const Icon = item ? (IconMap[(item as any).icon] || Wallet) : (status.isBroken ? AlertCircle : Wallet);
                                const amountInfo = getAmountStr(tx, isOutflow);
                                
                                let displayName = item?.name || (status.isBroken ? "Требует внимания" : "Unknown");
                                if (entityType === "feed") {
                                    const s = accounts.find(a => a.id === tx.accountId);
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
                                }

                                return (
                                    <div key={tx.id} className={`flex justify-between items-center bg-[var(--glass-item-bg)]/50 p-3 -mx-3 rounded-2xl transition-colors cursor-pointer hover:bg-[var(--glass-item-active)]`} onClick={() => handleTransactionClick(tx)}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative shadow-inner shrink-0 ${status.isBroken ? 'bg-rose-500/20 text-rose-500' : 'bg-[var(--glass-item-bg)] text-[var(--text-muted)]'}`} style={{ color: !status.isBroken ? (item as any)?.color : undefined }}>
                                                <Icon size={18} />
                                                {status.isBroken && <div className="absolute -top-1 -right-1 bg-rose-500 w-3 h-3 rounded-full border-2 border-[var(--bg-color)]" />}
                                            </div>
                                            <div className="flex flex-col overflow-hidden flex-1 max-w-[180px]">
                                                <span className={`text-sm font-semibold truncate ${status.isBroken ? 'text-rose-400' : 'text-[var(--text-main)]'}`}>{displayName}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium">
                                                        {(() => {
                                                            const d = safeParseDate(tx.date);
                                                            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
                                                        })()}
                                                    </span>
                                                    {tx.tag && <span className="text-[8px] px-2 py-0.5 bg-white/5 border border-white/5 rounded-lg text-slate-400 font-bold uppercase shrink-0 tracking-widest">{tx.tag}</span>}
                                                </div>
                                                {tx.comment && <span className="text-[10px] text-[var(--text-muted)] italic truncate mt-0.5 opacity-80">{tx.comment}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 pl-2">
                                            <span className={`text-sm font-black ${amountInfo.color} tracking-tight`}>{amountInfo.amount}</span>
                                            {amountInfo.secondaryAmount && <span className="text-[10px] text-[var(--text-muted)] font-bold opacity-60">≈ {amountInfo.secondaryAmount}</span>}
                                            {status.isBroken && <span className="text-[9px] text-rose-500 font-bold uppercase mt-1 animate-pulse">Исправить</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Repair UI Overlay */}
                {repairingTx && (
                    <div className="absolute inset-0 bg-[var(--bg-color)] z-[50] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                        <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center shrink-0">
                            <div className="flex flex-col">
                                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Восстановление данных</h3>
                                <span className="text-[10px] text-rose-500 uppercase font-bold tracking-widest">Выберите новый {repairingTx.field === "source" ? "кошелек" : (repairingTx.tx.type === "expense" ? "категорию" : "источник")}</span>
                            </div>
                            <button onClick={() => setRepairingTx(null)} className="w-8 h-8 rounded-lg bg-[var(--glass-item-bg)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                            {/* Option 1: Accounts (for Transfers or Incomes) */}
                            {(repairingTx.field === "source" || repairingTx.tx.type === "transfer" || repairingTx.tx.type === "income") && (
                                <>
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-1 mt-2">Кошельки</h4>
                                    {accounts.map(acc => (
                                        <button key={acc.id} onClick={() => handleRepair(acc.id, "account")} className="flex items-center gap-4 p-4 bg-[var(--glass-item-bg)]/50 rounded-2xl hover:bg-[var(--glass-item-active)] transition-all text-left">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${acc.color}20`, color: acc.color }}>
                                                {React.createElement(IconMap[acc.icon] || Wallet, { size: 20 })}
                                            </div>
                                            <div className="flex flex-col"><span className="text-sm font-bold text-[var(--text-main)]">{acc.name}</span><span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{Math.round(acc.balance).toLocaleString()} {acc.currency}</span></div>
                                        </button>
                                    ))}
                                </>
                            )}

                            {/* Option 2: Categories (for Expenses or broken Transfers that should be Expenses) */}
                            {(repairingTx.field === "target" && (repairingTx.tx.type === "expense" || repairingTx.tx.type === "transfer")) && (
                                <>
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-1 mt-4">Категории</h4>
                                    {categories.map(cat => (
                                        <button key={cat.id} onClick={() => handleRepair(cat.id, "category")} className="flex items-center gap-4 p-4 bg-[var(--glass-item-bg)]/50 rounded-2xl hover:bg-[var(--glass-item-active)] transition-all text-left">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                                                {React.createElement(IconMap[cat.icon] || Wallet, { size: 20 })}
                                            </div>
                                            <span className="text-sm font-bold text-[var(--text-main)]">{cat.name}</span>
                                        </button>
                                    ))}
                                </>
                            )}

                            {/* Option 3: Income Sources */}
                            {repairingTx.field === "target" && repairingTx.tx.type === "income" && (
                                <>
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-1 mt-2">Источники</h4>
                                    {incomes.map(inc => (
                                        <button key={inc.id} onClick={() => handleRepair(inc.id, "income")} className="flex items-center gap-4 p-4 bg-[var(--glass-item-bg)]/50 rounded-2xl hover:bg-[var(--glass-item-active)] transition-all text-left">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${inc.color}20`, color: inc.color }}>
                                                {React.createElement(IconMap[inc.icon] || Wallet, { size: 20 })}
                                            </div>
                                            <span className="text-sm font-bold text-[var(--text-main)]">{inc.name}</span>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
