/**
 * Export a bounded series of predicted cron matches as an RFC 5545 calendar.
 * These are informational UTC events only. Importing the .ics file does
 * NOT create cron jobs or implement any scheduler.
 */

const MAX_OCCURRENCES = 20;
const encoder = new TextEncoder();

function utcStamp(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new TypeError('Expected a valid Date.');
  }
  // RFC 5545 DATE-TIME uses four-digit Gregorian years. The JavaScript Date
  // range is much wider and its expanded ISO years are not valid ICS values.
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
    throw new RangeError('Calendar events must have a four-digit UTC year.');
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function escapeText(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\r\n?|\n/g, '\\n')
    .replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Fold long logical ICS lines by UTF-8 bytes, keeping code points intact. */
function fold(line) {
  let result = '',current = '',bytes = 0;
  for (const point of line) {
    const n = encoder.encode(point).length;
    if (current && bytes + n > 75) {
      result += current + '\r\n ';
      current = '';
      bytes = 1; // One leading space on each continuation line.
    }
    current += point;
    bytes += n;
  }
  return result + current;
}

/**
 * @param {{expression:string, runs:Date[], createdAt?:Date}} input
 * @returns {string} UTF-8 ICS content, CRLF delimited.
 */
export function runsToIcs({ expression, runs, createdAt = new Date() }) {
  if (typeof expression !== 'string' || !expression.trim() ||
      expression.length > 120 || /[\u0000-\u001F\u007F]/u.test(expression) ||
      !Array.isArray(runs) || runs.length < 1 || runs.length > MAX_OCCURRENCES) {
    throw new RangeError('Provide 1–20 valid preview runs and a one-line cron expression.');
  }
  const stamp = utcStamp(createdAt);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//MeiRR17//Cron Explain Preview//EN',
    'X-WR-CALNAME:Cron run estimates',
  ];
  let previous = -Infinity;
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (!(run instanceof Date) || !Number.isFinite(run.getTime()) ||
        run.getTime() <= previous) {
      // Match CSV's ordering contract. A scrambled sequence can misrepresent
      // the forecast even if every individual timestamp is valid.
      throw new TypeError('Run dates must be valid and strictly increasing.');
    }
    const instant = run.getTime();
    previous = instant;
    const id = utcStamp(run);
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + id + '-' + (i + 1) + '@cron-explain.local.invalid',
      'DTSTAMP:' + stamp,
      'DTSTART:' + id,
      'DTEND:' + utcStamp(new Date(instant + 60_000)),
      'SUMMARY:' + escapeText('Cron preview (not scheduled)'),
      'DESCRIPTION:' + escapeText('Informational cron estimate for ' + expression +
        '. Importing this calendar does NOT schedule a command. DST behavior may differ from your cron implementation.'),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
