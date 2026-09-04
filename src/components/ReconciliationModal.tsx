import React, { useState, useMemo } from "react";
import { X, Check, RefreshCcw, AlertTriangle, CheckCircle2, ShieldCheck, Wallet, EyeOff, RotateCcw } from "lucide-react";
import { Account, Transaction } from "../types";
import { IconMap } from "../constants";
import { APP_SETTINGS } from "../constants/settings";
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

  // Persistent set of ignored account discrepancies
  const [ignoredAccountIds, setIgnoredAccountIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.RECONCILIATION_IGNORED);
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  const report = useMemo(() => {
    return ReconciliationService.compute(accounts, transactions, checkpoints, checkpointDate, {
      useStartOfPrevMonth: true,
    });
  }, [accounts, transactions, checkpoints, checkpointDate]);

  // Accounts that actually have a discrepancy and are not ignored
  const discrepancyAccounts = useMemo(() => {
    return report.results.filter((r) => r.hasDiscrepancy && !ignoredAccountIds[r.account.id]);
  }, [report, ignoredAccountIds]);

  const totalIgnoredCount = useMemo(() => {
    return Object.keys(ignoredAccountIds).filter((id) =>
      report.results.some((r) => r.account.id === id && r.hasDiscrepancy)
    ).length;
  }, [ignoredAccountIds, report]);

  // Permanently ignore (keep current balance forever)
  const handleKeepCurrentPermanent = (accountId: string) => {
    setIgnoredAccountIds((prev) => {
      const next = { ...prev, [accountId]: true };
      try {
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.RECONCILIATION_IGNORED, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const handleResetIgnored = () => {
    setIgnoredAccountIds({});
    try {
      localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.RECONCILIATION_IGNORED);
    } catch (_) {}
  };

  // User chooses calculated balance for this account
  const handleSelectReconciled = async (accountId: string, reconciledBalance: number) => {
    setIsApplying(true);
    try {
      const updatedAccounts = accounts.map((acc) => {
        if (acc.id === accountId) {
          return { ...acc, balance: reconciledBalance };
        }
        return acc;
      });
      await onApply(updatedAccounts);
    } catch (e) {
      console.error("Failed to update account balance:", e);
    } finally {
      setIsApplying(false);
    }
  };

  // Apply all calculated balances at once
  const handleApplyAllReconciled = async () => {
    setIsApplying(true);
    try {
      const updatedAccounts = accounts.map((acc) => {
        const item = discrepancyAccounts.find((d) => d.account.id === acc.id);
        if (item) {
          return { ...acc, balance: item.reconciledBalance };
        }
        return acc;
      });
      await onApply(updatedAccounts);
      onClose();
    } catch (e) {
      console.error("Failed to apply all reconciled:", e);
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

            {totalIgnoredCount > 0 && (
              <button
                type="button"
                onClick={handleResetIgnored}
                title="Вернуть скрытые расхождения"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-all"
              >
                <RotateCcw size={11} />
                Скрыто: {totalIgnoredCount}
              </button>
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

                    {/* Permanently Dismiss Button */}
                    <button
                      type="button"
                      onClick={() => handleKeepCurrentPermanent(rec.account.id)}
                      title="Оставить текущий навсегда и скрыть расхождение"
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-white/40 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all flex items-center gap-1"
                    >
                      <EyeOff size={13} />
                      <span>Скрыть</span>
                    </button>
                  </div>

                  {/* Choice: Click the correct balance */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {/* Option 1: Current Balance */}
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleKeepCurrentPermanent(rec.account.id)}
                      className="p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/25 active:scale-98 transition-all text-left flex flex-col group"
                    >
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-between">
                        Текущий
                        <Check size={12} className="opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />
                      </span>
                      <span className="text-base font-black text-[var(--text-main)] mt-0.5">
                        {rec.currentBalance.toLocaleString()} {rec.account.currency}
                      </span>
                      <span className="text-[10px] text-white/40 mt-1">
                        Оставить без изменений
                      </span>
                    </button>

                    {/* Option 2: Calculated from operations */}
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleSelectReconciled(rec.account.id, rec.reconciledBalance)}
                      className="p-3 rounded-xl border border-[var(--primary-color)]/50 bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 hover:border-[var(--primary-color)] active:scale-98 transition-all text-left flex flex-col group shadow-sm"
                    >
                      <span className="text-[10px] uppercase font-bold text-[var(--primary-color)] flex items-center justify-between">
                        По истории
                        <Check size={12} className="opacity-0 group-hover:opacity-100 text-[var(--primary-color)] transition-opacity" />
                      </span>
                      <span className="text-base font-black text-[var(--primary-color)] mt-0.5">
                        {rec.reconciledBalance.toLocaleString()} {rec.account.currency}
                      </span>
                      <span className="text-[10px] text-[var(--primary-color)]/70 mt-1">
                        Выровнять с операциями
                      </span>
                    </button>
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
              onClick={handleApplyAllReconciled}
              disabled={isApplying}
              className="flex-1 h-12 rounded-xl bg-[var(--primary-color)] font-bold text-white shadow-lg shadow-[var(--primary-color)]/25 hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isApplying ? (
                <>
                  <RefreshCcw size={14} className="animate-spin" />
                  Применение...
                </>
              ) : (
                `Применить всё (${discrepancyAccounts.length})`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


