import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DEFAULT_ESTIMATION_SETTINGS, DEFAULT_LOCALE } from './defaults.js';
import type { ResolvedConfig, WorklogConfig } from './schema.js';

export function globalConfigPath(environment = process.env): string {
  if (platform() === 'win32' && environment.APPDATA !== undefined) {
    return join(environment.APPDATA, 'git-worklog', 'config.json');
  }
  const base = environment.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  return join(base, 'git-worklog', 'config.json');
}

export function localConfigPath(cwd = process.cwd()): string {
  return join(cwd, '.git-worklog.json');
}

export async function loadConfig(
  cwd = process.cwd(),
  cli: WorklogConfig = {},
  paths: { global?: string; local?: string } = {},
): Promise<ResolvedConfig> {
  const global = await readOptionalConfig(paths.global ?? globalConfigPath());
  const local = await readOptionalConfig(paths.local ?? localConfigPath(cwd));
  return mergeConfigs(global, local, cli);
}

export function mergeConfigs(...layers: WorklogConfig[]): ResolvedConfig {
  const merged = layers.reduce<WorklogConfig>((result, layer) => ({ ...result, ...layer }), {});
  return {
    sessionGapMinutes: merged.sessionGapMinutes ?? DEFAULT_ESTIMATION_SETTINGS.sessionGapMinutes,
    minimumSessionMinutes:
      merged.minimumSessionMinutes ?? DEFAULT_ESTIMATION_SETTINGS.minimumSessionMinutes,
    paddingBeforeMinutes:
      merged.paddingBeforeMinutes ?? DEFAULT_ESTIMATION_SETTINGS.paddingBeforeMinutes,
    paddingAfterMinutes:
      merged.paddingAfterMinutes ?? DEFAULT_ESTIMATION_SETTINGS.paddingAfterMinutes,
    locale: merged.locale ?? DEFAULT_LOCALE,
    dateSource: merged.dateSource ?? 'author',
    authors: merged.authors ?? [],
    repositories: merged.repositories ?? [],
  };
}

export async function readOptionalConfig(path: string): Promise<WorklogConfig> {
  try {
    await access(path, constants.R_OK);
  } catch {
    return {};
  }
  try {
    const value: unknown = JSON.parse(await readFile(path, 'utf8'));
    return validateConfig(value, path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Impossible de lire la configuration ${path} : ${message}`);
  }
}

export async function writeInitialConfig(path = localConfigPath()): Promise<void> {
  try {
    await access(path, constants.F_OK);
    throw new Error(`Le fichier ${path} existe déjà.`);
  } catch (error) {
    if (error instanceof Error && error.message.endsWith('existe déjà.')) throw error;
  }
  const config: ResolvedConfig = mergeConfigs();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function validateConfig(value: unknown, path: string): WorklogConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Le fichier ${path} doit contenir un objet JSON.`);
  }
  const config = value as WorklogConfig;
  for (const key of [
    'sessionGapMinutes',
    'minimumSessionMinutes',
    'paddingBeforeMinutes',
    'paddingAfterMinutes',
  ] as const) {
    const setting = config[key];
    if (setting !== undefined && (typeof setting !== 'number' || setting < 0)) {
      throw new Error(`La propriété ${key} doit être un nombre positif ou nul.`);
    }
  }
  if (config.locale !== undefined && !['fr', 'en'].includes(config.locale)) {
    throw new Error('La propriété locale doit valoir "fr" ou "en".');
  }
  if (config.dateSource !== undefined && !['author', 'commit'].includes(config.dateSource)) {
    throw new Error('La propriété dateSource doit valoir "author" ou "commit".');
  }
  if (config.repositories !== undefined && !Array.isArray(config.repositories)) {
    throw new Error('La propriété repositories doit être un tableau.');
  }
  if (config.authors !== undefined && !Array.isArray(config.authors)) {
    throw new Error('La propriété authors doit être un tableau.');
  }
  return config;
}

export function normalizeConfiguredPaths(paths: string[], cwd = process.cwd()): string[] {
  return [...new Set(paths.map((path) => resolve(cwd, path)))];
}
