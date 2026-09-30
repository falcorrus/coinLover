import { describe, it, expect } from 'vitest';
import { sortTransactionsDesc } from '../utils';
import { Transaction } from '../../types';

const mockTx = (overrides: Partial<Transaction>): Transaction => ({
  id: '1',
  date: '2026-09-08T12:00:00.000Z',
  type: 'expense',
  accountId: 'acc-1',
  targetId: 'cat-1',
  sourceAmount: 10,
  sourceCurrency: 'USD',
  sourceAmountUSD: 10,
  targetAmount: 10,
  targetCurrency: 'USD',
  targetAmountUSD: 10,
  ...overrides
});

describe('sortTransactionsDesc', () => {
  it('sorts transactions of different days descending (newest day first)', () => {
    const txs: Transaction[] = [
      mockTx({ id: '1', date: '2026-09-01T12:00:00.000Z' }),
      mockTx({ id: '2', date: '2026-09-08T12:00:00.000Z' }),
      mockTx({ id: '3', date: '2026-09-05T12:00:00.000Z' })
    ];

    const sorted = sortTransactionsDesc(txs);
    expect(sorted.map(t => t.id)).toEqual(['2', '3', '1']);
  });

  it('sorts transactions within the same day by timestamp ID descending (latest event on top)', () => {
    const txs: Transaction[] = [
      mockTx({ id: '1788863716413', date: '2026-09-08T12:00:00.000Z', comment: 'Поезд (утро)' }),
      mockTx({ id: '1788882746435', date: '2026-09-08T12:00:00.000Z', comment: 'Кофе (день)' }),
      mockTx({ id: '1788882762382', date: '2026-09-08T12:00:00.000Z', comment: 'Ужин (вечер)' })
    ];

    const sorted = sortTransactionsDesc(txs);
    expect(sorted.map(t => t.comment)).toEqual(['Ужин (вечер)', 'Кофе (день)', 'Поезд (утро)']);
  });

  it('sorts transactions within the same day by explicit time when present', () => {
    const txs: Transaction[] = [
      mockTx({ id: '1', date: '2026-09-08T09:30:00.000Z', comment: 'Завтрак' }),
      mockTx({ id: '2', date: '2026-09-08T20:15:00.000Z', comment: 'Ужин' }),
      mockTx({ id: '3', date: '2026-09-08T14:00:00.000Z', comment: 'Обед' })
    ];

    const sorted = sortTransactionsDesc(txs);
    expect(sorted.map(t => t.comment)).toEqual(['Ужин', 'Обед', 'Завтрак']);
  });

  it('falls back to reference list order (later added rows first) when IDs are not numeric', () => {
    const referenceList: Transaction[] = [
      mockTx({ id: 'row-a', date: '08.09.2026', comment: 'Первая запись' }),
      mockTx({ id: 'row-b', date: '08.09.2026', comment: 'Вторая запись' }),
      mockTx({ id: 'row-c', date: '08.09.2026', comment: 'Третья запись' })
    ];

    const sorted = sortTransactionsDesc(referenceList, referenceList);
    expect(sorted.map(t => t.comment)).toEqual(['Третья запись', 'Вторая запись', 'Первая запись']);
  });

  it('correctly keeps a newly prepended local transaction at the top', () => {
    const existing: Transaction[] = [
      mockTx({ id: '1788863716413', date: '2026-09-08T12:00:00.000Z', comment: 'Поезд' }),
      mockTx({ id: '1788882762382', date: '2026-09-08T12:00:00.000Z', comment: 'Ужин' })
    ];
    const newTx: Transaction = mockTx({ id: '1788890000000', date: '2026-09-08T12:00:00.000Z', comment: 'Десерт' });
    const list = [newTx, ...existing];

    const sorted = sortTransactionsDesc(list);
    expect(sorted.map(t => t.comment)).toEqual(['Десерт', 'Ужин', 'Поезд']);
  });
});

describe('findAccount', () => {
  const accounts = [
    {
      id: 'acc-1',
      name: 'Belo',
      balance: 100,
      currency: 'USD',
      color: '#6d5dfc',
      icon: 'wallet',
      aliases: ['BeloARQ', 'СтарыйБело']
    },
    {
      id: 'acc-2',
      name: 'Наличные',
      balance: 50,
      currency: 'RUB',
      color: '#10b981',
      icon: 'cash'
    }
  ];

  it('finds account by exact ID', async () => {
    const { findAccount } = await import('../utils');
    expect(findAccount(accounts, 'acc-1')?.name).toBe('Belo');
  });

  it('finds account by current name (case-insensitive)', async () => {
    const { findAccount } = await import('../utils');
    expect(findAccount(accounts, 'belo')?.id).toBe('acc-1');
    expect(findAccount(accounts, 'НАЛИЧНЫЕ')?.id).toBe('acc-2');
  });

  it('finds account by historical alias (case-insensitive)', async () => {
    const { findAccount } = await import('../utils');
    expect(findAccount(accounts, 'BeloARQ')?.id).toBe('acc-1');
    expect(findAccount(accounts, 'старыйбело')?.id).toBe('acc-1');
  });

  it('returns undefined for non-existent account', async () => {
    const { findAccount } = await import('../utils');
    expect(findAccount(accounts, 'Неизвестный')).toBeUndefined();
    expect(findAccount(accounts, null)).toBeUndefined();
  });
});

describe('findCategory', () => {
  const categories = [
    {
      id: 'cat-1',
      name: 'Еда',
      color: '#f59e0b',
      icon: 'utensils',
      tags: ['супермаркет'],
      aliases: ['Продукты', 'Food']
    },
    {
      id: 'cat-2',
      name: 'Транспорт',
      color: '#3b82f6',
      icon: 'car',
      tags: ['такси']
    }
  ];

  it('finds category by exact ID, current name, or alias', async () => {
    const { findCategory } = await import('../utils');
    expect(findCategory(categories, 'cat-1')?.name).toBe('Еда');
    expect(findCategory(categories, 'еда')?.id).toBe('cat-1');
    expect(findCategory(categories, 'продукты')?.id).toBe('cat-1');
    expect(findCategory(categories, 'FOOD')?.id).toBe('cat-1');
    expect(findCategory(categories, 'транспорт')?.id).toBe('cat-2');
    expect(findCategory(categories, 'non-existent')).toBeUndefined();
  });
});

describe('findIncome', () => {
  const incomes = [
    {
      id: 'inc-other',
      name: 'Остальное',
      color: '#10b981',
      icon: 'wallet',
      tags: [],
      aliases: ['Корректировки']
    },
    {
      id: 'inc-salary',
      name: 'Зарплата',
      color: '#3b82f6',
      icon: 'briefcase',
      tags: []
    }
  ];

  it('finds income by exact ID, current name, or alias', async () => {
    const { findIncome } = await import('../utils');
    expect(findIncome(incomes, 'inc-other')?.name).toBe('Остальное');
    expect(findIncome(incomes, 'остальное')?.id).toBe('inc-other');
    expect(findIncome(incomes, 'Корректировки')?.id).toBe('inc-other');
    expect(findIncome(incomes, 'корректировки')?.name).toBe('Остальное');
    expect(findIncome(incomes, 'зарплата')?.id).toBe('inc-salary');
    expect(findIncome(incomes, 'unknown')).toBeUndefined();
  });

  it('matches income transactions with historical alias targetId', async () => {
    const { findIncome } = await import('../utils');
    const incomeEntity = incomes[0]; // 'inc-other', 'Остальное', aliases: ['Корректировки']
    const testTransactions = [
      { id: '1', type: 'income', accountId: 'acc-1', targetId: 'Корректировки', sourceAmount: 100, date: '2026-06-30' },
      { id: '2', type: 'income', accountId: 'acc-1', targetId: 'Остальное', sourceAmount: 200, date: '2026-07-01' },
      { id: '3', type: 'income', accountId: 'acc-1', targetId: 'inc-other', sourceAmount: 300, date: '2026-07-02' },
      { id: '4', type: 'income', accountId: 'acc-1', targetId: 'Зарплата', sourceAmount: 1000, date: '2026-07-03' },
      { id: '5', type: 'expense', accountId: 'acc-1', targetId: 'Корректировки', sourceAmount: 50, date: '2026-07-04' }
    ];

    const matched = testTransactions.filter(t => {
      if (t.type !== 'income') return false;
      const inc = findIncome(incomes, t.targetId);
      return inc?.id === incomeEntity.id;
    });

    expect(matched.map(t => t.id)).toEqual(['1', '2', '3']);
  });
});


