import { useCallback } from "react";
import { Account, Category, IncomeSource } from "../types";

interface EntityStateProps {
  accounts: Account[];
  setAccounts: (a: Account[]) => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;
  incomes: IncomeSource[];
  setIncomes: (i: IncomeSource[]) => void;
  pushSettings: (a: Account[], c: Category[], i: IncomeSource[]) => Promise<boolean>;
}

export const useEntities = ({
  accounts, setAccounts, categories, setCategories, incomes, setIncomes, pushSettings
}: EntityStateProps) => {

  const saveAccount = useCallback(async (account: Partial<Account>) => {
    const updated = account.id ? accounts.map((a) => (a.id === account.id ? { ...a, ...account } : a)) : [...accounts, { ...account, id: `acc-${Date.now()}` } as Account];
    setAccounts(updated);
    await pushSettings(updated, categories, incomes);
  }, [accounts, categories, incomes, setAccounts, pushSettings]);

  const deleteAccount = useCallback(async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    await pushSettings(updated, categories, incomes);
  }, [accounts, categories, incomes, setAccounts, pushSettings]);

  const syncCategories = useCallback(async (updated: Category[]) => {
    setCategories(updated);
    await pushSettings(accounts, updated, incomes);
  }, [accounts, incomes, setCategories, pushSettings]);

  const saveCategory = useCallback(async (category: Partial<Category>) => {
    const updated = category.id ? categories.map((c) => (c.id === category.id ? { ...c, ...category } : c)) : [...categories, { ...category, id: `cat-${Date.now()}`, tags: category.tags ?? [] } as Category];
    setCategories(updated);
    await pushSettings(accounts, updated, incomes);
  }, [accounts, categories, incomes, setCategories, pushSettings]);

  const deleteCategory = useCallback(async (id: string) => {
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await pushSettings(accounts, updated, incomes);
  }, [accounts, categories, incomes, setCategories, pushSettings]);

  const syncIncomes = useCallback(async (updated: IncomeSource[]) => {
    setIncomes(updated);
    await pushSettings(accounts, categories, updated);
  }, [accounts, categories, setIncomes, pushSettings]);

  const syncAccountsOrder = useCallback(async (updated: Account[]) => {
    setAccounts(updated);
    await pushSettings(updated, categories, incomes);
  }, [categories, incomes, setAccounts, pushSettings]);

  const saveIncome = useCallback(async (income: Partial<IncomeSource>) => {
    const updated = income.id ? incomes.map((i) => (i.id === income.id ? { ...i, ...income } : i)) : [...incomes, { ...income, id: `inc-${Date.now()}` } as IncomeSource];
    setIncomes(updated);
    await pushSettings(accounts, categories, updated);
  }, [accounts, categories, incomes, setIncomes, pushSettings]);

  const deleteIncome = useCallback(async (id: string) => {
    const updated = incomes.filter((i) => i.id !== id);
    setIncomes(updated);
    await pushSettings(accounts, categories, updated);
  }, [accounts, categories, incomes, setIncomes, pushSettings]);

  return {
    saveAccount, deleteAccount, syncCategories, saveCategory, deleteCategory,
    syncIncomes, syncAccountsOrder, saveIncome, deleteIncome
  };
};
