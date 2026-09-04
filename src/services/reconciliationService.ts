import { Account, Transaction } from "../types";

export interface ReconciledAccountResult {
  account: Account;
  currentBalance: number;
  reconciledBalance: number;
  difference: number;
  hasDiscrepancy: boolean;
  transactionsCount: number;
  checkpointBalance?: number;
}

export interface ReconciliationReport {
  results: ReconciledAccountResult[];
  hasAnyDiscrepancies: boolean;
  totalDiscrepanciesCount: number;
  checkpointDate?: string;
}

export class ReconciliationService {
  /**
   * Helper to parse date string in ISO or Russian DD.MM.YY / DD.MM.YYYY formats
   */
  static parseDate(rawDate?: string): Date | null {
    if (!rawDate) return null;
    try {
      const raw = rawDate.trim();
      // Match DD.MM.YYYY or DD.MM.YY (with optional HH:mm[:ss])
      const ruMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (ruMatch) {
        const day = parseInt(ruMatch[1], 10);
        const month = parseInt(ruMatch[2], 10) - 1;
        let year = parseInt(ruMatch[3], 10);
        if (year < 100) year += 2000;
        const hour = ruMatch[4] ? parseInt(ruMatch[4], 10) : 0;
        const min = ruMatch[5] ? parseInt(ruMatch[5], 10) : 0;
        const sec = ruMatch[6] ? parseInt(ruMatch[6], 10) : 0;
        return new Date(year, month, day, hour, min, sec);
      }
      const dt = new Date(raw);
      return !isNaN(dt.getTime()) ? dt : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Returns the start of the previous month (1st day at 00:00:00 local time)
   */
  static getStartOfPreviousMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  }

  static compute(
    accounts: Account[],
    transactions: Transaction[],
    checkpoints?: Record<string, number>,
    checkpointDate?: string,
    options?: { useStartOfPrevMonth?: boolean }
  ): ReconciliationReport {
    let checkpointDt: Date | null = null;

    if (options?.useStartOfPrevMonth !== false) {
      // Default rule: use start of previous month
      checkpointDt = ReconciliationService.getStartOfPreviousMonth();
    } else if (checkpointDate) {
      checkpointDt = ReconciliationService.parseDate(checkpointDate);
    }
    const isCheckpointValid = checkpointDt !== null;

    const results: ReconciledAccountResult[] = accounts.map((account) => {
      const aid = String(account.id || "").trim().toLowerCase();
      const aName = String(account.name || "").trim().toLowerCase();

      let startingBalance = 0;
      let usedCheckpoint = false;
      let checkpointBal: number | undefined = undefined;

      if (checkpoints && isCheckpointValid) {
        if (checkpoints[account.id] !== undefined) {
          startingBalance = Number(checkpoints[account.id]) || 0;
          usedCheckpoint = true;
          checkpointBal = startingBalance;
        } else if (checkpoints[aid] !== undefined) {
          startingBalance = Number(checkpoints[aid]) || 0;
          usedCheckpoint = true;
          checkpointBal = startingBalance;
        } else if (checkpoints[aName] !== undefined) {
          startingBalance = Number(checkpoints[aName]) || 0;
          usedCheckpoint = true;
          checkpointBal = startingBalance;
        }
      }

      let runningBalance = startingBalance;
      let matchedTxCount = 0;

      // Filter and evaluate transactions
      for (const tx of transactions) {
        if (!tx || !tx.date) continue;

        if (usedCheckpoint && checkpointDt) {
          const txDt = ReconciliationService.parseDate(tx.date);
          if (txDt && txDt < checkpointDt) {
            continue;
          }
        }

        const txAccId = String(tx.accountId || "").trim().toLowerCase();
        const txTargetId = String(tx.targetId || "").trim().toLowerCase();

        const isSource = txAccId === aid || txAccId === aName;
        const isTarget = txTargetId === aid || txTargetId === aName;

        if (tx.type === "expense" && isSource) {
          runningBalance -= (Number(tx.sourceAmount) || 0);
          matchedTxCount++;
        } else if (tx.type === "income" && (isTarget || isSource)) {
          runningBalance += (Number(tx.targetAmount) || Number(tx.sourceAmount) || 0);
          matchedTxCount++;
        } else if (tx.type === "transfer") {
          if (isSource) {
            runningBalance -= (Number(tx.sourceAmount) || 0);
            matchedTxCount++;
          }
          if (isTarget) {
            runningBalance += (Number(tx.targetAmount) || Number(tx.sourceAmount) || 0);
            matchedTxCount++;
          }
        }
      }

      const currentBalance = Number(account.balance) || 0;
      if (matchedTxCount === 0 && !usedCheckpoint) {
        runningBalance = currentBalance;
      }

      const roundedReconciled = Math.round(runningBalance * 100) / 100;
      const difference = Math.round((roundedReconciled - currentBalance) * 100) / 100;
      const hasDiscrepancy = Math.abs(difference) > 0.05;

      return {
        account,
        currentBalance,
        reconciledBalance: roundedReconciled,
        difference,
        hasDiscrepancy,
        transactionsCount: matchedTxCount,
        checkpointBalance: checkpointBal,
      };
    });

    const discrepancies = results.filter((r) => r.hasDiscrepancy);

    const formattedCheckpointDate = checkpointDt
      ? `${String(checkpointDt.getDate()).padStart(2, "0")}.${String(checkpointDt.getMonth() + 1).padStart(2, "0")}.${checkpointDt.getFullYear()}`
      : undefined;

    return {
      results,
      hasAnyDiscrepancies: discrepancies.length > 0,
      totalDiscrepanciesCount: discrepancies.length,
      checkpointDate: formattedCheckpointDate,
    };
  }
}
