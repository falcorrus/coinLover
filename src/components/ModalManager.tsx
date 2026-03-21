import React from "react";
import { 
  Account, IncomeSource, Category, Transaction, NumpadData, HistoryModalState, TransactionType, Entity
} from "../types";
import { APP_SETTINGS } from "../constants/settings";
import { RatesService } from "../services/RatesService";
import { Numpad } from "./Numpad";
import { AccountModal } from "./AccountModal";
import { CategoryModal } from "./CategoryModal";
import { IncomeModal } from "./IncomeModal";
import { HistoryModal } from "./HistoryModal";
import { AnalyticsModal } from "./AnalyticsModal";
import { CalendarAnalyticsModal } from "./CalendarAnalyticsModal";
import { ConfirmModal } from "./ConfirmModal";
import { TagModal } from "./TagModal";
import { UsersModal } from "./UsersModal";
import { ThemeModal } from "./ThemeModal";

interface ModalManagerProps {
  // Modal States
  accountModal: { isOpen: boolean; account: Account | null };
  incomeModal: { isOpen: boolean; income: IncomeSource | null };
  categoryModal: { isOpen: boolean; category: Category | null };
  historyModal: HistoryModalState;
  analyticsModal: { isOpen: boolean; type: "expense" | "income" };
  calendarAnalyticsModal: { isOpen: boolean };
  confirmDelete: { isOpen: boolean; title: string; message: string; onConfirm: () => void };
  numpad: NumpadData;
  isTagModalOpen: boolean;
  isUsersModalOpen: boolean;
  isThemeModalOpen: boolean;
  theme: "light" | "dark" | "midnight" | "modern";
  conflictData: any; 
  editingTxId: string | null;
  categoryCurrencyMode: "base" | "local";
  localCurrencyCode: string;
  
  // Data
  accounts: Account[];
  categories: Category[];
  incomes: IncomeSource[];
  transactions: Transaction[];
  allExistingTags: string[];
  users: { name: string; id: string }[];
  activeTableId: string;
  
  // Handlers
  setAccountModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; account: Account | null }>>;
  setIncomeModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; income: IncomeSource | null }>>;
  setCategoryModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; category: Category | null }>>;
  setHistoryModal: React.Dispatch<React.SetStateAction<HistoryModalState>>;
  setAnalyticsModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; type: "expense" | "income" }>>;
  setCalendarAnalyticsModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean }>>;
  setConfirmDelete: React.Dispatch<React.SetStateAction<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>>;
  setNumpad: React.Dispatch<React.SetStateAction<NumpadData>>;
  setIsTagModalOpen: (v: boolean) => void;
  setIsUsersModalOpen: (v: boolean) => void;
  setIsThemeModalOpen: (v: boolean) => void;
  setTheme: (v: "light" | "dark" | "midnight" | "modern") => void;
  setEditingTxId: (v: string | null) => void;
  setConflictData: (v: any) => void;
  
  // Logic Handlers
  addTransaction: (type: TransactionType, source: Account | IncomeSource, destination: Account | Category, sourceAmount: number, targetAmount?: number, tag?: string, customDate?: string, comment?: string, customCurrency?: string) => Promise<void>;
  updateTransaction: (txId: string, type: TransactionType, source: Account | IncomeSource, destination: Account | Category, sourceAmount: number, targetAmount?: number, tag?: string, customDate?: string, comment?: string, customCurrency?: string) => Promise<void>;
  deleteTransaction: (txId: string) => Promise<void>;
  saveAccount: (account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  saveCategory: (category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveIncome: (income: Partial<IncomeSource>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  updateLocalFromRemote: (data: any) => void;
  onSwitchTable: (id: string) => void;
}

export const ModalManager: React.FC<ModalManagerProps> = (props) => {
  const {
    accountModal, incomeModal, categoryModal, historyModal, analyticsModal,
    calendarAnalyticsModal, confirmDelete, numpad, isTagModalOpen, isUsersModalOpen, conflictData, editingTxId,
    isThemeModalOpen, theme,
    categoryCurrencyMode, localCurrencyCode,
    accounts, categories, incomes, transactions, allExistingTags, users, activeTableId,
    setAccountModal, setIncomeModal, setCategoryModal, setHistoryModal, setAnalyticsModal,
    setCalendarAnalyticsModal, setConfirmDelete, setNumpad, setIsTagModalOpen, setIsUsersModalOpen, setEditingTxId, setConflictData,
    setIsThemeModalOpen, setTheme,
    addTransaction, updateTransaction, deleteTransaction, saveAccount, deleteAccount, 
    saveCategory, deleteCategory, saveIncome, deleteIncome, updateLocalFromRemote,
    onSwitchTable
  } = props;

  // Helper for safeEval
  const safeEval = (str: string): string => {
    try {
      let expr = str.replace(/,/g, '.').replace(/\s/g, '');
      expr = expr.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
      const sanitized = expr.replace(/[^-+/*0-9.()]/g, '');
      if (!sanitized) return "0";
      const result = new Function(`return ${sanitized}`)();
      return (Math.round(result * 100) / 100).toString();
    } catch { return str; }
  };

  const closeHistoryModal = () => {
    // В новой системе стека мы просто позволяем App.tsx обработать закрытие или вызываем history.back()
    window.history.back();
  };

  return (
    <>
      {/* 1. Базовые модалки (Уровень 1) */}
      <AccountModal isOpen={accountModal.isOpen} account={accountModal.account} onClose={() => setAccountModal({ isOpen: false, account: null })} onSave={(name, balance, currency, icon, color) => { saveAccount({ ...accountModal.account, name, balance, currency, icon, color }); setAccountModal({ isOpen: false, account: null }); }} onDelete={() => { if (!accountModal.account) return; setConfirmDelete({ isOpen: true, title: "Удалить кошелек?", message: `Удалить "${accountModal.account.name}"?`, onConfirm: () => { deleteAccount(accountModal.account!.id); setAccountModal({ isOpen: false, account: null }); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }} />
      <IncomeModal isOpen={incomeModal.isOpen} income={incomeModal.income} onClose={() => setIncomeModal({ isOpen: false, income: null })} onSave={(name, icon, color, tags) => { saveIncome({ ...incomeModal.income, name, icon, color, tags }); setIncomeModal({ isOpen: false, income: null }); }} onDelete={() => { if (!incomeModal.income) return; setConfirmDelete({ isOpen: true, title: "Удалить доход?", message: `Удалить "${incomeModal.income.name}"?`, onConfirm: () => { deleteIncome(incomeModal.income!.id); setIncomeModal({ isOpen: false, income: null }); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }} />
      <CategoryModal isOpen={categoryModal.isOpen} category={categoryModal.category} onClose={() => setCategoryModal({ isOpen: false, category: null })} onSave={(cat) => { saveCategory(cat); setCategoryModal({ isOpen: false, category: null }); }} onDelete={() => { if (!categoryModal.category) return; setConfirmDelete({ isOpen: true, title: "Удалить категорию?", message: `Удалить "${categoryModal.category.name}"?`, onConfirm: () => { deleteCategory(categoryModal.category!.id); setCategoryModal({ isOpen: false, category: null }); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }} />
      
      <UsersModal isOpen={isUsersModalOpen} onClose={() => setIsUsersModalOpen(false)} users={users} activeTableId={activeTableId} onSwitchTable={onSwitchTable} />
      <ThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} currentTheme={theme} onSelect={(t) => { setTheme(t); setIsThemeModalOpen(false); }} />

      {/* 2. Аналитика и Календарь (Уровень 1 или 2) */}
      <AnalyticsModal 
        isOpen={analyticsModal.isOpen} 
        onClose={() => setAnalyticsModal(p => ({ ...p, isOpen: false }))} 
        categories={categories} incomes={incomes} accounts={accounts} globalTransactions={transactions} 
        initialType={analyticsModal.type} 
        currencyMode={categoryCurrencyMode}
        localCurrencyCode={localCurrencyCode}
        onItemClick={(item, type, monthTx) => { 
          let entity = item; 
          if (type === "category") { const cat = categories.find(c => c.id === item.id); if (cat) entity = cat; } 
          else if (type === "income") { const inc = incomes.find(i => i.id === item.id); if (inc) entity = inc; } 
          setHistoryModal({ 
            isOpen: true, entity, type, 
            customTransactions: monthTx.filter(t => { 
              if (type === "category") return t.targetId === item.id; 
              if (type === "tag") return (t.tag?.trim() || "Без тега") === item.name; 
              if (type === "income") return t.targetId === item.id; 
              return false; 
            }), 
            returnTo: "analytics" 
          }); 
        }} 
      />
      <CalendarAnalyticsModal 
        isOpen={calendarAnalyticsModal.isOpen} 
        onClose={() => setCalendarAnalyticsModal({ isOpen: false })} 
        globalTransactions={transactions} 
        accounts={accounts} 
        categories={categories} 
        incomes={incomes} 
        baseCurrency={props.baseCurrency || "USD"} 
        baseSymbol={props.baseSymbol || "$"} 
        categoryCurrencyMode={categoryCurrencyMode}
        localCurrencyCode={localCurrencyCode}
        onItemClick={(item, type, dayTx) => { 
          setHistoryModal({ isOpen: true, entity: item, type, customTransactions: dayTx, returnTo: "calendar" }); 
        }} 
      />

      {/* 3. История (Уровень 2 или 3 - открывается из Главной или из Аналитики) */}
      <HistoryModal 
        isOpen={historyModal.isOpen} 
        onClose={closeHistoryModal} 
        entity={historyModal.entity as any} entityType={historyModal.type} transactions={historyModal.customTransactions || transactions} accounts={accounts} categories={categories} incomes={incomes} 
        onEditTransaction={(tx) => { 
          const source = tx.type === "income" ? incomes.find(i => i.id === tx.targetId) ?? null : accounts.find(a => a.id === tx.accountId) ?? null; 
          const destination = tx.type === "expense" ? categories.find(c => c.id === tx.targetId) ?? null : tx.type === "income" ? accounts.find(a => a.id === tx.accountId) ?? null : accounts.find(a => a.id === tx.targetId) ?? null; 
          if (!source || !destination) return; 
          const returnState = { ...historyModal };
          setEditingTxId(tx.id);
          const actualSourceCurrency = tx.type === "income" ? tx.sourceCurrency : (source as Account).currency;
          setNumpad({ isOpen: true, type: tx.type, source, destination, sourceAmount: String(tx.sourceAmount), sourceCurrency: actualSourceCurrency, targetAmount: String(tx.targetAmount ?? tx.sourceAmount), targetCurrency: tx.targetCurrency, targetLinked: true, activeField: "source", tag: tx.tag ?? null, comment: tx.comment ?? "", returnState }); 
        }} 
      />

      {/* 4. Нумпад (Самый высокий уровень - z-400) */}
      <Numpad
        data={numpad} 
        availableCurrencies={Array.from(new Set([...accounts.map(a => a.currency), numpad.sourceCurrency, numpad.targetCurrency]))} 
        transactions={transactions}
        isEditing={!!editingTxId}
        onClose={() => { 
          // setNumpad вызывает срабатывание useEffect в App.tsx, который сделает history.back()
          setNumpad({ ...numpad, isOpen: false, targetLinked: true, returnState: undefined }); 
          setEditingTxId(null); 
        }}
        onFieldChange={(f) => setNumpad(p => ({ ...p, activeField: f }))}
        onManageTags={() => setIsTagModalOpen(true)}
        onLinkToggle={() => { setNumpad(p => ({ ...p, targetLinked: !p.targetLinked })); if (navigator.vibrate) navigator.vibrate(10); }}
        onCurrencyChange={(field, curr) => {
          if (field === "target") localStorage.setItem("cl_numpad_pref_currency", curr);
          setNumpad(p => {
            const evalAmt = parseFloat(safeEval(p.sourceAmount));
            if (field === "source") {
              const newTarget = p.targetLinked && evalAmt > 0 ? (Math.round(RatesService.convert(evalAmt, curr, p.targetCurrency) * 100) / 100).toString() : p.targetAmount;
              return { ...p, sourceCurrency: curr, targetAmount: newTarget };
            } else {
              const newTarget = p.targetLinked && evalAmt > 0 ? (Math.round(RatesService.convert(evalAmt, p.sourceCurrency, curr) * 100) / 100).toString() : p.targetAmount;
              return { ...p, targetCurrency: curr, targetAmount: newTarget };
            }
          });
        }}
        onPress={(val) => setNumpad(p => {
          const isSource = p.activeField === "source"; const key = isSource ? "sourceAmount" : "targetAmount"; const currStr = p[key];
          const computeTarget = (s: string): string => { const amt = parseFloat(safeEval(s)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, p.sourceCurrency, p.targetCurrency) * 100) / 100).toString(); };
          const computeSource = (t: string): string => { const amt = parseFloat(safeEval(t)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, p.targetCurrency, p.sourceCurrency) * 100) / 100).toString(); };
          if (val === "C") return p.targetLinked ? { ...p, sourceAmount: "0", targetAmount: "0" } : { ...p, [key]: "0" };
          if (val === "=") { const ev = safeEval(currStr); if (p.targetLinked) return isSource ? { ...p, sourceAmount: ev, targetAmount: computeTarget(ev) } : { ...p, targetAmount: ev, sourceAmount: computeSource(ev) }; return { ...p, [key]: ev }; }
          const nv = currStr === "0" && !isNaN(Number(val)) ? val : currStr + val;
          if (p.targetLinked) return isSource ? { ...p, sourceAmount: nv, targetAmount: computeTarget(nv) } : { ...p, targetAmount: nv, sourceAmount: computeSource(nv) };
          return { ...p, [key]: nv };
        })}
        onDelete={() => setNumpad(p => {
          const isSource = p.activeField === "source"; const key = isSource ? "sourceAmount" : "targetAmount"; const currStr = p[key]; const nv = currStr.length > 1 ? currStr.slice(0, -1) : "0";
          const computeTarget = (s: string): string => { const amt = parseFloat(safeEval(s)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, p.sourceCurrency, p.targetCurrency) * 100) / 100).toString(); };
          const computeSource = (t: string): string => { const amt = parseFloat(safeEval(t)); return isNaN(amt) || amt === 0 ? "0" : (Math.round(RatesService.convert(amt, p.targetCurrency, p.sourceCurrency) * 100) / 100).toString(); };
          if (p.targetLinked) return isSource ? { ...p, sourceAmount: nv, targetAmount: computeTarget(nv) } : { ...p, targetAmount: nv, sourceAmount: computeSource(nv) };
          return { ...p, [key]: nv };
        })}
        onTagSelect={(t) => setNumpad(p => ({ ...p, tag: t }))} onCommentChange={(c) => setNumpad(p => ({ ...p, comment: c }))}
        onRemove={() => { if (editingTxId) setConfirmDelete({ isOpen: true, title: "Удалить операцию?", message: "Транзакция будет удалена, балансы кошельков будут скорректированы автоматически.", onConfirm: () => { deleteTransaction(editingTxId); setEditingTxId(null); setNumpad(p => ({ ...p, isOpen: false, sourceAmount: "0", targetAmount: "0", comment: "" })); setConfirmDelete(p => ({ ...p, isOpen: false })); } }); }}
        onSubmit={(date?: string) => {
          const fs = parseFloat(safeEval(numpad.sourceAmount)); const ft = parseFloat(safeEval(numpad.targetAmount));
          const customCurr = numpad.type === "income" ? numpad.sourceCurrency : numpad.targetCurrency;
          if (customCurr) localStorage.setItem("cl_numpad_pref_currency", customCurr);
          if (editingTxId) updateTransaction(editingTxId, numpad.type, numpad.source!, numpad.destination!, fs, ft, numpad.tag || undefined, date, numpad.comment || undefined, customCurr);
          else addTransaction(numpad.type, numpad.source!, numpad.destination!, fs, ft, numpad.tag || undefined, date, numpad.comment || undefined, customCurr);
          setNumpad({ ...numpad, isOpen: false, sourceAmount: "0", targetAmount: "0", targetLinked: true, activeField: "source", comment: "", returnState: undefined });
          setEditingTxId(null);
        }}
      />

      {/* 5. Утилитарные окна (z-300, z-500) */}
      <TagModal 
        isOpen={isTagModalOpen} onClose={() => setIsTagModalOpen(false)} existingTags={allExistingTags} activeTags={numpad.type === 'expense' ? (numpad.destination as Category)?.tags || [] : (numpad.source as IncomeSource)?.tags || []}
        onSelect={(tag) => {
          if (numpad.type === 'expense' && numpad.destination) {
            const cat = numpad.destination as Category; const currentTags = cat.tags || []; const isSelected = currentTags.some(t => t.toLowerCase() === tag.toLowerCase());
            const newTags = isSelected ? currentTags.filter(t => t.toLowerCase() !== tag.toLowerCase()) : [...currentTags, tag];
            const updated = { ...cat, tags: newTags }; saveCategory(updated); setNumpad(p => ({ ...p, destination: updated, tag: tag }));
          } else if (numpad.type === 'income' && numpad.source) {
            const inc = numpad.source as IncomeSource; const currentTags = inc.tags || []; const isSelected = currentTags.some(t => t.toLowerCase() === tag.toLowerCase());
            const newTags = isSelected ? currentTags.filter(t => t.toLowerCase() !== tag.toLowerCase()) : [...currentTags, tag];
            const updated = { ...inc, tags: newTags }; saveIncome(updated); setNumpad(p => ({ ...p, source: updated, tag: tag }));
          } else { setNumpad(p => ({ ...p, tag: tag })); }
        }}
      />
      
      <ConfirmModal isOpen={confirmDelete.isOpen} title={confirmDelete.title} message={confirmDelete.message} onConfirm={confirmDelete.onConfirm} onCancel={() => setConfirmDelete(p => ({ ...p, isOpen: false }))} />

      {conflictData && (
        <ConfirmModal 
          isOpen={true} title="Обнаружены изменения" message={`В облаке есть более свежие данные (версия от ${new Date((conflictData as any).timestamp.replace(/-/g, '/').replace('T', ' ')).toLocaleString()}). Загрузить их и перезаписать локальные данные?`}
          confirmText="ЗАГРУЗИТЬ" cancelText="ОСТАВИТЬ МОИ" danger={false} onConfirm={() => updateLocalFromRemote(conflictData)} onCancel={() => { localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC, (conflictData as any).timestamp); setConflictData(null); }}
        />
      )}
    </>
  );
};
