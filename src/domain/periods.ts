import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import type { Period } from './types.js';
import { parseUserDate } from '../utils/dates.js';

export type PeriodName = 'today' | 'yesterday' | 'week' | 'last-week' | 'month' | 'last-month';

export function resolvePeriod(
  name: PeriodName,
  now = new Date(),
  overrides: { since?: string; until?: string } = {},
): Period {
  let start: Date;
  let end: Date;
  switch (name) {
    case 'today':
      start = startOfDay(now);
      end = endOfDay(now);
      break;
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      start = startOfDay(yesterday);
      end = endOfDay(yesterday);
      break;
    }
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'last-week': {
      const previous = subWeeks(now, 1);
      start = startOfWeek(previous, { weekStartsOn: 1 });
      end = endOfWeek(previous, { weekStartsOn: 1 });
      break;
    }
    case 'month':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'last-month': {
      const previous = subMonths(now, 1);
      start = startOfMonth(previous);
      end = endOfMonth(previous);
      break;
    }
  }
  if (overrides.since !== undefined) start = parseUserDate(overrides.since, 'start');
  if (overrides.until !== undefined) end = parseUserDate(overrides.until, 'end');
  validatePeriod(start, end);
  return { key: name, start, end };
}

export function resolveRange(
  startValue: string,
  endValue: string,
  overrides: { since?: string; until?: string } = {},
): Period {
  const start = parseUserDate(overrides.since ?? startValue, 'start');
  const end = parseUserDate(overrides.until ?? endValue, 'end');
  validatePeriod(start, end);
  return { key: 'range', start, end };
}

function validatePeriod(start: Date, end: Date): void {
  if (start.getTime() > end.getTime()) {
    throw new Error('La date de début doit précéder ou être égale à la date de fin.');
  }
}
