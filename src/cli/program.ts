import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Argument, Command } from 'commander';
import {
  loadConfig,
  localConfigPath,
  globalConfigPath,
  writeInitialConfig,
} from '../config/load.js';
import type { WorklogConfig } from '../config/schema.js';
import { resolvePeriod, resolveRange, type PeriodName } from '../domain/periods.js';
import type { AuthorFilter, Period, WorklogReport } from '../domain/types.js';
import { repositoriesFromFile, normalizeRepositories } from '../git/repositories.js';
import { analyzeWorklog } from '../commands/analyze.js';
import { serializeJson } from '../reports/json.js';
import { serializeCsv } from '../reports/csv.js';
import { formatTerminal } from '../reports/terminal.js';
import { renderHtml } from '../reports/html.js';
import { addGlobalOptions, type RawCliOptions } from './options.js';

const PERIODS: PeriodName[] = ['today', 'yesterday', 'week', 'last-week', 'month', 'last-month'];

export function createProgram(): Command {
  const program = new Command();
  program
    .name('git-worklog')
    .description('Estimate work sessions from local Git activity (approximation, not a timesheet).')
    .version('0.1.0')
    .showSuggestionAfterError()
    .showHelpAfterError('(add --help for usage information)');
  addGlobalOptions(program);

  for (const period of PERIODS) {
    program
      .command(period)
      .description(`analyze ${period.replace('-', ' ')}`)
      .action(async () => runAnalysis(program, resolveNamedPeriod(program, period), false));
  }
  program
    .command('range')
    .description('analyze an inclusive custom date range')
    .argument('<start>', 'start date (YYYY-MM-DD or ISO)')
    .argument('<end>', 'end date (YYYY-MM-DD or ISO)')
    .action(async (start: string, end: string) => {
      const options = program.opts<RawCliOptions>();
      await runAnalysis(program, resolveRange(start, end, optionalBounds(options)), false);
    });
  program
    .command('stats')
    .description('show detailed statistics for a period')
    .addArgument(new Argument('<period>', 'period to analyze').choices(PERIODS))
    .action(async (period: PeriodName) =>
      runAnalysis(program, resolveNamedPeriod(program, period), true),
    );
  program
    .command('dashboard')
    .description('generate a standalone HTML dashboard')
    .addArgument(new Argument('[period]', 'period to analyze').choices(PERIODS).default('month'))
    .action(async (period: PeriodName) => {
      const report = await buildReport(program, resolveNamedPeriod(program, period));
      const output = resolve(program.opts<RawCliOptions>().output ?? 'git-worklog-report.html');
      await writeOutput(output, renderHtml(report));
      process.stderr.write(`Dashboard créé : ${output}\n`);
    });

  const config = program.command('config').description('manage configuration');
  config
    .command('init')
    .description('create a configuration file with documented defaults')
    .option('--global', 'create the user-level configuration')
    .action(async (options: { global?: boolean }) => {
      const path = options.global === true ? globalConfigPath() : localConfigPath();
      await writeInitialConfig(path);
      process.stderr.write(`Configuration créée : ${path}\n`);
    });
  config
    .command('show')
    .description('show merged configuration and source paths')
    .action(async () => {
      const resolvedConfig = await loadConfig(
        process.cwd(),
        cliConfig(program.opts<RawCliOptions>()),
      );
      process.stdout.write(
        `${JSON.stringify(
          {
            config: resolvedConfig,
            sources: { global: globalConfigPath(), local: localConfigPath() },
          },
          null,
          2,
        )}\n`,
      );
    });

  program.action(() => program.help());
  return program;
}

async function runAnalysis(program: Command, period: Period, statsOnly: boolean): Promise<void> {
  const options = program.opts<RawCliOptions>();
  if (options.json === true && options.csv === true) {
    throw new Error('Les options --json et --csv sont mutuellement exclusives.');
  }
  const report = await buildReport(program, period);
  const content =
    options.json === true
      ? serializeJson(report)
      : options.csv === true
        ? serializeCsv(report)
        : formatTerminal(report, {
            compact: options.compact === true,
            verbose: options.verbose === true,
            color: options.color,
            ...(statsOnly ? { statsOnly: true } : {}),
          });
  if (options.output !== undefined) {
    await writeOutput(resolve(options.output), content);
    process.stderr.write(`Rapport écrit : ${resolve(options.output)}\n`);
  } else {
    process.stdout.write(content);
  }
}

async function buildReport(program: Command, period: Period): Promise<WorklogReport> {
  const options = program.opts<RawCliOptions>();
  const config = await loadConfig(process.cwd(), cliConfig(options));
  const explicitRepositories = [
    ...(options.repo ?? []),
    ...(options.reposFile === undefined
      ? []
      : await repositoriesFromFile(resolve(options.reposFile))),
  ];
  const configured = explicitRepositories.length > 0 ? explicitRepositories : config.repositories;
  const repositories = await normalizeRepositories(configured.length > 0 ? configured : ['.']);
  return analyzeWorklog({
    period,
    repositories,
    settings: {
      sessionGapMinutes: config.sessionGapMinutes,
      minimumSessionMinutes: config.minimumSessionMinutes,
      paddingBeforeMinutes: config.paddingBeforeMinutes,
      paddingAfterMinutes: config.paddingAfterMinutes,
    },
    locale: config.locale,
    dateSource: config.dateSource,
    authorFilters: config.authors,
    allAuthors: options.allAuthors === true,
  });
}

function cliConfig(options: RawCliOptions): WorklogConfig {
  const layer: WorklogConfig = {};
  if (options.sessionGap !== undefined) layer.sessionGapMinutes = options.sessionGap;
  if (options.minimumSession !== undefined) layer.minimumSessionMinutes = options.minimumSession;
  if (options.paddingBefore !== undefined) layer.paddingBeforeMinutes = options.paddingBefore;
  if (options.paddingAfter !== undefined) layer.paddingAfterMinutes = options.paddingAfter;
  if (options.locale !== undefined) layer.locale = options.locale;
  if (options.dateSource !== undefined) layer.dateSource = options.dateSource;
  const authors = authorFilters(options.author ?? [], options.email ?? []);
  if (authors.length > 0) layer.authors = authors;
  if (options.repo !== undefined && options.repo.length > 0) layer.repositories = options.repo;
  return layer;
}

function authorFilters(names: string[], emails: string[]): AuthorFilter[] {
  if (names.length === 0 && emails.length === 0) return [];
  if (names.length === 0) return [{ emails }];
  return names.map((name) => ({ name, ...(emails.length === 0 ? {} : { emails }) }));
}

function resolveNamedPeriod(program: Command, period: PeriodName): Period {
  return resolvePeriod(period, new Date(), optionalBounds(program.opts<RawCliOptions>()));
}

function optionalBounds(options: RawCliOptions): { since?: string; until?: string } {
  return {
    ...(options.since === undefined ? {} : { since: options.since }),
    ...(options.until === undefined ? {} : { until: options.until }),
  };
}

async function writeOutput(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}
