import type { EstimationSettings, GitCommit, WorkSession } from '../domain/types.js';

const MINUTE = 60_000;

export function groupCommitsIntoSessions(
  input: GitCommit[],
  settings: EstimationSettings,
): WorkSession[] {
  validateSettings(settings);
  if (input.length === 0) return [];
  const commits = [...input].sort(
    (left, right) => new Date(left.analysisDate).getTime() - new Date(right.analysisDate).getTime(),
  );
  const groups: GitCommit[][] = [];
  let current: GitCommit[] = [];
  for (const commit of commits) {
    const previous = current.at(-1);
    if (
      previous !== undefined &&
      new Date(commit.analysisDate).getTime() - new Date(previous.analysisDate).getTime() >
        settings.sessionGapMinutes * MINUTE
    ) {
      groups.push(current);
      current = [];
    }
    current.push(commit);
  }
  groups.push(current);

  const bounds = groups.map((group) => initialBounds(group, settings));
  for (let index = 0; index < bounds.length - 1; index += 1) {
    const left = bounds[index];
    const right = bounds[index + 1];
    if (left === undefined || right === undefined || left.end <= right.start) continue;
    const midpoint = left.lastCommit + (right.firstCommit - left.lastCommit) / 2;
    left.end = Math.max(left.start, midpoint);
    right.start = Math.min(right.end, midpoint);
  }

  return bounds.map((bound, index) => {
    const group = groups[index] ?? [];
    return {
      id: `session-${index + 1}`,
      start: new Date(bound.start).toISOString(),
      end: new Date(bound.end).toISOString(),
      durationMinutes: Math.max(0, (bound.end - bound.start) / MINUTE),
      commits: group,
      repositories: unique(group.map((commit) => commit.repositoryName)),
      authors: unique(group.map((commit) => `${commit.authorName} <${commit.authorEmail}>`)),
    };
  });
}

function initialBounds(commits: GitCommit[], settings: EstimationSettings) {
  const firstCommit = new Date(commits[0]?.analysisDate ?? 0).getTime();
  const lastCommit = new Date(commits.at(-1)?.analysisDate ?? 0).getTime();
  let start = firstCommit - settings.paddingBeforeMinutes * MINUTE;
  let end = lastCommit + settings.paddingAfterMinutes * MINUTE;
  const minimum = settings.minimumSessionMinutes * MINUTE;
  if (end - start < minimum) {
    const missing = minimum - (end - start);
    start -= missing / 2;
    end += missing / 2;
  }
  return { start, end, firstCommit, lastCommit };
}

function validateSettings(settings: EstimationSettings): void {
  for (const [key, value] of Object.entries(settings)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Le paramètre ${key} doit être un nombre positif ou nul.`);
    }
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
