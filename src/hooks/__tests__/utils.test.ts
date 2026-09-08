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
