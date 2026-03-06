import React from "react";
import { X, ArrowDownLeft, ArrowUpRight, ArrowRight, Wallet, Pencil, Tag, ArrowRightLeft } from "lucide-react";
import { Transaction, Account, Category, IncomeSource } from "../types";
import { IconMap } from "../constants";

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
        new Date(b.date.replace(/-/g, '/').replace('T', ' ')).getTime() - new Date(a.date.replace(/-/g, '/').replace('T', ' ')).getTime()
    );

    const getCounterpartInfo = (tx: Transaction) => {
        let counterpartId = "";
        let isOutflow = true; // Default to minus

        if (entityType === "account") {
            if (tx.accountId === entity.id) {
                counterpartId = tx.targetId;
                isOutflow = tx.type !== "income";
            } else {
                counterpartId = tx.accountId;
                isOutflow = false;
            }
        } else if (entityType === "category" || entityType === "tag") {
            counterpartId = tx.accountId;
            isOutflow = true; // Always minus for category view
        } else if (entityType === "income") {
            counterpartId = tx.accountId;
            isOutflow = false; // Always plus for income source view
        } else if (entityType === "feed") {
            isOutflow = tx.type !== "income";
            counterpartId = tx.targetId;
        }

        let counterpartItem: Account | Category | IncomeSource | undefined;
        if (tx.type === "expense") {
            counterpartItem = (entityType === "category" || entityType === "tag") 
                ? accounts.find(a => a.id === tx.accountId)
                : categories.find(c => c.id === tx.targetId);
        } else if (tx.type === "income") {
            counterpartItem = (entityType === "income")
                ? accounts.find(a => a.id === tx.accountId)
                : incomes.find(i => i.id === tx.targetId);
        } else if (tx.type === "transfer") {
            counterpartItem = accounts.find(a => a.id === (tx.accountId === entity.id ? tx.targetId : tx.accountId));
        }

        return { item: counterpartItem, isOutflow };
    };

    const getAmountStr = (tx: any, isOutflow: boolean) => {
        const sAmt = tx.sourceAmount ?? tx.amount ?? 0;
        const sAmtUsd = tx.sourceAmountUSD ?? tx.amountUSD;
        const sCurr = tx.sourceCurrency ?? (accounts.find(a => a.id === tx.accountId)?.currency || "USD");
        
        const tAmt = tx.targetAmount ?? tx.amountLocal ?? sAmt;
        const tCurr = tx.targetCurrency ?? tx.currencyLocal ?? sCurr;

        let displayAmount = sAmt;
        let displayCurrency = sCurr;
        let displayUsd = sAmtUsd;

        if (entityType === "account") {
            displayAmount = sAmt;
            displayCurrency = sCurr;
        } else {
            displayAmount = tAmt;
            displayCurrency = tCurr;
        }

        const sign = isOutflow ? "-" : "+";
        const color = isOutflow 
            ? (tx.type === "expense" ? "text-[#D4AF37]" : "text-[var(--danger-color)]") 
            : "text-[var(--success-color)]";

        return {
            amount: `${sign}${displayAmount} ${displayCurrency}`,
            usdAmount: displayUsd ? `${sign}$${displayUsd}` : null,
            color
        };
    };

    const EntityIcon = entityType === "tag" ? Tag : (IconMap[entity.icon] || Wallet);
    const entityName = entity.name;
    const entityColor = entity.color || "var(--primary-color)";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex flex-col items-center justify-end p-4 animate-in fade-in slide-in-from-bottom-10" onClick={onClose}>
            <div className="glass-panel bg-[var(--bg-color)]/90 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-2xl shadow-[var(--shadow-color)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-[var(--glass-border)] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_15px_currentColor]" style={{ color: entityColor }}><EntityIcon size={20} /></div>
                        <div className="flex flex-col"><h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">{entityName}</h2><span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">История</span></div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--glass-item-bg)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
                    {sortedTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)] gap-2"><span className="text-sm font-semibold">Нет записей</span><span className="text-xs opacity-60">Транзакции пока отсутствуют</span></div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {sortedTransactions.map(tx => {
                                const { item, isOutflow } = getCounterpartInfo(tx);
                                const Icon = item ? (IconMap[(item as any).icon] || Wallet) : Wallet;
                                const amountInfo = getAmountStr(tx, isOutflow);
                                let displayName = item?.name || "Unknown";
                                if (entityType === "feed") {
                                    if (tx.type === "transfer") { const s = accounts.find(a => a.id === tx.accountId); const d = accounts.find(a => a.id === tx.targetId); displayName = `${s?.name || "?"} → ${d?.name || "?"}`; }
                                    else if (tx.type === "income") { const s = incomes.find(i => i.id === tx.targetId); const d = accounts.find(a => a.id === tx.accountId); displayName = `${s?.name || "?"} → ${d?.name || "?"}`; }
                                    else if (tx.type === "expense") { const s = accounts.find(a => a.id === tx.accountId); const d = categories.find(c => c.id === tx.targetId); displayName = `${s?.name || "?"} → ${d?.name || "?"}`; }
                                }
                                const displayColor = (item as any)?.color || "var(--text-muted)";

                                return (
                                    <div key={tx.id} className={`flex justify-between items-center bg-[var(--glass-item-bg)]/50 p-3 -mx-3 rounded-2xl transition-colors ${onEditTransaction ? 'cursor-pointer hover:bg-[var(--glass-item-active)] active:bg-[var(--glass-item-active)]' : 'cursor-default hover:bg-[var(--glass-item-bg)]'}`} onClick={() => onEditTransaction?.(tx)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[var(--glass-item-bg)] flex items-center justify-center relative shadow-inner shrink-0" style={{ color: displayColor }}>
                                                <Icon size={18} />
                                                {entityType === "account" && tx.type === "transfer" && (<div className="absolute -bottom-1 -right-1 rounded-full p-0.5 border-2 border-[var(--bg-color)] shadow-lg bg-[var(--primary-color)] text-white"><ArrowRightLeft size={10} strokeWidth={3} /></div>)}
                                                {entityType === "account" && tx.type === "expense" && (<div className="absolute -bottom-1 -right-1 rounded-full bg-[var(--danger-color)] text-black p-0.5 border-2 border-[var(--bg-color)] shadow-lg"><ArrowUpRight size={10} strokeWidth={3} /></div>)}
                                                {entityType === "account" && tx.type === "income" && (<div className="absolute -bottom-1 -right-1 rounded-full bg-[var(--success-color)] text-black p-0.5 border-2 border-[var(--bg-color)] shadow-lg"><ArrowDownLeft size={10} strokeWidth={3} /></div>)}
                                            </div>
                                            <div className="flex flex-col overflow-hidden max-w-[150px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-[var(--text-main)] truncate">{displayName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium">
                                                        {(() => {
                                                            const d = new Date(tx.date.replace(/-/g, '/').replace('T', ' '));
                                                            const day = String(d.getDate()).padStart(2, '0');
                                                            const month = String(d.getMonth() + 1).padStart(2, '0');
                                                            const year = d.getFullYear();
                                                            return `${day}.${month}.${year}`;
                                                        })()}
                                                    </span>
                                                    {tx.tag && <span className="text-[8px] px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-slate-400 font-bold uppercase shrink-0 tracking-widest">{tx.tag}</span>}
                                                    {tx.type === "transfer" && <span className="text-[9px] px-1.5 py-0.5 bg-[var(--primary-color)]/20 rounded text-[var(--primary-color)] font-bold uppercase shrink-0">Трансфер</span>}
                                                </div>
                                                {tx.comment && <span className="text-xs text-[var(--text-muted)] mt-1 italic truncate opacity-70">{tx.comment}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 pl-2 gap-1">
                                            <span className={`text-sm font-black ${amountInfo.color} tracking-tight`}>{amountInfo.amount}</span>
                                            {amountInfo.usdAmount && !amountInfo.amount.includes("USD") && (<span className="text-[10px] font-bold text-[var(--text-muted)] opacity-60">{amountInfo.usdAmount}</span>)}
                                            {onEditTransaction && (<span className="text-[9px] text-[var(--text-muted)] flex items-center gap-0.5 font-bold uppercase opacity-60"><Pencil size={9} /> ред.</span>)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
