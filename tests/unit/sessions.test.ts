import { describe, expect, it } from 'vitest';
import { groupCommitsIntoSessions } from '../../src/sessions/group.js';
import { splitSessionsByDay } from '../../src/sessions/split.js';
import { commit } from '../helpers.js';

const settings = {
  sessionGapMinutes: 90,
  minimumSessionMinutes: 30,
  paddingBeforeMinutes: 15,
  paddingAfterMinutes: 15,
};

describe('session grouping', () => {
  it('keeps a gap exactly equal to the limit in one session', () => {
    const sessions = groupCommitsIntoSessions(
      [commit(new Date('2026-07-20T08:00:00Z')), commit(new Date('2026-07-20T09:30:00Z'))],
      settings,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.durationMinutes).toBe(120);
  });

  it('starts a session beyond the limit', () => {
    const sessions = groupCommitsIntoSessions(
      [commit(new Date('2026-07-20T08:00:00Z')), commit(new Date('2026-07-20T09:31:00Z'))],
      settings,
    );
    expect(sessions).toHaveLength(2);
  });

  it('gives a single commit the minimum duration and applies padding', () => {
    const single = groupCommitsIntoSessions(
      [commit(new Date('2026-07-20T08:00:00Z'))],
      settings,
    )[0];
    expect(single?.durationMinutes).toBe(30);
    expect(single?.start).toBe('2026-07-20T07:45:00.000Z');
    expect(single?.end).toBe('2026-07-20T08:15:00.000Z');
  });

  it('expands a singleton symmetrically when minimum exceeds padding', () => {
    const single = groupCommitsIntoSessions([commit(new Date('2026-07-20T08:00:00Z'))], {
      ...settings,
      minimumSessionMinutes: 60,
      paddingBeforeMinutes: 5,
      paddingAfterMinutes: 5,
    })[0];
    expect(single?.durationMinutes).toBe(60);
    expect(single?.start).toBe('2026-07-20T07:30:00.000Z');
  });

  it('merges commits from several repositories into one timeline', () => {
    const sessions = groupCommitsIntoSessions(
      [
        commit(new Date('2026-07-20T08:00:00Z')),
        commit(new Date('2026-07-20T08:30:00Z'), { repositoryName: 'project-b' }),
      ],
      settings,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.repositories).toEqual(['project-a', 'project-b']);
    expect(sessions[0]?.durationMinutes).toBe(60);
  });

  it('prevents padded sessions from overlapping', () => {
    const sessions = groupCommitsIntoSessions(
      [commit(new Date('2026-07-20T08:00:00Z')), commit(new Date('2026-07-20T08:11:00Z'))],
      { ...settings, sessionGapMinutes: 10, paddingBeforeMinutes: 20, paddingAfterMinutes: 20 },
    );
    expect(sessions).toHaveLength(2);
    expect(new Date(sessions[0]?.end ?? 0).getTime()).toBeLessThanOrEqual(
      new Date(sessions[1]?.start ?? 0).getTime(),
    );
  });

  it('splits a session crossing local midnight without losing time', () => {
    const first = new Date(2026, 6, 20, 23, 50);
    const second = new Date(2026, 6, 21, 0, 10);
    const sessions = groupCommitsIntoSessions([commit(first), commit(second)], settings);
    const days = splitSessionsByDay(sessions);
    expect(days).toHaveLength(2);
    expect(days.reduce((sum, day) => sum + day.durationMinutes, 0)).toBeCloseTo(50, 5);
    expect(days.map((day) => day.commitCount)).toEqual([1, 1]);
  });
});
