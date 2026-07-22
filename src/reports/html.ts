import type { DistributionItem, WorklogReport } from '../domain/types.js';
import { formatDuration } from '../utils/duration.js';

export function renderHtml(report: WorklogReport): string {
  const locale = report.metadata.locale;
  const days = report.days;
  const maxDay = Math.max(1, ...days.map((day) => day.durationMinutes));
  const maxHour = Math.max(1, ...report.stats.commitsByHour);
  const period = `${formatDate(report.metadata.periodStart, locale)} — ${formatDate(report.metadata.periodEnd, locale)}`;
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Git Worklog — ${escapeHtml(period)}</title>
  <style>
    :root{color-scheme:light dark;--bg:#f5f7fb;--card:#fff;--text:#18212f;--muted:#657187;--line:#dfe5ee;--accent:#6657d9;--accent2:#19a78b}
    @media(prefers-color-scheme:dark){:root{--bg:#11151d;--card:#1a202b;--text:#edf1f7;--muted:#9ca8ba;--line:#313b49;--accent:#998cff;--accent2:#39cfad}}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,sans-serif}main{max-width:1120px;margin:auto;padding:42px 20px 64px}h1{margin:0;font-size:clamp(2rem,6vw,3.5rem);letter-spacing:-.04em}h2{font-size:1.1rem;margin:0 0 16px}.eyebrow{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.08em}.muted{color:var(--muted)}.notice{margin:18px 0 28px;padding:12px 16px;border-left:3px solid var(--accent);background:var(--card);border-radius:6px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 8px 30px #00000008}.metric strong{display:block;font-size:2rem;letter-spacing:-.04em}.wide{grid-column:span 2;margin-top:14px}.full{grid-column:1/-1;margin-top:14px}table{width:100%;border-collapse:collapse}th,td{padding:10px;text-align:left;border-bottom:1px solid var(--line)}th{color:var(--muted);font-size:.78rem;text-transform:uppercase}.bars{display:flex;align-items:end;height:180px;gap:6px;border-bottom:1px solid var(--line)}.bar{background:linear-gradient(var(--accent),var(--accent2));min-height:2px;flex:1;border-radius:5px 5px 0 0;position:relative}.bar:hover:after{content:attr(data-label);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:var(--text);color:var(--card);white-space:nowrap;padding:4px 7px;border-radius:5px;font-size:.72rem}.labels{display:flex;gap:6px;color:var(--muted);font-size:.65rem}.labels span{flex:1;text-align:center}.repo{display:grid;grid-template-columns:120px 1fr 65px;gap:10px;align-items:center;margin:10px 0}.track{height:9px;background:var(--line);border-radius:9px;overflow:hidden}.fill{height:100%;background:var(--accent);border-radius:9px}.settings{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.settings div{padding:12px;background:var(--bg);border-radius:10px}.settings strong{display:block}@media(max-width:760px){.grid{grid-template-columns:1fr 1fr}.wide{grid-column:1/-1}.settings{grid-template-columns:1fr 1fr}.scroll{overflow:auto}}@media(max-width:440px){.grid{grid-template-columns:1fr}.full,.wide{grid-column:1}.settings{grid-template-columns:1fr}}
  </style>
</head>
<body><main>
  <div class="eyebrow">Git Worklog · 0.1.0</div>
  <h1>${escapeHtml(period)}</h1>
  <p class="notice">${locale === 'fr' ? 'Estimation approximative fondée sur l’activité Git — ce rapport n’est pas un relevé exact du temps de travail.' : 'Approximate estimate based on Git activity — this report is not an exact time record.'}</p>
  <section class="grid">
    ${metric(locale === 'fr' ? 'Temps estimé' : 'Estimated time', formatDuration(report.stats.totalMinutes))}
    ${metric(locale === 'fr' ? 'Jours actifs' : 'Active days', String(report.stats.activeDays))}
    ${metric('Sessions', String(report.stats.sessionCount))}
    ${metric('Commits', String(report.stats.commitCount))}
    <article class="card wide"><h2>${locale === 'fr' ? 'Activité par jour' : 'Activity by day'}</h2>${barChart(
      days.map((day) => ({
        label: day.date.slice(5),
        value: day.durationMinutes,
        display: formatDuration(day.durationMinutes),
      })),
      maxDay,
    )}</article>
    <article class="card wide"><h2>${locale === 'fr' ? 'Commits par heure' : 'Commits by hour'}</h2>${barChart(
      report.stats.commitsByHour.map((value, hour) => ({
        label: String(hour).padStart(2, '0'),
        value,
        display: String(value),
      })),
      maxHour,
      true,
    )}</article>
    <article class="card wide"><h2>${locale === 'fr' ? 'Répartition par dépôt' : 'By repository'}</h2>${repositoryBars(report.stats.byRepository)}</article>
    <article class="card wide scroll"><h2>${locale === 'fr' ? 'Chronologie des sessions' : 'Session timeline'}</h2>${sessionTable(report)}</article>
    <article class="card full scroll"><h2>${locale === 'fr' ? 'Tableau journalier' : 'Daily table'}</h2>${dayTable(report)}</article>
    <article class="card full"><h2>${locale === 'fr' ? 'Paramètres d’estimation' : 'Estimation settings'}</h2><div class="settings">
      ${setting(locale === 'fr' ? 'Écart maximal' : 'Maximum gap', report.settings.sessionGapMinutes)}
      ${setting(locale === 'fr' ? 'Session minimale' : 'Minimum session', report.settings.minimumSessionMinutes)}
      ${setting(locale === 'fr' ? 'Marge avant' : 'Padding before', report.settings.paddingBeforeMinutes)}
      ${setting(locale === 'fr' ? 'Marge après' : 'Padding after', report.settings.paddingAfterMinutes)}
    </div></article>
  </section>
  <p class="muted">${locale === 'fr' ? 'Généré localement, sans télémétrie ni transfert de données.' : 'Generated locally, without telemetry or data transfer.'}</p>
</main></body></html>\n`;
}

function metric(label: string, value: string): string {
  return `<article class="card metric"><span class="muted">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function barChart(
  values: { label: string; value: number; display: string }[],
  maximum: number,
  sparseLabels = false,
): string {
  const bars = values
    .map(
      (item) =>
        `<div class="bar" style="height:${Math.max(1, (item.value / maximum) * 100)}%" data-label="${escapeHtml(`${item.label}: ${item.display}`)}"></div>`,
    )
    .join('');
  const labels = values
    .map(
      (item, index) =>
        `<span>${sparseLabels && index % 3 !== 0 ? '' : escapeHtml(item.label)}</span>`,
    )
    .join('');
  return `<div class="bars">${bars}</div><div class="labels">${labels}</div>`;
}

function repositoryBars(items: DistributionItem[]): string {
  const max = Math.max(1, ...items.map((item) => item.durationMinutes));
  return items.length === 0
    ? '<p class="muted">—</p>'
    : items
        .map(
          (item) =>
            `<div class="repo"><span>${escapeHtml(item.key)}</span><div class="track"><div class="fill" style="width:${(item.durationMinutes / max) * 100}%"></div></div><span>${formatDuration(item.durationMinutes)}</span></div>`,
        )
        .join('');
}

function sessionTable(report: WorklogReport): string {
  const headings =
    report.metadata.locale === 'fr'
      ? ['Début', 'Fin', 'Durée', 'Commits', 'Dépôts']
      : ['Start', 'End', 'Duration', 'Commits', 'Repositories'];
  const rows = report.sessions
    .map(
      (session) =>
        `<tr><td>${formatDateTime(session.start, report.metadata.locale)}</td><td>${formatDateTime(session.end, report.metadata.locale)}</td><td>${formatDuration(session.durationMinutes)}</td><td>${session.commits.length}</td><td>${escapeHtml(session.repositories.join(', '))}</td></tr>`,
    )
    .join('');
  return `<table><thead><tr>${headings.map((heading) => `<th>${heading}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function dayTable(report: WorklogReport): string {
  const duration = report.metadata.locale === 'fr' ? 'Durée' : 'Duration';
  const rows = report.days
    .map(
      (day) =>
        `<tr><td>${escapeHtml(day.date)}</td><td>${formatDuration(day.durationMinutes)}</td><td>${day.sessions.length}</td><td>${day.commitCount}</td></tr>`,
    )
    .join('');
  return `<table><thead><tr><th>Date</th><th>${duration}</th><th>Sessions</th><th>Commits</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function setting(label: string, value: number): string {
  return `<div><span class="muted">${escapeHtml(label)}</span><strong>${value} min</strong></div>`;
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value));
}

function formatDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });
}
