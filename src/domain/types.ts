export type Locale = 'fr' | 'en';
export type DateSource = 'author' | 'commit';

export interface GitCommit {
  hash: string;
  shortHash: string;
  authorDate: string;
  commitDate: string;
  authorName: string;
  authorEmail: string;
  subject: string;
  repositoryName: string;
  repositoryPath: string;
  analysisDate: string;
}

export interface AuthorFilter {
  name?: string;
  emails?: string[];
}

export interface EstimationSettings {
  sessionGapMinutes: number;
  minimumSessionMinutes: number;
  paddingBeforeMinutes: number;
  paddingAfterMinutes: number;
}

export interface WorkSession {
  id: string;
  start: string;
  end: string;
  durationMinutes: number;
  commits: GitCommit[];
  repositories: string[];
  authors: string[];
}

export interface DaySession {
  sessionId: string;
  date: string;
  start: string;
  end: string;
  durationMinutes: number;
  commits: GitCommit[];
  repositories: string[];
  authors: string[];
}

export interface DayReport {
  date: string;
  durationMinutes: number;
  commitCount: number;
  sessions: DaySession[];
}

export interface Period {
  key: string;
  start: Date;
  end: Date;
}

export interface DistributionItem {
  key: string;
  commits: number;
  durationMinutes: number;
}

export interface WorklogStats {
  totalMinutes: number;
  activeDays: number;
  sessionCount: number;
  commitCount: number;
  averageDailyMinutes: number;
  averageSessionMinutes: number;
  averageFirstCommitMinutes: number | null;
  averageLastCommitMinutes: number | null;
  byRepository: DistributionItem[];
  byWeekday: DistributionItem[];
  commitsByHour: number[];
}

export interface WorklogReport {
  metadata: {
    generatedAt: string;
    periodKey: string;
    periodStart: string;
    periodEnd: string;
    dateSource: DateSource;
    approximate: true;
    locale: Locale;
  };
  settings: EstimationSettings;
  repositories: { name: string; path: string }[];
  authorFilters: AuthorFilter[];
  commits: GitCommit[];
  sessions: WorkSession[];
  days: DayReport[];
  stats: WorklogStats;
}
