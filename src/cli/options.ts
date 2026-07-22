import { InvalidArgumentError, Option, type Command } from 'commander';
import type { DateSource, Locale } from '../domain/types.js';

export interface RawCliOptions {
  author?: string[];
  email?: string[];
  allAuthors?: boolean;
  sessionGap?: number;
  minimumSession?: number;
  paddingBefore?: number;
  paddingAfter?: number;
  since?: string;
  until?: string;
  repo?: string[];
  reposFile?: string;
  compact?: boolean;
  verbose?: boolean;
  color: boolean;
  locale?: Locale;
  json?: boolean;
  csv?: boolean;
  output?: string;
  debug?: boolean;
  dateSource?: DateSource;
}

export function addGlobalOptions(program: Command): void {
  program
    .option('--author <name>', 'filter by author name (repeatable)', collect, [])
    .option('--email <email>', 'filter by exact author email (repeatable)', collect, [])
    .option('--all-authors', 'include every author')
    .option('--session-gap <minutes>', 'maximum gap within a session', parseMinutes)
    .option('--minimum-session <minutes>', 'minimum session duration', parseMinutes)
    .option('--padding-before <minutes>', 'minutes before the first commit', parseMinutes)
    .option('--padding-after <minutes>', 'minutes after the last commit', parseMinutes)
    .option('--since <date>', 'override the start of the selected period')
    .option('--until <date>', 'override the end of the selected period')
    .option('--repo <path>', 'repository to analyze (repeatable)', collect, [])
    .option('--repos-file <path>', 'JSON file containing repositories')
    .option('--compact', 'one line per active day')
    .option('--verbose', 'show commits inside sessions')
    .option('--no-color', 'disable terminal colors')
    .addOption(new Option('--locale <locale>', 'output language').choices(['fr', 'en']))
    .addOption(
      new Option('--date-source <source>', 'date used for analysis')
        .choices(['author', 'commit'])
        .default(undefined),
    )
    .option('--json', 'export complete JSON')
    .option('--csv', 'export one CSV row per daily session segment')
    .option('--output <file>', 'write export or dashboard to a file')
    .option('--debug', 'show detailed technical errors');
}

function parseMinutes(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new InvalidArgumentError('expected a positive number or zero');
  }
  return parsed;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}
