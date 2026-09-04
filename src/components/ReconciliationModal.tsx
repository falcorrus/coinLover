import React, { useState, useMemo } from "react";
import { X, Check, RefreshCcw, AlertTriangle, CheckCircle2, ShieldCheck, ArrowRight, Wallet } from "lucide-react";
import { Account, Transaction } from "../types";
import { IconMap } from "../constants";
import { ReconciliationService, ReconciledAccountResult } from "../services/reconciliationService";
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
  const [selectedAccountIds, setSelectedAccountIds] = useState<Record<string, boolean>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [filterMode, setFilterMode] = useState<"discrepancies" | "all">("discrepancies");

  const report = useMemo(() => {
    return ReconciliationService.compute(accounts, transactions, checkpoints, checkpointDate);
  }, [accounts, transactions, checkpoints, checkpointDate]);

  // Pre-select accounts that have discrepancies on open or report change
  React.useEffect(() => {
    if (isOpen) {
      const initialSelected: Record<string, boolean> = {};
      report.results.forEach((r) => {
        if (r.hasDiscrepancy) {
          initialSelected[r.account.id] = true;
        }
      });
      setSelectedAccountIds(initialSelected);
      if (report.totalDiscrepanciesCount === 0) {
        setFilterMode("all");
      } else {
        setFilterMode("discrepancies");
      }
    }
  }, [isOpen, report]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedAccountIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAllDiscrepancies = () => {
    const updated: Record<string, boolean> = {};
    report.results.forEach((r) => {
      if (r.hasDiscrepancy) updated[r.account.id] = true;
    });
    setSelectedAccountIds(updated);
  };

  const handleSelectAll = () => {
    const updated: Record<string, boolean> = {};
    report.results.forEach((r) => {
      updated[r.account.id] = true;
    });
    setSelectedAccountIds(updated);
  };

  const handleDeselectAll = () => {
    setSelectedAccountIds({});
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const updatedAccounts = accounts.map((acc) => {
        if (selectedAccountIds[acc.id]) {
          const rec = report.results.find((r) => r.account.id === acc.id);
          if (rec) {
            return { ...acc, balance: rec.reconciledBalance };
          }
        }
        return acc;
      });

      await onApply(updatedAccounts);
      onClose();
    } catch (e) {
      console.error("Failed to apply reconciliation:", e);
    } finally {
      setIsApplying(false);
    }
  };

  const displayedResults = filterMode === "discrepancies"
    ? report.results.filter((r) => r.hasDiscrepancy)
    : report.results;

  const selectedCount = Object.values(selectedAccountIds).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[550] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="glass-panel w-full max-w-xl max-h-[90vh] flex flex-col rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-color)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--glass-border)] shrink-0 bg-[var(--glass-item-bg)]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-[var(--text-main)]">
                {t("Reconciliation") || "Сверка балансов"}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {checkpointDate
                  ? `Сверка по операциям (контрольная точка ${checkpointDate})`
                  : "Сквозной пересчет остатков по операциям"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="Обновить данные"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-item-bg)] active:scale-95 transition-all"
              >
                <RefreshCcw size={16} className={isLoading ? "animate-spin text-amber-400" : ""} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-item-bg)] active:scale-95 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className="px-5 py-3.5 border-b border-[var(--glass-border)]/50 flex flex-wrap items-center justify-between gap-3 bg-[var(--glass-bg)] shrink-0">
          <div className="flex items-center gap-2">
            {report.hasAnyDiscrepancies ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertTriangle size={13} />
                Расхождений: {report.totalDiscrepanciesCount}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 size={13} />
                Все балансы сходятся
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterMode("discrepancies")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${filterMode === "discrepancies" ? "bg-[var(--primary-color)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--glass-item-bg)]"}`}
            >
              Только расхождения ({report.totalDiscrepanciesCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${filterMode === "all" ? "bg-[var(--primary-color)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--glass-item-bg)]"}`}
            >
              Все счета ({report.results.length})
            </button>
          </div>
        </div>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 hide-scrollbar">
          {displayedResults.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-sm font-bold text-[var(--text-main)]">
                Расхождений не обнаружено!
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-xs">
                Все остатки на счетах полностью совпадают со сквозной историей транзакций.
              </p>
            </div>
          ) : (
            displayedResults.map((rec) => {
              const isSelected = !!selectedAccountIds[rec.account.id];
              const IconComp = IconMap[rec.account.icon] || Wallet;

              return (
                <div
                  key={rec.account.id}
                  onClick={() => toggleSelect(rec.account.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 select-none ${isSelected ? "bg-[var(--primary-color)]/10 border-[var(--primary-color)]/40 shadow-sm" : "bg-[var(--glass-item-bg)] border-[var(--glass-border)] opacity-85 hover:opacity-100"}`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 transition-all ${isSelected ? "bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-sm" : "border-[var(--glass-border)] bg-black/10"}`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>

                  {/* Account Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                    style={{ backgroundColor: `${rec.account.color}20`, color: rec.account.color }}
                  >
                    <IconComp size={18} />
                  </div>

                  {/* Account Name & Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-main)] truncate">
                        {rec.account.name}
                      </span>
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-white/5">
                        {rec.account.currency}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                      <span>Текущий: <strong className="text-[var(--text-main)]">{rec.currentBalance.toLocaleString()}</strong></span>
                      <ArrowRight size={11} className="opacity-40" />
                      <span>Расчетный: <strong className="text-[var(--primary-color)]">{rec.reconciledBalance.toLocaleString()}</strong></span>
                    </div>
                  </div>

                  {/* Difference Badge */}
                  <div className="shrink-0 text-right">
                    {rec.hasDiscrepancy ? (
                      <span className={`inline-block text-xs font-black px-2 py-1 rounded-lg ${rec.difference > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                        {rec.difference > 0 ? `+${rec.difference.toLocaleString()}` : rec.difference.toLocaleString()}
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-bold text-emerald-500/80 px-2 py-1">
                        OK
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--glass-item-bg)]/40 shrink-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
            <div className="flex gap-2">
              {report.hasAnyDiscrepancies && (
                <button
                  type="button"
                  onClick={handleSelectAllDiscrepancies}
                  className="hover:text-[var(--text-main)] underline underline-offset-2 transition-colors"
                >
                  Выбрать расхождения
                </button>
              )}
              <button
                type="button"
                onClick={handleSelectAll}
                className="hover:text-[var(--text-main)] underline underline-offset-2 transition-colors"
              >
                Выбрать все
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="hover:text-[var(--text-main)] underline underline-offset-2 transition-colors"
              >
                Снять выбор
              </button>
            </div>
            <span>Выбрано: <strong className="text-[var(--text-main)]">{selectedCount}</strong></span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] active:scale-98 transition-all text-xs uppercase tracking-wider"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={selectedCount === 0 || isApplying}
              className="flex-1 h-12 rounded-xl bg-[var(--primary-color)] font-bold text-white shadow-lg shadow-[var(--primary-color)]/20 hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isApplying ? (
                <>
                  <RefreshCcw size={14} className="animate-spin" />
                  Применение...
                </>
              ) : (
                `Применить (${selectedCount})`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
