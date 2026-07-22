import type { DayReport, GitCommit, WorkSession, WorklogStats } from '../domain/types.js';
import { localDateKey, minutesSinceMidnight } from '../utils/dates.js';

export function calculateStats(
  commits: GitCommit[],
  sessions: WorkSession[],
  days: DayReport[],
): WorklogStats {
  const totalMinutes = days.reduce((sum, day) => sum + day.durationMinutes, 0);
  const repositoryMinutes = new Map<string, number>();
  for (const day of days) {
    for (const segment of day.sessions) {
      const share = segment.durationMinutes / Math.max(1, segment.repositories.length);
      for (const repository of segment.repositories) {
        repositoryMinutes.set(repository, (repositoryMinutes.get(repository) ?? 0) + share);
      }
    }
  }
  const commitCountByRepository = countBy(commits, (commit) => commit.repositoryName);
  const weekdayMinutes = new Map<string, number>();
  const commitsByWeekday = new Map<string, number>();
  for (const day of days) {
    const weekday = String(new Date(`${day.date}T12:00:00`).getDay());
    weekdayMinutes.set(weekday, (weekdayMinutes.get(weekday) ?? 0) + day.durationMinutes);
    commitsByWeekday.set(weekday, (commitsByWeekday.get(weekday) ?? 0) + day.commitCount);
  }
  const commitsByHour = Array.from({ length: 24 }, () => 0);
  for (const commit of commits) {
    const date = new Date(commit.analysisDate);
    commitsByHour[date.getHours()] = (commitsByHour[date.getHours()] ?? 0) + 1;
  }
  const groupedDays = new Map<string, GitCommit[]>();
  for (const commit of commits) {
    const key = localDateKey(new Date(commit.analysisDate));
    groupedDays.set(key, [...(groupedDays.get(key) ?? []), commit]);
  }
  const firsts: number[] = [];
  const lasts: number[] = [];
  for (const dayCommits of groupedDays.values()) {
    const values = dayCommits.map((commit) => minutesSinceMidnight(new Date(commit.analysisDate)));
    firsts.push(Math.min(...values));
    lasts.push(Math.max(...values));
  }
  return {
    totalMinutes,
    activeDays: days.length,
    sessionCount: sessions.length,
    commitCount: commits.length,
    averageDailyMinutes: days.length === 0 ? 0 : totalMinutes / days.length,
    averageSessionMinutes: sessions.length === 0 ? 0 : totalMinutes / sessions.length,
    averageFirstCommitMinutes: average(firsts),
    averageLastCommitMinutes: average(lasts),
    byRepository: [...new Set([...repositoryMinutes.keys(), ...commitCountByRepository.keys()])]
      .sort()
      .map((key) => ({
        key,
        commits: commitCountByRepository.get(key) ?? 0,
        durationMinutes: repositoryMinutes.get(key) ?? 0,
      })),
    byWeekday: ['1', '2', '3', '4', '5', '6', '0'].map((key) => ({
      key,
      commits: commitsByWeekday.get(key) ?? 0,
      durationMinutes: weekdayMinutes.get(key) ?? 0,
    })),
    commitsByHour,
  };
}

function countBy<T>(items: T[], keyOf: (item: T) => string): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    result.set(key, (result.get(key) ?? 0) + 1);
  }
  return result;
}

function average(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}
