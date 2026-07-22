import { describe, expect, it } from 'vitest';
import { calculateStats } from '../../src/reports/stats.js';
import { serializeCsv } from '../../src/reports/csv.js';
import { serializeJson } from '../../src/reports/json.js';
import { groupCommitsIntoSessions } from '../../src/sessions/group.js';
import { splitSessionsByDay } from '../../src/sessions/split.js';
import type { WorklogReport } from '../../src/domain/types.js';
import { commit } from '../helpers.js';

function report(): WorklogReport {
  const commits = [
    commit(new Date(2026, 6, 20, 9), { subject: 'One, two' }),
    commit(new Date(2026, 6, 20, 10), { repositoryName: 'project-b', shortHash: 'bbbbbbb' }),
  ];
  const settings = {
    sessionGapMinutes: 90,
    minimumSessionMinutes: 30,
    paddingBeforeMinutes: 15,
    paddingAfterMinutes: 15,
  };
  const sessions = groupCommitsIntoSessions(commits, settings);
  const days = splitSessionsByDay(sessions);
  return {
    metadata: {
      generatedAt: '2026-07-22T00:00:00.000Z',
      periodKey: 'month',
      periodStart: new Date(2026, 6, 1).toISOString(),
      periodEnd: new Date(2026, 7, 0, 23, 59, 59).toISOString(),
      dateSource: 'author',
      approximate: true,
      locale: 'fr',
    },
    settings,
    repositories: [],
    authorFilters: [],
    commits,
    sessions,
    days,
    stats: calculateStats(commits, sessions, days),
  };
}

describe('statistics and serialization', () => {
  it('calculates totals, averages and distributions', () => {
    const stats = report().stats;
    expect(stats.totalMinutes).toBe(90);
    expect(stats.activeDays).toBe(1);
    expect(stats.sessionCount).toBe(1);
    expect(stats.commitCount).toBe(2);
    expect(stats.averageFirstCommitMinutes).toBe(9 * 60);
    expect(stats.averageLastCommitMinutes).toBe(10 * 60);
    expect(stats.byRepository.map((item) => item.commits)).toEqual([1, 1]);
    expect(stats.commitsByHour[9]).toBe(1);
  });

  it('serializes a complete JSON report', () => {
    const parsed = JSON.parse(serializeJson(report())) as WorklogReport;
    expect(parsed.metadata.approximate).toBe(true);
    expect(parsed.commits).toHaveLength(2);
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.stats.totalMinutes).toBe(90);
  });

  it('writes spreadsheet-oriented CSV with required columns', () => {
    const csv = serializeCsv(report());
    expect(csv.split('\n')[0]).toBe(
      'date,start,end,durationMinutes,commitCount,repositories,authors,firstCommit,lastCommit',
    );
    expect(csv).toContain('project-a, project-b');
    expect(csv).toContain('aaaaaaa');
    expect(csv).toContain('bbbbbbb');
  });
});
