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
  static compute(
    accounts: Account[],
    transactions: Transaction[],
    checkpoints?: Record<string, number>,
    checkpointDate?: string
  ): ReconciliationReport {
    let checkpointDt: Date | null = null;
    if (checkpointDate) {
      try {
        const raw = checkpointDate.trim();
        if (/^\d{2}\.\d{2}\.\d{4}/.test(raw)) {
          const parts = raw.split(/[ .:]/);
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const hour = parts[3] ? parseInt(parts[3], 10) : 0;
          const min = parts[4] ? parseInt(parts[4], 10) : 0;
          const sec = parts[5] ? parseInt(parts[5], 10) : 0;
          checkpointDt = new Date(year, month, day, hour, min, sec);
        } else {
          const dt = new Date(raw);
          if (!isNaN(dt.getTime())) checkpointDt = dt;
        }
      } catch (_) {}
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
          const txDt = new Date(tx.date);
          if (!isNaN(txDt.getTime()) && txDt < checkpointDt) {
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

    return {
      results,
      hasAnyDiscrepancies: discrepancies.length > 0,
      totalDiscrepanciesCount: discrepancies.length,
      checkpointDate: isCheckpointValid ? checkpointDate : undefined,
    };
  }
}
