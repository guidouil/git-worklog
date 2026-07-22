# git-worklog

[Documentation française](README.fr.md)

`git-worklog` is a local CLI that analyzes Git history and estimates a developer’s work sessions. It merges nearby commits into sessions, including commits from several repositories, and produces terminal, JSON, CSV, and standalone HTML reports.

> Results are **estimates based on Git activity**, never an exact record of working time.

## Installation

Node.js 22 or 24 and Git are required.

```bash
npm install -g git-worklog
git-worklog --version
```

From source:

```bash
npm install
npm run dev -- month
npm run build
node dist/cli.js month
```

## Commands

```bash
git-worklog today
git-worklog yesterday
git-worklog week
git-worklog last-week
git-worklog month
git-worklog last-month
git-worklog range 2026-06-01 2026-06-30
git-worklog stats month
git-worklog dashboard
git-worklog config init
git-worklog config show
```

Weeks start on Monday. `week`, `last-week`, `month`, and `last-month` are civil periods calculated in the user’s local time zone. Both boundary days of `range` are included in full.

### Main options

```text
--author <name>             filter by author name (repeatable)
--email <email>             filter by exact author email (repeatable)
--all-authors               include every author
--repo <path>               repository to analyze (repeatable)
--repos-file <file>         JSON repository list
--since <date>              override the period start
--until <date>              override the period end
--date-source author|commit
--session-gap <minutes>
--minimum-session <minutes>
--padding-before <minutes>
--padding-after <minutes>
--compact
--verbose
--no-color
--locale fr|en
--json
--csv
--output <file>
--debug
```

Dates accept `YYYY-MM-DD` and ISO date-time values such as `2026-07-01T09:00:00`. Without an explicit author filter, the current Git identity is detected from `git config user.name` and `git config user.email`. If it is unavailable, the CLI explains how to use `--author`, `--email`, or `--all-authors`.

French is the default report language and English is fully supported through `--locale en`. If the Node runtime does not include French `Intl`/ICU locale data, report rendering automatically falls back to English rather than failing.

## Estimation method

Commits are sorted on one shared timeline using the author date by default (or the commit date with `--date-source commit`). By default:

- a gap of 90 minutes or less keeps commits in the same session;
- a larger gap starts a new session;
- 15 minutes are added before the first commit and after the last commit;
- a session lasts at least 30 minutes;
- padding is clipped at the midpoint if two sessions would overlap;
- sessions crossing midnight are split between local calendar days without double-counting.

Every setting is configurable. Time from a multi-repository session is counted once.

## Example

```text
Git Worklog — July 20, 2026 → July 26, 2026
Approximate estimate based on Git activity.

Monday, July 20
09:12 → 12:01  2h49  6 commits   project-a
13:41 → 17:58  4h17  11 commits  project-a, project-b
                 Total  7h06

Period total: 7h06
Active days: 1
Sessions: 2
Commits: 17
Daily average: 7h06
Average session duration: 3h33
Average first commit: 09:12
Average last commit: 17:43
```

`--verbose` lists the commits within each session. `--compact` prints one line per active day. `git-worklog stats month` focuses on global statistics: totals, days, sessions, daily and session averages, average first and last commit times, repositories, weekdays, and activity hours. Detailed hourly and weekday distributions are also available in JSON and the dashboard.

## Multiple repositories

```bash
git-worklog month --repo .
git-worklog month --repo ../project-a --repo "../project with spaces"
git-worklog month --repos-file repos.json
```

`repos.json` format:

```json
{
  "repositories": ["/Users/gui/projects/project-a", "../project-b"]
}
```

Paths in the file are resolved relative to that file, normalized through Git, and deduplicated. Repositories with no commits are accepted. A path that is not a Git repository produces a clear error.

## Exports

```bash
git-worklog month --json
git-worklog month --json --output worklog.json
git-worklog month --csv --output sessions.csv
```

Without `--output`, exports are written to stdout. With `--output`, only a concise confirmation is written to stderr. JSON includes the period, settings, repositories, filtered authors, commits, sessions, days, and statistics. CSV provides one row per daily session segment for spreadsheet use:

```text
date,start,end,durationMinutes,commitCount,repositories,authors,firstCommit,lastCommit
```

## HTML dashboard

```bash
git-worklog dashboard
git-worklog dashboard last-month --output report.html
```

The dashboard is a standalone responsive HTML file with a summary, daily table, session timeline, repository breakdown, activity by day and hour, and estimation settings. It uses no CDN or network resource and follows `prefers-color-scheme`.

## Configuration

`git-worklog config init` creates `.git-worklog.json`. `git-worklog config init --global` creates a user-level configuration in `$XDG_CONFIG_HOME/git-worklog/config.json` (or `~/.config/git-worklog/config.json`, and `%APPDATA%` on Windows). `config show` prints the merged configuration and source paths.

```json
{
  "sessionGapMinutes": 90,
  "minimumSessionMinutes": 30,
  "paddingBeforeMinutes": 15,
  "paddingAfterMinutes": 15,
  "locale": "fr",
  "dateSource": "author",
  "authors": [
    {
      "name": "Guillaume",
      "emails": ["gui@example.com"]
    }
  ],
  "repositories": ["/Users/gui/projects/project-a"]
}
```

Precedence is: CLI options, local configuration, global configuration, then defaults. A list defined by a higher-precedence layer replaces the previous list.

## Privacy and security

`git-worklog` operates entirely locally:

- it sends no data;
- it contains no telemetry;
- it requires no remote service;
- it does not modify repositories;
- it only runs non-destructive Git commands: `rev-parse`, `config`, and `log`.

## Limitations

Git cannot reveal:

- time spent before the first commit;
- uncommitted work;
- actual breaks;
- meetings;
- research and reading;
- work done in another tool.

Irregular, backdated, imported, or rewritten commits can also distort the estimate. Use the results to reconstruct personal activity trends, not for unverified surveillance or billing.

## Development

```bash
npm run dev -- week
npm run test
npm run test:watch
npm run lint
npm run format
npm run typecheck
npm run check
```

`npm run check` runs formatting, ESLint, TypeScript, Vitest, and the build. The project is released under the MIT License.
