import { useCallback } from "react";
import { Account, Category, IncomeSource } from "../types";

interface EntityStateProps {
  accounts: Account[];
  setAccounts: (a: Account[]) => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;
  incomes: IncomeSource[];
  setIncomes: (i: IncomeSource[]) => void;
  pushSettings: (a: Account[], c: Category[], i: IncomeSource[], immediate?: boolean) => Promise<boolean>;
  ssId?: string;
}

export const useEntities = ({
  accounts, setAccounts, categories, setCategories, incomes, setIncomes, pushSettings, ssId
}: EntityStateProps) => {

  const saveAccount = useCallback(async (account: Partial<Account>) => {
    const updated = account.id 
      ? accounts.map((a) => {
          if (a.id === account.id) {
            const oldName = a.name?.trim();
            const newName = account.name?.trim();
            let aliases = Array.isArray(account.aliases) 
              ? [...account.aliases] 
              : (Array.isArray(a.aliases) ? [...a.aliases] : []);
            
            if (oldName && newName && oldName.toLowerCase() !== newName.toLowerCase()) {
              if (!aliases.some(al => al.toLowerCase() === oldName.toLowerCase())) {
                aliases.push(oldName);
              }
            }
            return { ...a, ...account, aliases };
          }
          return a;
        })
      : [...accounts, { ...account, id: `acc-${Date.now()}`, aliases: account.aliases || [] } as Account];
    setAccounts(updated);
    await pushSettings(updated, categories, incomes, true);
  }, [accounts, categories, incomes, setAccounts, pushSettings, ssId]);

  const deleteAccount = useCallback(async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    await pushSettings(updated, categories, incomes, true);
  }, [accounts, categories, incomes, setAccounts, pushSettings, ssId]);

  const syncCategories = useCallback(async (updated: Category[]) => {
    setCategories(updated);
    await pushSettings(accounts, updated, incomes, false);
  }, [accounts, incomes, setCategories, pushSettings, ssId]);

  const saveCategory = useCallback(async (category: Partial<Category>) => {
    const updated = category.id 
      ? categories.map((c) => {
          if (c.id === category.id) {
            const oldName = c.name?.trim();
            const newName = category.name?.trim();
            let aliases = Array.isArray(category.aliases) 
              ? [...category.aliases] 
              : (Array.isArray(c.aliases) ? [...c.aliases] : []);
            
            if (oldName && newName && oldName.toLowerCase() !== newName.toLowerCase()) {
              if (!aliases.some(al => al.toLowerCase() === oldName.toLowerCase())) {
                aliases.push(oldName);
              }
            }
            return { ...c, ...category, aliases };
          }
          return c;
        })
      : [...categories, { ...category, id: `cat-${Date.now()}`, tags: category.tags ?? [], aliases: category.aliases || [] } as Category];
    setCategories(updated);
    await pushSettings(accounts, updated, incomes, true);
  }, [accounts, categories, incomes, setCategories, pushSettings, ssId]);

  const deleteCategory = useCallback(async (id: string) => {
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await pushSettings(accounts, updated, incomes, true);
  }, [accounts, categories, incomes, setCategories, pushSettings, ssId]);

  const syncIncomes = useCallback(async (updated: IncomeSource[]) => {
    setIncomes(updated);
    await pushSettings(accounts, categories, updated, false);
  }, [accounts, categories, setIncomes, pushSettings, ssId]);

  const syncAccountsOrder = useCallback(async (updated: Account[]) => {
    setAccounts(updated);
    await pushSettings(updated, categories, incomes, false);
  }, [categories, incomes, setAccounts, pushSettings, ssId]);

  const saveIncome = useCallback(async (income: Partial<IncomeSource>) => {
    const updated = income.id 
      ? incomes.map((i) => {
          if (i.id === income.id) {
            const oldName = i.name?.trim();
            const newName = income.name?.trim();
            let aliases = Array.isArray(income.aliases) 
              ? [...income.aliases] 
              : (Array.isArray(i.aliases) ? [...i.aliases] : []);
            
            if (oldName && newName && oldName.toLowerCase() !== newName.toLowerCase()) {
              if (!aliases.some(al => al.toLowerCase() === oldName.toLowerCase())) {
                aliases.push(oldName);
              }
            }
            return { ...i, ...income, aliases };
          }
          return i;
        })
      : [...incomes, { ...income, id: `inc-${Date.now()}`, tags: income.tags ?? [], aliases: income.aliases || [] } as IncomeSource];
    setIncomes(updated);
    await pushSettings(accounts, categories, updated, true);
  }, [accounts, categories, incomes, setIncomes, pushSettings, ssId]);

  const deleteIncome = useCallback(async (id: string) => {
    const updated = incomes.filter((i) => i.id !== id);
    setIncomes(updated);
    await pushSettings(accounts, categories, updated, true);
  }, [accounts, categories, incomes, setIncomes, pushSettings, ssId]);

  return {
    saveAccount, deleteAccount, syncCategories, saveCategory, deleteCategory,
    syncIncomes, syncAccountsOrder, saveIncome, deleteIncome
  };
};
