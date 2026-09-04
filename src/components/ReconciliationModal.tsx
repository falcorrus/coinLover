import React, { useState, useMemo } from "react";
import { X, Check, RefreshCcw, AlertTriangle, CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { Account, Transaction } from "../types";
import { IconMap } from "../constants";
import { ReconciliationService } from "../services/reconciliationService";
import { useLanguage } from "../contexts/LanguageContext";

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  transactions: Transaction[];
  checkpoints?: Record<string, number>;
  checkpointDate?: string;
  onApply: (updatedAccounts: Account[]) => Promise<boolean | void>;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  accounts,
  transactions,
  checkpoints,
  checkpointDate,
  onApply,
  onRefresh,
  isLoading = false,
}) => {
  const { t } = useLanguage();
  const [isApplying, setIsApplying] = useState(false);

  const report = useMemo(() => {
    return ReconciliationService.compute(accounts, transactions, checkpoints, checkpointDate, {
      useStartOfPrevMonth: true,
    });
  }, [accounts, transactions, checkpoints, checkpointDate]);

  // Accounts that actually have a discrepancy
  const discrepancyAccounts = useMemo(() => {
    return report.results.filter((r) => r.hasDiscrepancy);
  }, [report]);

  // Local selection per discrepancy account: 'current' (default) vs 'reconciled'
  const [selectedChoices, setSelectedChoices] = useState<Record<string, "current" | "reconciled">>({});

  // When discrepancyAccounts change, ensure each has a selection defaulting to 'current'
  const currentSelections = useMemo(() => {
    const sel: Record<string, "current" | "reconciled"> = {};
    discrepancyAccounts.forEach((d) => {
      sel[d.account.id] = selectedChoices[d.account.id] || "current";
    });
    return sel;
  }, [discrepancyAccounts, selectedChoices]);

  const handleToggleChoice = (accountId: string, choice: "current" | "reconciled") => {
    setSelectedChoices((prev) => ({
      ...prev,
      [accountId]: choice,
    }));
  };

  // Count how many accounts are selected to be updated with reconciled balance
  const reconciledCount = useMemo(() => {
    return discrepancyAccounts.filter((d) => currentSelections[d.account.id] === "reconciled").length;
  }, [discrepancyAccounts, currentSelections]);

  // Apply chosen selections across all accounts at once
  const handleApplyAll = async () => {
    setIsApplying(true);
    try {
      const updatedAccounts = accounts.map((acc) => {
        const item = discrepancyAccounts.find((d) => d.account.id === acc.id);
        if (item && currentSelections[acc.id] === "reconciled") {
          return { ...acc, balance: item.reconciledBalance };
        }
        return acc;
      });

      await onApply(updatedAccounts);
      onClose();
    } catch (e) {
      console.error("Failed to apply reconciliation selections:", e);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[550] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-[28px] border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0 bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-color)]/15 text-[var(--primary-color)] flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-[var(--text-main)]">
                {t("Reconciliation") || "Сверка балансов"}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {report.checkpointDate
                  ? `Сверка операций с 1-го числа пред. месяца (${report.checkpointDate})`
                  : "Сверка остатков с 1-го числа предыдущего месяца"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading || isApplying}
                title="Обновить данные"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 active:scale-95 transition-all"
              >
                <RefreshCcw size={16} className={isLoading || isApplying ? "animate-spin text-amber-400" : ""} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 active:scale-95 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status / Notice */}
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02] shrink-0 text-xs">
          <div className="flex items-center gap-2">
            {discrepancyAccounts.length > 0 ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AlertTriangle size={13} />
                Расхождений: {discrepancyAccounts.length}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={13} />
                Все балансы сходятся
              </span>
            )}
          </div>

          <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
            Нажмите правильный баланс:
          </span>
        </div>

        {/* Discrepancy Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hide-scrollbar">
          {discrepancyAccounts.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-sm font-bold text-[var(--text-main)]">
                Все балансы сходятся!
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-xs">
                По счетам нет расхождений с операциями. Всё в полном порядке.
              </p>
            </div>
          ) : (
            discrepancyAccounts.map((rec) => {
              const IconComp = IconMap[rec.account.icon] || Wallet;

              return (
                <div
                  key={rec.account.id}
                  className="p-4 rounded-2xl border border-white/10 bg-[#161b22] flex flex-col gap-3 shadow-md"
                >
                  {/* Account Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                        style={{ backgroundColor: `${rec.account.color}25`, color: rec.account.color }}
                      >
                        <IconComp size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--text-main)] truncate">
                            {rec.account.name}
                          </span>
                          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-white/10">
                            {rec.account.currency}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Дельта: <strong className={rec.difference > 0 ? "text-emerald-400" : "text-rose-400"}>
                            {rec.difference > 0 ? `+${rec.difference.toLocaleString()}` : rec.difference.toLocaleString()} {rec.account.currency}
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Choice: Click the correct balance */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {/* Option 1: Current Balance ("как сейчас") */}
                    {(() => {
                      const isSelected = currentSelections[rec.account.id] === "current";
                      return (
                        <button
                          type="button"
                          disabled={isApplying}
                          onClick={() => handleToggleChoice(rec.account.id, "current")}
                          className={`p-3 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                            isSelected
                              ? "border-emerald-500/70 bg-emerald-500/15 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-950/20"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold flex items-center justify-between text-emerald-400">
                            <span>Текущий</span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              isSelected ? "bg-emerald-500 text-white" : "border border-white/20 bg-black/20"
                            }`}>
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </span>
                          <span className="text-base font-black text-[var(--text-main)] mt-1">
                            {rec.currentBalance.toLocaleString()} {rec.account.currency}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] mt-1">
                            Оставить как сейчас
                          </span>
                        </button>
                      );
                    })()}

                    {/* Option 2: Calculated from operations ("По истории") */}
                    {(() => {
                      const isSelected = currentSelections[rec.account.id] === "reconciled";
                      return (
                        <button
                          type="button"
                          disabled={isApplying}
                          onClick={() => handleToggleChoice(rec.account.id, "reconciled")}
                          className={`p-3 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                            isSelected
                              ? "border-[var(--primary-color)] bg-[var(--primary-color)]/20 ring-1 ring-[var(--primary-color)]/50 shadow-md shadow-purple-950/30"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold flex items-center justify-between text-[var(--primary-color)]">
                            <span>По истории</span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              isSelected ? "bg-[var(--primary-color)] text-white" : "border border-white/20 bg-black/20"
                            }`}>
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </span>
                          <span className="text-base font-black text-[var(--primary-color)] mt-1">
                            {rec.reconciledBalance.toLocaleString()} {rec.account.currency}
                          </span>
                          <span className="text-[10px] text-[var(--primary-color)]/80 mt-1">
                            С учётом операций до сейчас
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-white/[0.03] shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-white/10 border border-white/10 font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/15 active:scale-98 transition-all text-xs uppercase tracking-wider"
          >
            {discrepancyAccounts.length === 0 ? "Закрыть" : "Отмена"}
          </button>

          {discrepancyAccounts.length > 0 && (
            <button
              type="button"
              onClick={handleApplyAll}
              disabled={isApplying}
              className="flex-1 h-12 rounded-xl bg-[var(--primary-color)] font-bold text-white shadow-lg shadow-[var(--primary-color)]/25 hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              {isApplying ? (
                <>
                  <RefreshCcw size={14} className="animate-spin" />
                  Применение...
                </>
              ) : reconciledCount > 0 ? (
                `Применить (${reconciledCount} измен.)`
              ) : (
                "Оставить всё как есть"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


