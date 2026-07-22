import { endOfDay, isValid, parseISO, startOfDay } from 'date-fns';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseUserDate(value: string, boundary: 'start' | 'end'): Date {
  const parsed = parseISO(value);
  if (!isValid(parsed)) {
    throw new Error(`Date invalide : "${value}". Utilisez YYYY-MM-DD ou une date ISO.`);
  }
  if (DATE_ONLY.test(value)) {
    return boundary === 'start' ? startOfDay(parsed) : endOfDay(parsed);
  }
  return parsed;
}

export function localDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}
