import { basename } from 'node:path';
import { execa } from 'execa';
import type { DateSource, GitCommit, Period } from '../domain/types.js';

export class GitCommandError extends Error {
  public constructor(
    message: string,
    public readonly technical?: string,
  ) {
    super(message);
    this.name = 'GitCommandError';
  }
}

export async function resolveRepository(path: string): Promise<string> {
  try {
    const result = await execa('git', ['rev-parse', '--show-toplevel'], { cwd: path });
    return result.stdout.trim();
  } catch (error) {
    throw new GitCommandError(
      `« ${path} » n’est pas un dépôt Git accessible. Utilisez --repo avec un chemin valide.`,
      technicalMessage(error),
    );
  }
}

export async function readGitLog(
  repositoryPath: string,
  period: Period,
  dateSource: DateSource,
): Promise<GitCommit[]> {
  const dateField = dateSource === 'author' ? '%aI' : '%cI';
  const format = `%H%x00%h%x00%aI%x00%cI%x00%an%x00%ae%x00%s%x00${dateField}`;
  try {
    const result = await execa('git', ['log', '--all', '-z', `--format=${format}`], {
      cwd: repositoryPath,
    });
    if (result.stdout.length === 0) return [];
    const fields = result.stdout.split('\0');
    if (fields.at(-1) === '') fields.pop();
    if (fields.length % 8 !== 0) {
      throw new Error(`sortie inattendue (${fields.length} champs)`);
    }
    const commits: GitCommit[] = [];
    for (let index = 0; index < fields.length; index += 8) {
      commits.push({
        hash: fields[index] ?? '',
        shortHash: fields[index + 1] ?? '',
        authorDate: fields[index + 2] ?? '',
        commitDate: fields[index + 3] ?? '',
        authorName: fields[index + 4] ?? '',
        authorEmail: fields[index + 5] ?? '',
        subject: fields[index + 6] ?? '',
        repositoryName: basename(repositoryPath),
        repositoryPath,
        analysisDate: fields[index + 7] ?? '',
      });
    }
    return commits.filter((commit) => {
      const timestamp = new Date(commit.analysisDate).getTime();
      return timestamp >= period.start.getTime() && timestamp <= period.end.getTime();
    });
  } catch (error) {
    if (error instanceof GitCommandError) throw error;
    throw new GitCommandError(
      `Impossible de lire l’historique Git de « ${repositoryPath} ».`,
      technicalMessage(error),
    );
  }
}

export async function readGitIdentity(
  repositoryPath: string,
): Promise<{ name?: string; email?: string }> {
  const [name, email] = await Promise.all([
    readConfigValue(repositoryPath, 'user.name'),
    readConfigValue(repositoryPath, 'user.email'),
  ]);
  return {
    ...(name === undefined ? {} : { name }),
    ...(email === undefined ? {} : { email }),
  };
}

async function readConfigValue(repositoryPath: string, key: string): Promise<string | undefined> {
  try {
    const result = await execa('git', ['config', '--get', key], { cwd: repositoryPath });
    return result.stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

function technicalMessage(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}
