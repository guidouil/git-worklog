import type { AuthorFilter, DateSource, Locale } from '../domain/types.js';

export interface WorklogConfig {
  sessionGapMinutes?: number;
  minimumSessionMinutes?: number;
  paddingBeforeMinutes?: number;
  paddingAfterMinutes?: number;
  locale?: Locale;
  dateSource?: DateSource;
  authors?: AuthorFilter[];
  repositories?: string[];
}

export interface ResolvedConfig {
  sessionGapMinutes: number;
  minimumSessionMinutes: number;
  paddingBeforeMinutes: number;
  paddingAfterMinutes: number;
  locale: Locale;
  dateSource: DateSource;
  authors: AuthorFilter[];
  repositories: string[];
}
