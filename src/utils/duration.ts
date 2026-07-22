export function formatDuration(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

export function formatClockMinutes(value: number | null): string {
  if (value === null) return '—';
  const rounded = Math.round(value) % 1440;
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
}
