import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RatesService } from '../RatesService';
import { APP_SETTINGS } from '../../constants/settings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('RatesService', () => {
  const mockRates = {
    USD: 1,
    RUB: 100,
    EUR: 0.9
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should convert amount correctly using cached rates', () => {
    // Setup cache
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(mockRates));
    
    // USD -> RUB (1 * 100)
    expect(RatesService.convert(1, 'USD', 'RUB')).toBe(100);
    
    // RUB -> USD (100 / 100)
    expect(RatesService.convert(100, 'RUB', 'USD')).toBe(1);
    
    // EUR -> RUB (1 / 0.9 * 100)
    expect(RatesService.convert(1, 'EUR', 'RUB')).toBeCloseTo(111.11, 1);
  });

  it('should return same amount if currencies are identical', () => {
    expect(RatesService.convert(100, 'USD', 'USD')).toBe(100);
    expect(RatesService.convert(50, 'RUB', 'RUB')).toBe(50);
  });

  it('should return 0 if amount is invalid', () => {
    expect(RatesService.convert(0, 'USD', 'RUB')).toBe(0);
    // @ts-ignore
    expect(RatesService.convert(null, 'USD', 'RUB')).toBe(0);
  });

  it('should return amount if rate is missing and target is not USD', () => {
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify({ USD: 1 }));
    // No RUB rate
    expect(RatesService.convert(100, 'USD', 'RUB')).toBe(100);
  });

  it('should return 0 if rate is missing and target is USD', () => {
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify({ USD: 1 }));
    // No unknown rate
    expect(RatesService.convert(100, 'UNKNOWN', 'USD')).toBe(0);
  });
});
