import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CapitalAnalyticsModal } from '../CapitalAnalyticsModal';
import { Account, Transaction } from '../../types';

describe('CapitalAnalyticsModal', () => {
  const mockAccounts: Account[] = [
    { id: 'acc-1', name: 'Карта Tinkoff', balance: 5000, currency: 'USD', color: '#6366f1', icon: 'credit-card' },
    { id: 'acc-2', name: 'Наличные', balance: 1000, currency: 'USD', color: '#10b981', icon: 'wallet' }
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: '15.02.2026',
      type: 'expense',
      accountId: 'acc-1',
      targetId: 'cat-1',
      sourceAmount: 500,
      sourceCurrency: 'USD',
      sourceAmountUSD: 500,
      targetAmount: 500,
      targetCurrency: 'USD',
      targetAmountUSD: 500,
      tag: 'Супермаркет'
    },
    {
      id: 'tx-2',
      date: '10.01.2026',
      type: 'income',
      accountId: 'acc-1',
      targetId: 'inc-1',
      sourceAmount: 2000,
      sourceCurrency: 'USD',
      sourceAmountUSD: 2000,
      targetAmount: 2000,
      targetCurrency: 'USD',
      targetAmountUSD: 2000,
      tag: 'Зарплата'
    }
  ];

  it('renders modal with title, total capital and account list', () => {
    const handleClose = vi.fn();
    render(
      <CapitalAnalyticsModal
        isOpen={true}
        onClose={handleClose}
        accounts={mockAccounts}
        transactions={mockTransactions}
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    // Title and subtitle
    expect(screen.getAllByText(/Капитал|Capital/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/12 месяцев/i)).toBeDefined();

    // Accounts rendered
    expect(screen.getByText('Карта Tinkoff')).toBeDefined();
    expect(screen.getByText('Наличные')).toBeDefined();

    // Select all / Deselect all button
    expect(screen.getByText(/СНЯТЬ ВСЕ|ВЫБРАТЬ ВСЕ/i)).toBeDefined();
  });

  it('expands account monthly breakdown on click', () => {
    render(
      <CapitalAnalyticsModal
        isOpen={true}
        onClose={() => {}}
        accounts={mockAccounts}
        transactions={mockTransactions}
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    // Click on account name to expand
    const accRow = screen.getByText('Карта Tinkoff');
    fireEvent.click(accRow);

    // Expanded breakdown should show monthly headers and short month format (e.g. '26)
    expect(screen.getByText('Месяц')).toBeDefined();
    expect(screen.getByText('Динамика')).toBeDefined();
    expect(screen.getAllByText(/'\d\d/i).length).toBeGreaterThan(0);
  });

  it('toggles account selection on squircle click', () => {
    const { container } = render(
      <CapitalAnalyticsModal
        isOpen={true}
        onClose={() => {}}
        accounts={mockAccounts}
        transactions={mockTransactions}
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    // Find filter buttons
    const filterButtons = container.querySelectorAll('div[title="Отключить"]');
    expect(filterButtons.length).toBe(2);

    // Click to disable one account
    fireEvent.click(filterButtons[0]);

    // Counter of selected accounts should update to 1 из 2
    expect(screen.getByText(/1 из 2/i)).toBeDefined();
  });

  it('toggles chart collapse', () => {
    render(
      <CapitalAnalyticsModal
        isOpen={true}
        onClose={() => {}}
        accounts={mockAccounts}
        transactions={mockTransactions}
        baseCurrency="USD"
        baseSymbol="$"
      />
    );

    const collapseButton = screen.getByTitle('Свернуть график');
    expect(collapseButton).toBeDefined();

    fireEvent.click(collapseButton);
    expect(screen.getByTitle('Развернуть график')).toBeDefined();
  });
});
