export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  color: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  tags: string[];
}

export interface IncomeSource {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export type TransactionType = "expense" | "income" | "transfer";

export interface Transaction {
  id: string;
  type: TransactionType;
  accountId: string;
  targetId: string;
  amount: number; // Amount deducted from source
  amountUSD?: number; // USD equivalent of source amount
  targetAmount?: number; // Amount added to destination (for transfers) or recorded in category
  targetAmountUSD?: number; // USD equivalent of target amount
  date: string;
  tag?: string;
  comment?: string;
}

export interface NumpadData {
  isOpen: boolean;
  type: TransactionType;
  source: Account | IncomeSource | null;
  destination: Account | Category | null;
  amount: string; // Source amount string
  targetAmount: string; // Destination amount string
  targetLinked: boolean; // true = targetAmount mirrors amount automatically
  activeField: "source" | "destination";
  tag: string | null;
  comment: string;
  date?: string;
}

export type DragItemType = "account" | "category" | "income";

// Push-only sync payloads (discriminated union)
export type SyncPayload =
  | {
    action: "addTransaction";
    targetSheet: "Transactions";
    id: string;
    date: string;
    type: TransactionType;
    sourceName: string;
    destinationName: string;
    tagName: string;
    amount: number;
    amountUSD?: number;
    targetAmount?: number;
    targetAmountUSD?: number;
    comment?: string;
  }
  | {
    action: "updateTransaction";
    targetSheet: "Transactions";
    id: string;          // ID of the transaction to update (find by this)
    date: string;
    type: TransactionType;
    sourceName: string;
    destinationName: string;
    tagName: string;
    amount: number;
    amountUSD?: number;
    targetAmount?: number;
    targetAmountUSD?: number;
    comment?: string;
  }
  | {
    action: "syncSettings";
    targetSheet: "Configs";
    accounts: Account[];
    categories: Category[];
    incomes: IncomeSource[];
    timestamp: string; // Added for state snapshots
  }
  | {
    action: "deleteTransaction";
    targetSheet: "Transactions";
    id: string;
    timestamp: string;
  };
