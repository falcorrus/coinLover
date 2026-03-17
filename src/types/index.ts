export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  balanceUSD?: number;
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
  tags: string[];
  balanceUSD?: number;
}

export type TransactionType = "expense" | "income" | "transfer";

export interface Transaction {
  id: string;
  type: TransactionType;
  accountId: string;
  targetId: string;
  sourceAmount: number; // Amount from source perspective
  sourceCurrency: string; 
  sourceAmountUSD: number; 
  targetAmount: number; // Amount reaching destination (Wallet for income, Category for expense)
  targetCurrency: string;
  targetAmountUSD: number;
  date: string;
  tag?: string;
  comment?: string;
}

export type DragItemType = "account" | "category" | "income";

export type Entity = Account | Category | IncomeSource;

export interface HistoryModalState {
  isOpen: boolean;
  entity: Entity | { name: string; icon: string } | null;
  type: DragItemType | "tag" | "feed" | null;
  customTransactions?: Transaction[];
}

export interface NumpadData {
  isOpen: boolean;
  type: TransactionType;
  source: Account | IncomeSource | null;
  destination: Account | Category | null;
  sourceAmount: string;
  sourceCurrency: string;
  targetAmount: string;
  targetCurrency: string;
  targetLinked: boolean; 
  activeField: "source" | "destination";
  tag: string | null;
  comment: string;
  date?: string;
}

export interface SyncSettingsFields {
  accounts: Account[];
  categories: Category[];
  incomes: IncomeSource[];
  timestamp: string;
}

export type SyncPayload =
  | ({
    action: "addTransaction";
    targetSheet: "Transactions";
    id: string;
    date: string;
    type: TransactionType;
    sourceName: string;
    destinationName: string;
    tagName: string;
    sourceAmount: number;
    sourceCurrency: string;
    sourceAmountUSD: number;
    targetAmount: number;
    targetCurrency: string;
    targetAmountUSD: number;
    comment?: string;
  } & Partial<SyncSettingsFields>)
  | ({
    action: "updateTransaction";
    targetSheet: "Transactions";
    id: string;
    date: string;
    type: TransactionType;
    sourceName: string;
    destinationName: string;
    tagName: string;
    sourceAmount: number;
    sourceCurrency: string;
    sourceAmountUSD: number;
    targetAmount: number;
    targetCurrency: string;
    targetAmountUSD: number;
    comment?: string;
  } & Partial<SyncSettingsFields>)
  | ({
    action: "syncSettings";
    targetSheet: "Configs";
  } & SyncSettingsFields)
  | ({
    action: "deleteTransaction";
    targetSheet: "Transactions";
    id: string;
  } & Partial<SyncSettingsFields>);
