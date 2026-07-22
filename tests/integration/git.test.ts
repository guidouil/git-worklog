import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execa } from 'execa';
import { afterEach, describe, expect, it } from 'vitest';
import { readGitIdentity, readGitLog, resolveRepository } from '../../src/git/client.js';

const cleanup: string[] = [];
afterEach(async () => Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true }))));

describe('Git integration', () => {
  it('reads machine-formatted commits and identity from an isolated repository', async () => {
    const repository = await createRepository();
    await writeFile(join(repository, 'file with spaces.txt'), 'hello');
    await execa('git', ['add', 'file with spaces.txt'], { cwd: repository });
    await execa('git', ['commit', '-m', 'Initial, local commit'], {
      cwd: repository,
      env: {
        GIT_AUTHOR_DATE: '2026-06-10T09:15:00+02:00',
        GIT_COMMITTER_DATE: '2026-06-10T09:20:00+02:00',
      },
    });
    await writeFile(join(repository, 'second.txt'), 'different dates');
    await execa('git', ['add', 'second.txt'], { cwd: repository });
    await execa('git', ['commit', '-m', 'Divergent author date'], {
      cwd: repository,
      env: {
        GIT_AUTHOR_DATE: '2026-06-11T09:15:00+02:00',
        GIT_COMMITTER_DATE: '2026-07-10T09:20:00+02:00',
      },
    });
    const commits = await readGitLog(
      repository,
      {
        key: 'range',
        start: new Date('2026-06-01T00:00:00Z'),
        end: new Date('2026-07-01T00:00:00Z'),
      },
      'author',
    );
    expect(commits).toHaveLength(2);
    expect(commits.find((commit) => commit.subject === 'Initial, local commit')).toMatchObject({
      authorName: 'Test User',
      authorEmail: 'test@example.com',
      subject: 'Initial, local commit',
      analysisDate: '2026-06-10T09:15:00+02:00',
    });
    const byCommitDate = await readGitLog(
      repository,
      {
        key: 'range',
        start: new Date('2026-06-01T00:00:00Z'),
        end: new Date('2026-07-01T00:00:00Z'),
      },
      'commit',
    );
    expect(byCommitDate).toHaveLength(1);
    expect((await readGitIdentity(repository)).email).toBe('test@example.com');
    expect(await resolveRepository(join(repository, '.'))).toBe(await realpath(repository));
  });

  it('returns an empty list for a repository without commits', async () => {
    const repository = await createRepository();
    const commits = await readGitLog(
      repository,
      { key: 'today', start: new Date(0), end: new Date() },
      'author',
    );
    expect(commits).toEqual([]);
  });
});

async function createRepository(): Promise<string> {
  const repository = await mkdtemp(join(tmpdir(), 'git-worklog-repo-'));
  cleanup.push(repository);
  await execa('git', ['init', '--quiet'], { cwd: repository });
  await execa('git', ['config', 'user.name', 'Test User'], { cwd: repository });
  await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: repository });
  return repository;
}
