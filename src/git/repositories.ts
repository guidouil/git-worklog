import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { resolveRepository } from './client.js';

export async function repositoriesFromFile(path: string): Promise<string[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('repositories' in parsed) ||
      !Array.isArray(parsed.repositories) ||
      !parsed.repositories.every((item) => typeof item === 'string')
    ) {
      throw new Error('la propriété "repositories" doit être un tableau de chemins');
    }
    return parsed.repositories.map((item) => resolve(dirname(path), item));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Impossible de lire ${path} : ${message}.`);
  }
}

export async function normalizeRepositories(paths: string[]): Promise<string[]> {
  const resolved = await Promise.all(paths.map((path) => resolveRepository(resolve(path))));
  return [...new Set(resolved)];
}
