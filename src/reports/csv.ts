import type { WorklogReport } from '../domain/types.js';

const COLUMNS = [
  'date',
  'start',
  'end',
  'durationMinutes',
  'commitCount',
  'repositories',
  'authors',
  'firstCommit',
  'lastCommit',
];

export function serializeCsv(report: WorklogReport): string {
  const rows = report.days.flatMap((day) =>
    day.sessions.map((session) => {
      const hashes = session.commits.map((commit) => commit.shortHash);
      return [
        day.date,
        session.start,
        session.end,
        String(Math.round(session.durationMinutes)),
        String(session.commits.length),
        session.repositories.join(', '),
        session.authors.join(', '),
        hashes[0] ?? '',
        hashes.at(-1) ?? '',
      ];
    }),
  );
  return `${[COLUMNS, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')}\n`;
}

function escapeCsv(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
