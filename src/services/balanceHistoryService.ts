import { Account, Transaction } from "../types";
import { RatesService } from "./RatesService";
import { safeParseDate } from "../hooks/utils";

export interface AccountMonthEndBalance {
  accountId: string;
  accountName: string;
  currency: string;
  color: string;
  icon: string;
  nativeBalance: number;
  baseBalance: number;
}

export interface MonthEndBalanceResult {
  monthKey: string; // "YYYY-MM"
  date: Date;
  formattedDate: string; // e.g. "31.08.2026"
  isCurrentMonth: boolean;
  totalBase: number;
  accountBalances: AccountMonthEndBalance[];
  changeFromPrevMonthBase?: number;
  percentChangeFromPrevMonth?: number;
}

export class BalanceHistoryService {
  /**
   * Calculates the balances for each account and the total balance (in Base currency)
   * at the end of each specified month by unwinding transactions backwards from current account balances.
   */
  static computeMonthlyBalances(
    accounts: Account[],
    transactions: Transaction[],
    months: {
      key: string;
      year: number;
      monthIndex: number;
      isCurrent: boolean;
    }[],
    baseCurrency?: string,
    filterAccountIds?: Set<string>
  ): MonthEndBalanceResult[] {
    const baseCur = RatesService.getBaseCurrency() || baseCurrency || "USD";
    const now = new Date();

    // Fast account lookup maps
    const accMap = new Map<string, Account>();
    const nameToId = new Map<string, string>();
    for (const acc of accounts) {
      const aid = String(acc.id || "").trim();
      const aidLower = aid.toLowerCase();
      const aNameLower = String(acc.name || "").trim().toLowerCase();
      accMap.set(aid, acc);
      nameToId.set(aidLower, aid);
      if (aNameLower) nameToId.set(aNameLower, aid);
    }

    // 1. One-pass Preprocessing: parse dates once and resolve exact amounts (using Column J USD when applicable)
    interface PreparedTx {
      time: number;
      type: string;
      srcId: string | null;
      targetId: string | null;
      srcAmount: number;
      targetAmount: number;
    }

    const preparedTxList: PreparedTx[] = [];
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (!tx || !tx.date) continue;
      const txDt = safeParseDate(tx.date);
      const time = txDt.getTime();
      if (isNaN(time)) continue;

      const rawSrc = String(tx.accountId || "").trim().toLowerCase();
      const rawTarget = String(tx.targetId || "").trim().toLowerCase();
      const srcId = nameToId.get(rawSrc) || null;
      const targetId = nameToId.get(rawTarget) || null;

      const srcAcc = srcId ? accMap.get(srcId) : null;
      const targetAcc = targetId ? accMap.get(targetId) : null;

      // Resolve source amount: Column J (sourceAmountUSD) takes priority for USD accounts
      let sAmount = Number(tx.sourceAmount) || 0;
      if (srcAcc) {
        const sCurr = srcAcc.currency || baseCur;
        if (sCurr.toUpperCase() === "USD" && tx.sourceAmountUSD !== undefined && tx.sourceAmountUSD !== 0) {
          sAmount = Number(tx.sourceAmountUSD);
        } else if (tx.sourceCurrency && tx.sourceCurrency.toUpperCase() !== sCurr.toUpperCase()) {
          sAmount = RatesService.convert(sAmount, tx.sourceCurrency, sCurr);
        }
      }

      // Resolve target amount: Column J (targetAmountUSD || sourceAmountUSD) takes priority for USD accounts
      let tAmount = Number(tx.targetAmount !== undefined ? tx.targetAmount : tx.sourceAmount) || 0;
      if (targetAcc) {
        const tCurr = targetAcc.currency || baseCur;
        const colJUsd = tx.targetAmountUSD !== undefined && tx.targetAmountUSD !== 0 
          ? tx.targetAmountUSD 
          : tx.sourceAmountUSD;
        if (tCurr.toUpperCase() === "USD" && colJUsd !== undefined && colJUsd !== 0) {
          tAmount = Number(colJUsd);
        } else if (tx.targetCurrency && tx.targetCurrency.toUpperCase() !== tCurr.toUpperCase()) {
          tAmount = RatesService.convert(tAmount, tx.targetCurrency, tCurr);
        }
      }

      preparedTxList.push({
        time,
        type: tx.type,
        srcId,
        targetId,
        srcAmount: sAmount,
        targetAmount: tAmount
      });
    }

    // Sort transactions descending (newest to oldest) for single-pass backward unwinding
    preparedTxList.sort((a, b) => b.time - a.time);

    // 2. Sort months chronologically (oldest to newest)
    const sortedMonths = [...months].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });

    // 3. Initialize working balances with current balances
    const runningBalances = new Map<string, number>();
    for (const acc of accounts) {
      runningBalances.set(acc.id, Number(acc.balance) || 0);
    }

    // 4. Backward unwinding across months
    // Month snapshots stored in reverse order, then reversed at the end
    let txIdx = 0;
    const snapshotsReversed: MonthEndBalanceResult[] = [];

    for (let i = sortedMonths.length - 1; i >= 0; i--) {
      const m = sortedMonths[i];
      let monthEndDate: Date;

      if (m.isCurrent) {
        monthEndDate = now;
      } else {
        // Last millisecond of month: day 0 of monthIndex + 1 is the last day of monthIndex
        monthEndDate = new Date(m.year, m.monthIndex + 1, 0, 23, 59, 59, 999);
      }

      const monthEndTime = monthEndDate.getTime();

      // Undo all transactions strictly after monthEndTime in single linear scan
      while (txIdx < preparedTxList.length && preparedTxList[txIdx].time > monthEndTime) {
        const pt = preparedTxList[txIdx];
        if (pt.type === "expense" && pt.srcId) {
          runningBalances.set(pt.srcId, (runningBalances.get(pt.srcId) || 0) + pt.srcAmount);
        } else if (pt.type === "income") {
          const recId = pt.targetId || pt.srcId;
          if (recId) {
            runningBalances.set(recId, (runningBalances.get(recId) || 0) - pt.targetAmount);
          }
        } else if (pt.type === "transfer") {
          if (pt.srcId) {
            runningBalances.set(pt.srcId, (runningBalances.get(pt.srcId) || 0) + pt.srcAmount);
          }
          if (pt.targetId) {
            runningBalances.set(pt.targetId, (runningBalances.get(pt.targetId) || 0) - pt.targetAmount);
          }
        }
        txIdx++;
      }

      // Snapshot for this month
      const formattedDay = String(monthEndDate.getDate()).padStart(2, "0");
      const formattedMonth = String(monthEndDate.getMonth() + 1).padStart(2, "0");
      const formattedYear = monthEndDate.getFullYear();
      const formattedDate = `${formattedDay}.${formattedMonth}.${formattedYear}`;

      let totalBase = 0;
      const accountBalances: AccountMonthEndBalance[] = [];

      for (const acc of accounts) {
        const currentNative = runningBalances.get(acc.id) || 0;
        const aCurr = acc.currency || baseCur;
        const baseBal = RatesService.convert(currentNative, aCurr, baseCur);

        if (!filterAccountIds || filterAccountIds.has(acc.id)) {
          totalBase += baseBal;
        }

        accountBalances.push({
          accountId: acc.id,
          accountName: acc.name,
          currency: aCurr,
          color: acc.color,
          icon: acc.icon,
          nativeBalance: Math.round(currentNative * 100) / 100,
          baseBalance: Math.round(baseBal * 100) / 100
        });
      }

      snapshotsReversed.push({
        monthKey: m.key,
        date: monthEndDate,
        formattedDate,
        isCurrentMonth: m.isCurrent,
        totalBase: Math.round(totalBase * 100) / 100,
        accountBalances: accountBalances.sort((a, b) => b.baseBalance - a.baseBalance)
      });
    }

    // Restore chronological order (oldest to newest)
    const results = snapshotsReversed.reverse();

    // 5. Compute month-over-month deltas
    for (let i = 0; i < results.length; i++) {
      if (i > 0) {
        const prev = results[i - 1];
        const diff = Math.round((results[i].totalBase - prev.totalBase) * 100) / 100;
        results[i].changeFromPrevMonthBase = diff;
        if (prev.totalBase !== 0) {
          results[i].percentChangeFromPrevMonth = Math.round((diff / Math.abs(prev.totalBase)) * 1000) / 10;
        }
      }
    }

    return results;
  }
}
