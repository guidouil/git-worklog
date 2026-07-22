import chalk, { Chalk, type ChalkInstance } from 'chalk';
import Table from 'cli-table3';
import type { Locale, WorklogReport } from '../domain/types.js';
import { formatClockMinutes, formatDuration } from '../utils/duration.js';
import { resolveDisplayLocale } from '../utils/locale.js';

export interface TerminalOptions {
  compact: boolean;
  verbose: boolean;
  color: boolean;
  statsOnly?: boolean;
}

export function formatTerminal(report: WorklogReport, options: TerminalOptions): string {
  const locale = resolveDisplayLocale(report.metadata.locale);
  const c = new Chalk({ level: options.color ? chalk.level : 0 });
  const lines = [c.bold(title(report, locale)), c.dim(copy(locale, 'approximation'))];
  if (!options.statsOnly) {
    lines.push('');
    if (report.days.length === 0) lines.push(copy(locale, 'noActivity'));
    for (const day of report.days) {
      const date = new Date(`${day.date}T12:00:00`);
      if (options.compact) {
        lines.push(
          `${formatDay(date, locale)}  ${formatDuration(day.durationMinutes)}  ${day.commitCount} ${commitWord(locale, day.commitCount)}`,
        );
        continue;
      }
      lines.push(c.bold(formatDay(date, locale)));
      const table = new Table({
        chars: {
          top: '',
          'top-mid': '',
          'top-left': '',
          'top-right': '',
          bottom: '',
          'bottom-mid': '',
          'bottom-left': '',
          'bottom-right': '',
          left: '',
          'left-mid': '',
          mid: '',
          'mid-mid': '',
          right: '',
          'right-mid': '',
          middle: '  ',
        },
        style: { 'padding-left': 0, 'padding-right': 0, compact: true },
      });
      for (const session of day.sessions) {
        table.push([
          `${clock(session.start, locale)} → ${clock(session.end, locale)}`,
          formatDuration(session.durationMinutes),
          `${session.commits.length} ${commitWord(locale, session.commits.length)}`,
          session.repositories.join(', '),
        ]);
        if (options.verbose) {
          for (const commit of session.commits) {
            table.push([
              '',
              c.dim(commit.shortHash),
              clock(commit.analysisDate, locale),
              commit.subject,
            ]);
          }
        }
      }
      table.push([
        '',
        c.bold(copy(locale, 'total')),
        c.bold(formatDuration(day.durationMinutes)),
        '',
      ]);
      lines.push(table.toString(), '');
    }
  }
  lines.push(...statsLines(report, locale, c));
  return `${lines.join('\n').trimEnd()}\n`;
}

function statsLines(report: WorklogReport, locale: Locale, c: ChalkInstance): string[] {
  const stats = report.stats;
  const lines = [
    `${c.bold(copy(locale, 'periodTotal'))}: ${formatDuration(stats.totalMinutes)}`,
    `${copy(locale, 'activeDays')}: ${stats.activeDays}`,
    `${copy(locale, 'sessions')}: ${stats.sessionCount}`,
    `${copy(locale, 'commitsLabel')}: ${stats.commitCount}`,
    `${copy(locale, 'dailyAverage')}: ${formatDuration(stats.averageDailyMinutes)}`,
    `${copy(locale, 'sessionAverage')}: ${formatDuration(stats.averageSessionMinutes)}`,
    `${copy(locale, 'firstAverage')}: ${formatClockMinutes(stats.averageFirstCommitMinutes)}`,
    `${copy(locale, 'lastAverage')}: ${formatClockMinutes(stats.averageLastCommitMinutes)}`,
  ];
  if (stats.byRepository.length > 0) {
    lines.push('', c.bold(copy(locale, 'repositories')));
    for (const item of stats.byRepository) {
      lines.push(
        `  ${item.key}: ${formatDuration(item.durationMinutes)} · ${item.commits} ${commitWord(locale, item.commits)}`,
      );
    }
  }
  if (stats.sessionCount > 0) {
    lines.push('', c.bold(copy(locale, 'weekdays')));
    for (const item of stats.byWeekday.filter((entry) => entry.durationMinutes > 0)) {
      lines.push(
        `  ${weekdayName(item.key, locale)}: ${formatDuration(item.durationMinutes)} · ${item.commits} ${commitWord(locale, item.commits)}`,
      );
    }
    lines.push('', c.bold(copy(locale, 'hours')));
    lines.push(
      `  ${stats.commitsByHour
        .map((count, hour) => ({ count, hour }))
        .filter(({ count }) => count > 0)
        .map(({ count, hour }) => `${String(hour).padStart(2, '0')}h: ${count}`)
        .join(' · ')}`,
    );
  }
  return lines;
}

function weekdayName(key: string, locale: Locale): string {
  const sunday = new Date(2026, 0, 4, 12);
  sunday.setDate(sunday.getDate() + Number(key));
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(sunday);
}

function commitWord(locale: Locale, count: number): string {
  return count === 1 ? 'commit' : copy(locale, 'commits');
}

function title(report: WorklogReport, locale: Locale): string {
  const start = new Date(report.metadata.periodStart);
  const end = new Date(report.metadata.periodEnd);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'long' });
  return `Git Worklog — ${formatter.format(start)} → ${formatter.format(end)}`;
}

function formatDay(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    date,
  );
}

function clock(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}

const TEXT = {
  fr: {
    approximation: 'Estimation approximative fondée sur l’activité Git.',
    noActivity: 'Aucune activité correspondant aux filtres sur cette période.',
    commits: 'commits',
    total: 'Total',
    periodTotal: 'Total période',
    activeDays: 'Jours actifs',
    sessions: 'Sessions',
    commitsLabel: 'Commits',
    dailyAverage: 'Moyenne quotidienne',
    sessionAverage: 'Durée moyenne d’une session',
    firstAverage: 'Premier commit moyen',
    lastAverage: 'Dernier commit moyen',
    repositories: 'Répartition par dépôt',
    weekdays: 'Répartition par jour de semaine',
    hours: 'Répartition horaire des commits',
  },
  en: {
    approximation: 'Approximate estimate based on Git activity.',
    noActivity: 'No matching activity during this period.',
    commits: 'commits',
    total: 'Total',
    periodTotal: 'Period total',
    activeDays: 'Active days',
    sessions: 'Sessions',
    commitsLabel: 'Commits',
    dailyAverage: 'Daily average',
    sessionAverage: 'Average session duration',
    firstAverage: 'Average first commit',
    lastAverage: 'Average last commit',
    repositories: 'By repository',
    weekdays: 'By weekday',
    hours: 'Commits by hour',
  },
} as const;

function copy(locale: Locale, key: keyof (typeof TEXT)['fr']): string {
  return TEXT[locale][key];
}
