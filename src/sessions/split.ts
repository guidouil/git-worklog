import { endOfDay, startOfDay } from 'date-fns';
import type { DayReport, DaySession, GitCommit, Period, WorkSession } from '../domain/types.js';
import { localDateKey } from '../utils/dates.js';

const MINUTE = 60_000;

export function splitSessionsByDay(sessions: WorkSession[], period?: Period): DayReport[] {
  const segments: DaySession[] = [];
  for (const session of sessions) {
    const sessionStart = new Date(session.start);
    const sessionEnd = new Date(session.end);
    let cursor = startOfDay(sessionStart);
    while (cursor.getTime() <= sessionEnd.getTime()) {
      const dayStart = startOfDay(cursor);
      const dayEnd = endOfDay(cursor);
      const start = Math.max(
        sessionStart.getTime(),
        dayStart.getTime(),
        period?.start.getTime() ?? Number.NEGATIVE_INFINITY,
      );
      const end = Math.min(
        sessionEnd.getTime(),
        dayEnd.getTime() + 1,
        period?.end.getTime() ?? Number.POSITIVE_INFINITY,
      );
      if (end > start) {
        const commits = session.commits.filter((commit) => isWithin(commit, start, end));
        segments.push({
          sessionId: session.id,
          date: localDateKey(new Date(start)),
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          durationMinutes: (end - start) / MINUTE,
          commits,
          repositories: session.repositories,
          authors: session.authors,
        });
      }
      cursor = new Date(dayEnd.getTime() + 1);
    }
  }
  const byDate = new Map<string, DaySession[]>();
  for (const segment of segments) {
    const current = byDate.get(segment.date) ?? [];
    current.push(segment);
    byDate.set(segment.date, current);
  }
  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, daySessions]) => ({
      date,
      durationMinutes: daySessions.reduce((sum, item) => sum + item.durationMinutes, 0),
      commitCount: daySessions.reduce((sum, item) => sum + item.commits.length, 0),
      sessions: daySessions,
    }));
}

function isWithin(commit: GitCommit, start: number, end: number): boolean {
  const timestamp = new Date(commit.analysisDate).getTime();
  return timestamp >= start && timestamp < end;
}
