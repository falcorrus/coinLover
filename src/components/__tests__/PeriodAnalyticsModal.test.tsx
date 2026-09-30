import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PeriodAnalyticsModal } from '../PeriodAnalyticsModal';
import { Category, IncomeSource, Account, Transaction } from '../../types';

describe('PeriodAnalyticsModal', () => {
  const mockCategories: Category[] = [
    { id: 'cat-home', name: 'Жилье', color: '#f59e0b', icon: 'rent', tags: ['Аренда'] },
    { id: 'cat-food', name: 'Еда', color: '#10b981', icon: 'food', tags: ['Продукты'] }
  ];

  const mockIncomes: IncomeSource[] = [
    { id: 'inc-1', name: 'Зарплата', color: '#10b981', icon: 'business', tags: ['Основная'] }
  ];

  const mockAccounts: Account[] = [
    { id: 'acc-1', name: 'Карта', balance: 1000, currency: 'USD', color: '#6d5dfc', icon: 'card' }
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: new Date().toISOString(),
      type: 'expense',
      accountId: 'acc-1',
      targetId: 'cat-home',
      sourceAmount: 500,
      sourceCurrency: 'USD',
      sourceAmountUSD: 500,
      targetAmount: 500,
      targetCurrency: 'USD',
      targetAmountUSD: 500,
      tag: 'Аренда'
    },
    {
      id: 'tx-2',
      date: new Date().toISOString(),
      type: 'income',
      accountId: 'acc-1',
      targetId: 'inc-1',
      sourceAmount: 1500,
      sourceCurrency: 'USD',
      sourceAmountUSD: 1500,
      targetAmount: 1500,
      targetCurrency: 'USD',
      targetAmountUSD: 1500,
      tag: 'Основная'
    }
  ];

  it('renders modal with title, categories and 12-month legend', () => {
    const handleClose = vi.fn();
    render(
      <PeriodAnalyticsModal
        isOpen={true}
        onClose={handleClose}
        categories={mockCategories}
        incomes={mockIncomes}
        accounts={mockAccounts}
        globalTransactions={mockTransactions}
        currencyMode="base"
        localCurrencyCode="USD"
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    // Title should be visible
    expect(screen.getByText('Период')).toBeDefined();
    expect(screen.getAllByText(/12 месяцев/i).length).toBeGreaterThan(0);

    // Category names should be visible
    expect(screen.getByText('Жилье')).toBeDefined();
    expect(screen.getByText('Еда')).toBeDefined();

    // Toggle button should be present
    expect(screen.getByText(/СНЯТЬ ВСЕ|ВЫБРАТЬ ВСЕ/i)).toBeDefined();
  });

  it('clicking on category title expands tag details', () => {
    render(
      <PeriodAnalyticsModal
        isOpen={true}
        onClose={() => {}}
        categories={mockCategories}
        incomes={mockIncomes}
        accounts={mockAccounts}
        globalTransactions={mockTransactions}
        currencyMode="base"
        localCurrencyCode="USD"
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    // Click on title "Жилье"
    const homeTitle = screen.getByText('Жилье');
    fireEvent.click(homeTitle);

    // Tag detail "Аренда" should be expanded and visible
    expect(screen.getByText('Аренда')).toBeDefined();
  });

  it('clicking on income button switches to income sources list', () => {
    render(
      <PeriodAnalyticsModal
        isOpen={true}
        onClose={() => {}}
        categories={mockCategories}
        incomes={mockIncomes}
        accounts={mockAccounts}
        globalTransactions={mockTransactions}
        currencyMode="base"
        localCurrencyCode="USD"
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    // Click on "Доход" button in summary card
    const incomeButtons = screen.getAllByText(/Доход/i);
    // Find the one in the summary card button
    fireEvent.click(incomeButtons[0]);

    // Income source "Зарплата" should now be rendered in the bottom list
    expect(screen.getByText('Зарплата')).toBeDefined();
  });

  it('clicking chart collapse arrow toggles chart visibility', () => {
    render(
      <PeriodAnalyticsModal
        isOpen={true}
        onClose={() => {}}
        categories={mockCategories}
        incomes={mockIncomes}
        accounts={mockAccounts}
        globalTransactions={mockTransactions}
        currencyMode="base"
        localCurrencyCode="USD"
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    const collapseButton = screen.getByTitle('Свернуть график');
    expect(collapseButton).toBeDefined();

    // Click to collapse
    fireEvent.click(collapseButton);

    // Button title changes to "Развернуть график"
    expect(screen.getByTitle('Развернуть график')).toBeDefined();
  });

  it('clicking amount or chevron in row also expands tag details, while icon toggles selection', () => {
    const { container } = render(
      <PeriodAnalyticsModal
        isOpen={true}
        onClose={() => {}}
        categories={mockCategories}
        incomes={mockIncomes}
        accounts={mockAccounts}
        globalTransactions={mockTransactions}
        currencyMode="base"
        localCurrencyCode="USD"
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    // Clicking amount text "$ 500" should expand "Аренда"
    const amountText = screen.getByText('$ 500');
    fireEvent.click(amountText);
    expect(screen.getByText('Аренда')).toBeDefined();

    // Clicking the icon should toggle selection
    const iconButtons = container.querySelectorAll('div[title="Отключить"]');
    expect(iconButtons.length).toBeGreaterThan(0);
    fireEvent.click(iconButtons[0]);
    // Selection count should update
    expect(screen.getByText(/1 из 2/)).toBeDefined();
  });

  it('renders income bars with green #10b981 and expense bars with yellow #eab308', () => {
    const { container } = render(
      <PeriodAnalyticsModal
        isOpen={true}
        onClose={() => {}}
        categories={mockCategories}
        incomes={mockIncomes}
        accounts={mockAccounts}
        globalTransactions={mockTransactions}
        currencyMode="base"
        localCurrencyCode="USD"
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    const rects = container.querySelectorAll('rect[fill="#10b981"], rect[fill="#eab308"]');
    expect(rects.length).toBeGreaterThan(0);

    const greenRects = container.querySelectorAll('rect[fill="#10b981"]');
    const yellowRects = container.querySelectorAll('rect[fill="#eab308"]');
    expect(greenRects.length).toBeGreaterThan(0);
    expect(yellowRects.length).toBeGreaterThan(0);
  });

  it('displays summary cards for Income, Expense and Net Cash Flow', () => {
    render(
      <PeriodAnalyticsModal
        isOpen={true}
        onClose={() => {}}
        categories={mockCategories}
        incomes={mockIncomes}
        accounts={mockAccounts}
        globalTransactions={mockTransactions}
        currencyMode="base"
        localCurrencyCode="USD"
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    // Summary cards should be present
    expect(screen.getByText(/Сальдо/i)).toBeDefined();
    expect(screen.getAllByText(/Доход/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Расход/i).length).toBeGreaterThan(0);
  });
});
