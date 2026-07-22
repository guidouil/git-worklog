import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, mergeConfigs } from '../../src/config/load.js';

const cleanup: string[] = [];
afterEach(async () => Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true }))));

describe('configuration', () => {
  it('merges CLI over local over global over defaults', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'git-worklog-config-'));
    cleanup.push(directory);
    const global = join(directory, 'global.json');
    const local = join(directory, 'local.json');
    await writeFile(global, JSON.stringify({ sessionGapMinutes: 100, locale: 'en' }));
    await writeFile(local, JSON.stringify({ sessionGapMinutes: 80, minimumSessionMinutes: 20 }));
    const config = await loadConfig(directory, { sessionGapMinutes: 60 }, { global, local });
    expect(config.sessionGapMinutes).toBe(60);
    expect(config.minimumSessionMinutes).toBe(20);
    expect(config.locale).toBe('en');
    expect(config.paddingBeforeMinutes).toBe(15);
  });

  it('uses defaults with no layers', () => {
    expect(mergeConfigs()).toMatchObject({
      sessionGapMinutes: 90,
      minimumSessionMinutes: 30,
      locale: 'fr',
      dateSource: 'author',
    });
  });
});
