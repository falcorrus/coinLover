import React from "react";
import { X, ArrowDownLeft, ArrowUpRight, ArrowRight, Wallet, Pencil, Tag } from "lucide-react";
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
        filteredTransactions = transactions.filter(t => t.accountId === entity.id);
    } else if (entityType === "tag") {
        filteredTransactions = transactions.filter(t => t.tag === entity.name && t.type === "expense");
    } else if (entityType === "feed") {
        filteredTransactions = transactions;
    }

    // Sort descending by date (newest first)
    const sortedTransactions = [...filteredTransactions].sort((a, b) =>
        new Date(b.date.replace(/-/g, '/').replace('T', ' ')).getTime() - new Date(a.date.replace(/-/g, '/').replace('T', ' ')).getTime()
    );

    // Find counterpart for a transaction relative to the currently viewed entity
    const getCounterpartInfo = (tx: Transaction) => {
        let counterpartId = "";
        let isOutflow = true; // relative to the currently viewed entity

        if (entityType === "account") {
            if (tx.accountId === entity.id) {
                counterpartId = tx.targetId;
                // For income, if accountId is our wallet, it's an INFLOW. 
                // For expense/transfer, if accountId is our wallet, it's an OUTFLOW.
                isOutflow = tx.type !== "income";
            } else {
                // This only happens for transfers where we are the targetId
                counterpartId = tx.accountId;
                isOutflow = false;
            }
        } else if (entityType === "category" || entityType === "tag") {
            // Category/tag is destination for expenses, but for history view we want to show the source account
            counterpartId = tx.accountId;
            isOutflow = false; // it came *into* this category/tag

        } else if (entityType === "income") {
            counterpartId = tx.targetId;
            isOutflow = true; // went *out* of income into account
        } else if (entityType === "feed") {
            if (tx.type === "expense") {
                counterpartId = tx.targetId;
                isOutflow = true;
            } else if (tx.type === "income") {
                counterpartId = tx.accountId;
                isOutflow = false;
            } else {
                // Transfer
                counterpartId = tx.targetId;
                isOutflow = true; // Relative to source account
            }
        }

        let counterpartItem: Account | Category | IncomeSource | undefined;

        if (tx.type === "expense") {
            if (entityType === "category" || entityType === "tag") {
                counterpartItem = accounts.find(a => a.id === tx.accountId);
            } else {
                counterpartItem = categories.find(c => c.id === tx.targetId);
            }
        } else if (tx.type === "income") {
            if (entityType === "income") {
                // We are the income source, counterpart is the destination wallet
                counterpartItem = accounts.find(a => a.id === tx.accountId);
            } else {
                // We are the wallet (or other), counterpart is the income source
                counterpartItem = incomes.find(i => i.id === tx.targetId);
            }
        } else if (tx.type === "transfer") {
            counterpartItem = accounts.find(a => a.id === counterpartId);
        }

        if (entityType === "feed") {
            if (tx.type === "expense") {
                counterpartItem = categories.find(c => c.id === tx.targetId);
            } else if (tx.type === "income") {
                counterpartItem = incomes.find(i => i.id === tx.targetId);
            } else if (tx.type === "transfer") {
                counterpartItem = accounts.find(a => a.id === tx.targetId);
            }
        }

        return { item: counterpartItem, isOutflow };
    };

    const getAmountStr = (tx: Transaction, isOutflow: boolean) => {
        // If it's a transfer between accounts, show the correct amount format
        let amount = tx.amount;
        let usdAmount = tx.amountUSD;

        if (!isOutflow && tx.type !== "expense" && tx.targetAmount !== undefined && tx.targetAmount > 0) {
            amount = tx.targetAmount;
            usdAmount = tx.targetAmountUSD;
        }

        // Determine the color / sign based on the perspective view:
        if (entityType === "account") {
            const acc = entity as Account;
            return {
                amount: `${isOutflow ? "-" : "+"}${amount} ${acc.currency}`,
                usdAmount: usdAmount ? `${isOutflow ? "-" : "+"}$${usdAmount}` : null,
                color: isOutflow ? "text-rose-500" : "text-emerald-500"
            };
        } else if (entityType === "category" || entityType === "tag") {
            // Category shows negative total logically, but we can just show the expense amount
            // Find the source account to get the currency
            const sourceAcc = accounts.find(a => a.id === tx.accountId);
            const currency = sourceAcc?.currency || "USD";
            return {
                amount: `-${amount} ${currency}`,
                usdAmount: usdAmount ? `-$${usdAmount}` : null,
                color: "text-[#D4AF37]"
            };
        } else if (entityType === "feed") {
            if (tx.type === "expense") {
                const sourceAcc = accounts.find(a => a.id === tx.accountId);
                const currency = sourceAcc?.currency || "USD";
                return {
                    amount: `-${amount} ${currency}`,
                    usdAmount: usdAmount ? `-$${usdAmount}` : null,
                    color: "text-[#D4AF37]"
                };
            } else if (tx.type === "income") {
                const destAcc = accounts.find(a => a.id === tx.accountId); // Income goes into accountId wallet
                const currency = destAcc?.currency || "USD";
                return {
                    amount: `+${amount} ${currency}`,
                    usdAmount: usdAmount ? `+$${usdAmount}` : null,
                    color: "text-emerald-500"
                };
            } else {
                // Transfer: Neutral or Blue
                const sourceAcc = accounts.find(a => a.id === tx.accountId); // Transfers are from source account
                const currency = sourceAcc?.currency || "USD";
                return {
                    amount: `-${amount} ${currency}`,
                    usdAmount: usdAmount ? `-$${usdAmount}` : null,
                    color: "text-slate-400"
                };
            }
        } else {
            // Viewing an Income source
            const destAcc = accounts.find(a => a.id === tx.accountId);
            const currency = destAcc?.currency || "USD";
            return {
                amount: `+${amount} ${currency}`,
                usdAmount: usdAmount ? `+$${usdAmount}` : null,
                color: "text-emerald-500"
            };
        }
    };

    const EntityIcon = entityType === "tag" ? Tag : (IconMap[entity.icon] || Wallet);
    const entityName = entity.name;
    const entityColor = entity.color || "#6d5dfc";

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex flex-col items-center justify-end p-4 animate-in fade-in slide-in-from-bottom-10" onClick={onClose}>
            <div className="glass-panel bg-[#0a0a0a]/90 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_15px_currentColor]" style={{ color: entityColor }}>
                            <EntityIcon size={20} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-sm font-black text-white uppercase tracking-wider">{entityName}</h2>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">История</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
                    {sortedTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                            <span className="text-sm font-semibold">Нет записей</span>
                            <span className="text-xs">Транзакции пока отсутствуют</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {sortedTransactions.map(tx => {
                                const { item, isOutflow } = getCounterpartInfo(tx);
                                const Icon = item ? (IconMap[(item as any).icon] || Wallet) : Wallet;
                                const amountInfo = getAmountStr(tx, isOutflow);
                                let displayName = item?.name || "Unknown";
                                if (entityType === "feed") {
                                    if (tx.type === "transfer") {
                                        const sourceAcc = accounts.find(a => a.id === tx.accountId);
                                        const destAcc = accounts.find(a => a.id === tx.targetId);
                                        displayName = `${sourceAcc?.name || "?"} → ${destAcc?.name || "?"}`;
                                    } else if (tx.type === "income") {
                                        const sourceInc = incomes.find(i => i.id === tx.targetId);
                                        const destAcc = accounts.find(a => a.id === tx.accountId);
                                        displayName = `${sourceInc?.name || "?"} → ${destAcc?.name || "?"}`;
                                    } else if (tx.type === "expense") {
                                        const sourceAcc = accounts.find(a => a.id === tx.accountId);
                                        const destCat = categories.find(c => c.id === tx.targetId);
                                        displayName = `${sourceAcc?.name || "?"} → ${destCat?.name || "?"}`;
                                    }
                                }
                                const displayColor = (item as any)?.color || "#6b7280";

                                return (
                                    <div
                                        key={tx.id}
                                        className={`flex justify-between items-center bg-white/[0.02] p-3 -mx-3 rounded-2xl transition-colors ${onEditTransaction ? 'cursor-pointer hover:bg-white/[0.07] active:bg-white/[0.1]' : 'cursor-default hover:bg-white/[0.04]'}`}
                                        onClick={() => onEditTransaction?.(tx)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Counterpart Icon */}
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center relative shadow-inner shrink-0" style={{ color: displayColor }}>
                                                <Icon size={18} />

                                                {/* Tiny direction indicator for Account view transfers */}
                                                {entityType === "account" && tx.type === "transfer" && (
                                                    <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 border-2 border-[#050505] shadow-lg ${isOutflow ? "bg-rose-500 text-black" : "bg-emerald-500 text-black"}`}>
                                                        {isOutflow ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowDownLeft size={10} strokeWidth={3} />}
                                                    </div>
                                                )}
                                                {entityType === "account" && tx.type === "expense" && (
                                                    <div className="absolute -bottom-1 -right-1 rounded-full bg-rose-500 text-black p-0.5 border-2 border-[#050505] shadow-lg">
                                                        <ArrowUpRight size={10} strokeWidth={3} />
                                                    </div>
                                                )}
                                                {entityType === "account" && tx.type === "income" && (
                                                    <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 text-black p-0.5 border-2 border-[#050505] shadow-lg">
                                                        <ArrowDownLeft size={10} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col overflow-hidden max-w-[150px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-white truncate">{displayName}</span>
                                                    {tx.tag && <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400 font-bold uppercase shrink-0">{tx.tag}</span>}
                                                    {tx.type === "transfer" && <span className="text-[9px] px-1.5 py-0.5 bg-[#6d5dfc]/20 rounded text-[#6d5dfc] font-bold uppercase shrink-0">Трансфер</span>}
                                                </div>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">{new Date(tx.date.replace(/-/g, '/').replace('T', ' ')).toLocaleDateString()}</span>
                                                {tx.comment && <span className="text-xs text-slate-400 mt-1 italic truncate">{tx.comment}</span>}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end shrink-0 pl-2 gap-1">
                                            <span className={`text-sm font-black ${amountInfo.color} tracking-tight`}>
                                                {amountInfo.amount}
                                            </span>
                                            {amountInfo.usdAmount && !amountInfo.amount.includes("USD") && (
                                                <span className="text-[10px] font-bold text-slate-500 opacity-60">
                                                    {amountInfo.usdAmount}
                                                </span>
                                            )}
                                            {onEditTransaction && (
                                                <span className="text-[9px] text-slate-600 flex items-center gap-0.5 font-bold uppercase">
                                                    <Pencil size={9} /> ред.
                                                </span>
                                            )}
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
