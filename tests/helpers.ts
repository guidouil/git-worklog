import type { GitCommit } from '../src/domain/types.js';

export function commit(date: Date, overrides: Partial<GitCommit> = {}): GitCommit {
  const iso = date.toISOString();
  return {
    hash: 'a'.repeat(40),
    shortHash: 'aaaaaaa',
    authorDate: iso,
    commitDate: iso,
    authorName: 'Guillaume',
    authorEmail: 'gui@example.com',
    subject: 'Test commit',
    repositoryName: 'project-a',
    repositoryPath: '/tmp/project-a',
    analysisDate: iso,
    ...overrides,
  };
}
