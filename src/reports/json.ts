import type { WorklogReport } from '../domain/types.js';

export function serializeJson(report: WorklogReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
