import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AppHeader } from '../layout/AppHeader';
import { LanguageProvider } from '../../contexts/LanguageContext';

const renderWithLang = (ui: React.ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe('AppHeader Menu & More navigation', () => {
  const defaultProps = {
    isIncomeCollapsed: true,
    toggleIncome: vi.fn(),
    isStoriesCollapsed: true,
    toggleStories: vi.fn(),
    settingsLongPress: {},
    handleMenuClick: vi.fn(),
    isSettingsMenuOpen: true,
    setIsSettingsMenuOpen: vi.fn(),
    pullSettings: vi.fn(),
    setHistoryModal: vi.fn(),
    setCalendarAnalyticsModal: vi.fn(),
    setAnalyticsModal: vi.fn(),
    setPeriodModal: vi.fn(),
    setCapitalModal: vi.fn(),
    theme: 'black' as const,
    setTheme: vi.fn(),
    syncStatus: 'success',
    pillMode: 'balance' as const,
    setPillMode: vi.fn(),
    currentSymbol: '$',
    displaySpent: 100,
    displayEarned: 200,
    displayBalance: 1000,
    categoriesCount: 6,
    activeTableId: 'test-table-id',
    setIsAISheetOpen: vi.fn(),
    isAISheetOpen: false,
    tariff: 'Free',
    onOpenPremiumModal: vi.fn(),
    accounts: [],
    transactions: [],
  };

  it('renders 3x2 menu including Capital and More buttons', () => {
    renderWithLang(<AppHeader {...defaultProps} />);
    expect(screen.getByText('Лента')).toBeDefined();
    expect(screen.getByText('Календарь')).toBeDefined();
    expect(screen.getByText('Аналитика')).toBeDefined();
    expect(screen.getByText('Период')).toBeDefined();
    expect(screen.getByText('Капитал')).toBeDefined();
    expect(screen.getByText('Еще')).toBeDefined();
  });

  it('navigates to More submenu without crashing and shows sub-options', () => {
    renderWithLang(<AppHeader {...defaultProps} />);
    const moreBtn = screen.getByText('Еще').closest('button');
    expect(moreBtn).not.toBeNull();
    fireEvent.click(moreBtn!);

    // Should show the sub-items: Security, Application, Logout
    expect(screen.getByText('Безопасность')).toBeDefined();
    expect(screen.getByText('Приложение')).toBeDefined();
    expect(screen.getByText('Выйти из аккаунта')).toBeDefined();
    expect(screen.getByText('Назад')).toBeDefined();

    // Clicking Back returns to main view
    const backBtn = screen.getByText('Назад').closest('button');
    fireEvent.click(backBtn!);
    expect(screen.getByText('Лента')).toBeDefined();
    expect(screen.getByText('Капитал')).toBeDefined();
  });

  it('calls setCapitalModal when Capital button is clicked', () => {
    renderWithLang(<AppHeader {...defaultProps} />);
    const capitalBtn = screen.getByText('Капитал').closest('button');
    fireEvent.click(capitalBtn!);
    expect(defaultProps.setCapitalModal).toHaveBeenCalledWith({ isOpen: true });
  });
});
