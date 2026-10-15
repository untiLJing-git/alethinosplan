import { describe, expect, it } from 'vitest';
import { isDate, monthDates, shiftDay, shiftMonth, weekDates } from './dates';

describe('calendar dates', () => {
  it('validates actual dates, including leap years', () => {
    expect(isDate('2024-02-29')).toBe(true);
    expect(isDate('2026-02-29')).toBe(false);
    expect(isDate('2026-13-01')).toBe(false);
    expect(isDate('2026-1-01')).toBe(false);
    expect(isDate('2101-01-01')).toBe(false);
  });
  it('constructs a Monday-first October grid', () => {
    const days = monthDates('2026-10-15');
    expect(days).toHaveLength(35);
    expect(days[0]).toBe('2026-09-28');
    expect(days.at(-1)).toBe('2026-11-01');
  });
  it('handles weeks crossing years', () => {
    expect(weekDates('2026-01-01')).toEqual(['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
  });
  it('clamps the selected day when changing months', () => {
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonth('2024-01-31', 1)).toBe('2024-02-29');
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-15');
  });
  it('moves dates independently of daylight saving', () => {
    expect(shiftDay('2026-03-08', 1)).toBe('2026-03-09');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });
});
