import { describe, it, expect } from 'vitest';
import { safeEvaluateMath } from '../mathParser';

describe('safeEvaluateMath', () => {
  it('evaluates basic operations correctly', () => {
    expect(safeEvaluateMath('1 + 2')).toBe(3);
    expect(safeEvaluateMath('10 - 4')).toBe(6);
    expect(safeEvaluateMath('5 * 6')).toBe(30);
    expect(safeEvaluateMath('20 / 4')).toBe(5);
  });

  it('respects operator precedence (* and / before + and -)', () => {
    expect(safeEvaluateMath('2 + 3 * 4')).toBe(14);
    expect(safeEvaluateMath('10 - 6 / 2')).toBe(7);
  });

  it('handles parentheses properly', () => {
    expect(safeEvaluateMath('(2 + 3) * 4')).toBe(20);
    expect(safeEvaluateMath('100 / (2 + 3)')).toBe(20);
  });

  it('handles decimals and fractional percentages', () => {
    expect(safeEvaluateMath('12.5 + 7.5')).toBe(20);
    expect(safeEvaluateMath('100 * (15 / 100)')).toBe(15);
  });

  it('handles unary minus and plus', () => {
    expect(safeEvaluateMath('-5 + 10')).toBe(5);
    expect(safeEvaluateMath('10 + -3')).toBe(7);
  });

  it('handles division by zero safely', () => {
    expect(safeEvaluateMath('10 / 0')).toBe(0);
  });
});
