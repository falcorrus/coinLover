export interface Account {
  id: string;
  name: string;
  balance: number;
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
  amount: number;
  date: string;
  tag?: string;
}

export interface NumpadData {
  isOpen: boolean;
  type: TransactionType;
  source: Account | IncomeSource | null;
  destination: Account | Category | null;
  amount: string;
  tag: string | null;
}

export type DragItemType = "account" | "category" | "income";

// Push-only sync payloads (discriminated union)
export type SyncPayload =
  | {
    action: "addTransaction";
    targetSheet: "Transactions";
    date: string;
    type: TransactionType;
    sourceName: string;
    destinationName: string;
    tagName: string;
    amount: number;
    // allAccounts removed from here to stop bloating Transactions tab
  }
  | {
    action: "syncSettings";
    targetSheet: "Configs";
    accounts: Account[];
    categories: Category[];
    incomes: IncomeSource[];
    timestamp: string; // Added for state snapshots
  };
