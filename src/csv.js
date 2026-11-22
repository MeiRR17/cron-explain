import { previewClockRisks, previewGaps } from './clock.js';

/**
 * Export the same local-clock cron preview as a spreadsheet-readable CSV.
 * This is a snapshot of predicted times, never a cron job or recurring event.
 *
 * Local offsets are included per run, because DST transitions may change them
 * between occurrences even within the same IANA timezone.
 */
const MAX_RUNS = 20;

function pad(number, digits = 2) {
  return String(number).padStart(digits, '0');
}
function localStamp(date) {
  return pad(date.getFullYear(), 4) + '-' + pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}
function utcOffset(date) {
  const minutes = -date.getTimezoneOffset();
  return (minutes >= 0 ? '+' : '-') +
    pad(Math.floor(Math.abs(minutes) / 60)) + ':' + pad(Math.abs(minutes) % 60);
}
function csvCell(value) {
  let text = String(value);
  if (/^[\s]*[=+\-@\t\r\n]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function runsToCsv({ runs, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local' }) {
  if (!Array.isArray(runs) || runs.length < 1 || runs.length > MAX_RUNS) {
    throw new RangeError('Provide 1–20 predicted run dates.');
  }
  if (typeof timeZone !== 'string' || timeZone.length > 100) {
    throw new RangeError('Invalid timezone label.');
  }
  const flags = previewClockRisks(runs);
  const gaps = previewGaps(runs);
  const changed = new Set(flags.offsetChangeIndices);
  const repeated = new Set(flags.repeatedLocalMinuteIndices);
  const header = ['number', 'local_datetime', 'utc_datetime', 'utc_offset', 'timezone', 'kind',
    'offset_changed_since_previous', 'repeated_local_clock_minute',
    'elapsed_minutes_since_previous'];
  const lines = [header.map(csvCell).join(',')];
  let previous = -Infinity;
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (!(run instanceof Date) || !Number.isFinite(run.getTime()) ||
        run.getTime() <= previous) {
      throw new TypeError('Run dates must be valid and strictly increasing.');
    }
    previous = run.getTime();
    lines.push([
      i + 1, localStamp(run), run.toISOString(), utcOffset(run),
      timeZone, 'preview_not_scheduled', changed.has(i) ? 'true' : 'false',
      repeated.has(i) ? 'true' : 'false',
      i ? gaps.gapsMinutes[i - 1] : '',
    ].map(csvCell).join(','));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
