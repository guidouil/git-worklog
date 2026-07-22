import { describe, expect, it } from 'vitest';
import { resolvePeriod, resolveRange } from '../../src/domain/periods.js';
import { localDateKey } from '../../src/utils/dates.js';

describe('periods', () => {
  it('starts weeks on Monday and resolves the previous civil week', () => {
    const now = new Date(2026, 6, 22, 12);
    const current = resolvePeriod('week', now);
    const previous = resolvePeriod('last-week', now);
    expect(localDateKey(current.start)).toBe('2026-07-20');
    expect(localDateKey(current.end)).toBe('2026-07-26');
    expect(localDateKey(previous.start)).toBe('2026-07-13');
    expect(localDateKey(previous.end)).toBe('2026-07-19');
  });

  it('handles month and year boundaries', () => {
    const period = resolvePeriod('last-month', new Date(2026, 0, 5));
    expect(localDateKey(period.start)).toBe('2025-12-01');
    expect(localDateKey(period.end)).toBe('2025-12-31');
  });

  it('includes leap day in a February range', () => {
    const period = resolvePeriod('month', new Date(2024, 1, 15));
    expect(localDateKey(period.end)).toBe('2024-02-29');
  });

  it('includes complete range boundary days and supports overrides', () => {
    const period = resolveRange('2026-06-01', '2026-06-30', { since: '2026-06-02' });
    expect(localDateKey(period.start)).toBe('2026-06-02');
    expect(period.end.getHours()).toBe(23);
    expect(period.end.getMinutes()).toBe(59);
  });

  it('rejects reversed and invalid ranges', () => {
    expect(() => resolveRange('2026-07-02', '2026-07-01')).toThrow(/début/);
    expect(() => resolveRange('not-a-date', '2026-07-01')).toThrow(/Date invalide/);
  });
});
