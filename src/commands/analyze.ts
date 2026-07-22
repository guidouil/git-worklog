import { basename } from 'node:path';
import type {
  AuthorFilter,
  DateSource,
  EstimationSettings,
  Locale,
  Period,
  WorkSession,
  WorklogReport,
} from '../domain/types.js';
import { filterCommitsByAuthor } from '../domain/authors.js';
import { readGitIdentity, readGitLog } from '../git/client.js';
import { groupCommitsIntoSessions } from '../sessions/group.js';
import { splitSessionsByDay } from '../sessions/split.js';
import { calculateStats } from '../reports/stats.js';

export interface AnalysisOptions {
  period: Period;
  repositories: string[];
  settings: EstimationSettings;
  locale: Locale;
  dateSource: DateSource;
  authorFilters: AuthorFilter[];
  allAuthors: boolean;
}

export async function analyzeWorklog(options: AnalysisOptions): Promise<WorklogReport> {
  let filters = options.authorFilters;
  if (!options.allAuthors && filters.length === 0) {
    filters = await detectAuthorFilters(options.repositories);
  }
  const nested = await Promise.all(
    options.repositories.map((repository) =>
      readGitLog(repository, options.period, options.dateSource),
    ),
  );
  const commits = filterCommitsByAuthor(nested.flat(), options.allAuthors ? [] : filters).sort(
    (left, right) => new Date(left.analysisDate).getTime() - new Date(right.analysisDate).getTime(),
  );
  const sessions = clampSessions(
    groupCommitsIntoSessions(commits, options.settings),
    options.period,
  );
  const days = splitSessionsByDay(sessions, options.period);
  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      periodKey: options.period.key,
      periodStart: options.period.start.toISOString(),
      periodEnd: options.period.end.toISOString(),
      dateSource: options.dateSource,
      approximate: true,
      locale: options.locale,
    },
    settings: options.settings,
    repositories: options.repositories.map((path) => ({ name: basename(path), path })),
    authorFilters: options.allAuthors ? [] : filters,
    commits,
    sessions,
    days,
    stats: calculateStats(commits, sessions, days),
  };
}

async function detectAuthorFilters(repositories: string[]): Promise<AuthorFilter[]> {
  const identities = await Promise.all(
    repositories.map((repository) => readGitIdentity(repository)),
  );
  const filters: AuthorFilter[] = [];
  for (const identity of identities) {
    if (identity.name === undefined && identity.email === undefined) continue;
    const filter: AuthorFilter = {};
    if (identity.name !== undefined) filter.name = identity.name;
    if (identity.email !== undefined) filter.emails = [identity.email];
    if (!filters.some((candidate) => JSON.stringify(candidate) === JSON.stringify(filter))) {
      filters.push(filter);
    }
  }
  if (filters.length === 0) {
    throw new Error(
      'Aucune identité Git (user.name/user.email) n’est configurée. Configurez Git, utilisez --author/--email, ou passez --all-authors.',
    );
  }
  return filters;
}

function clampSessions(sessions: WorkSession[], period: Period): WorkSession[] {
  return sessions
    .map((session) => {
      const start = Math.max(new Date(session.start).getTime(), period.start.getTime());
      const end = Math.min(new Date(session.end).getTime(), period.end.getTime());
      return {
        ...session,
        start: new Date(start).toISOString(),
        end: new Date(Math.max(start, end)).toISOString(),
        durationMinutes: Math.max(0, end - start) / 60_000,
      };
    })
    .filter((session) => session.durationMinutes > 0);
}
