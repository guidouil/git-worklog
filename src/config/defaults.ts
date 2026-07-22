import type { EstimationSettings, Locale } from '../domain/types.js';

export const DEFAULT_ESTIMATION_SETTINGS: EstimationSettings = {
  sessionGapMinutes: 90,
  minimumSessionMinutes: 30,
  paddingBeforeMinutes: 15,
  paddingAfterMinutes: 15,
};

export const DEFAULT_LOCALE: Locale = 'fr';
