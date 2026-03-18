import { useCallback } from "react";
import { Account, Category, IncomeSource } from "../types";

interface EntityStateProps {
  accounts: Account[];
  setAccounts: (a: Account[]) => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;
  incomes: IncomeSource[];
  setIncomes: (i: IncomeSource[]) => void;
  pushSettings: (a: Account[], c: Category[], i: IncomeSource[], ssId?: string) => Promise<boolean>;
  ssId?: string;
}

export const useEntities = ({
  accounts, setAccounts, categories, setCategories, incomes, setIncomes, pushSettings, ssId
}: EntityStateProps) => {

  const saveAccount = useCallback(async (account: Partial<Account>) => {
    const updated = account.id ? accounts.map((a) => (a.id === account.id ? { ...a, ...account } : a)) : [...accounts, { ...account, id: `acc-${Date.now()}` } as Account];
    setAccounts(updated);
    await pushSettings(updated, categories, incomes, ssId);
  }, [accounts, categories, incomes, setAccounts, pushSettings, ssId]);

  const deleteAccount = useCallback(async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    await pushSettings(updated, categories, incomes, ssId);
  }, [accounts, categories, incomes, setAccounts, pushSettings, ssId]);

  const syncCategories = useCallback(async (updated: Category[]) => {
    setCategories(updated);
    await pushSettings(accounts, updated, incomes, ssId);
  }, [accounts, incomes, setCategories, pushSettings, ssId]);

  const saveCategory = useCallback(async (category: Partial<Category>) => {
    const updated = category.id ? categories.map((c) => (c.id === category.id ? { ...c, ...category } : c)) : [...categories, { ...category, id: `cat-${Date.now()}`, tags: category.tags ?? [] } as Category];
    setCategories(updated);
    await pushSettings(accounts, updated, incomes, ssId);
  }, [accounts, categories, incomes, setCategories, pushSettings, ssId]);

  const deleteCategory = useCallback(async (id: string) => {
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await pushSettings(accounts, updated, incomes, ssId);
  }, [accounts, categories, incomes, setCategories, pushSettings, ssId]);

  const syncIncomes = useCallback(async (updated: IncomeSource[]) => {
    setIncomes(updated);
    await pushSettings(accounts, categories, updated, ssId);
  }, [accounts, categories, setIncomes, pushSettings, ssId]);

  const syncAccountsOrder = useCallback(async (updated: Account[]) => {
    setAccounts(updated);
    await pushSettings(updated, categories, incomes, ssId);
  }, [categories, incomes, setAccounts, pushSettings, ssId]);

  const saveIncome = useCallback(async (income: Partial<IncomeSource>) => {
    const updated = income.id ? incomes.map((i) => (i.id === income.id ? { ...i, ...income } : i)) : [...incomes, { ...income, id: `inc-${Date.now()}` } as IncomeSource];
    setIncomes(updated);
    await pushSettings(accounts, categories, updated, ssId);
  }, [accounts, categories, incomes, setIncomes, pushSettings, ssId]);

  const deleteIncome = useCallback(async (id: string) => {
    const updated = incomes.filter((i) => i.id !== id);
    setIncomes(updated);
    await pushSettings(accounts, categories, updated, ssId);
  }, [accounts, categories, incomes, setIncomes, pushSettings, ssId]);

  return {
    saveAccount, deleteAccount, syncCategories, saveCategory, deleteCategory,
    syncIncomes, syncAccountsOrder, saveIncome, deleteIncome
  };
};
