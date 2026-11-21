/**
 * Five-field Unix cron parser, explanation, and local-time next-run calculator.
 * No network requests, locale dependencies, or third-party packages.
 *
 * Supported: *, lists, numbers, ranges, steps, JAN-DEC, SUN-SAT and
 * @hourly/@daily/@weekly/@monthly/@yearly convenience macros.
 * Day-of-month and day-of-week use traditional cron OR semantics when both
 * are restricted. Timezone is the Date object's local timezone.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = Object.fromEntries(MONTHS.map((name, index) => [name, index + 1]));
const WEEKDAY_NAMES = Object.fromEntries(WEEKDAYS.map((name, index) => [name, index]));
const ALIASES = Object.freeze({
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *'
});

const SPECS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'dayOfMonth', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: MONTH_NAMES },
  { name: 'dayOfWeek', min: 0, max: 7, names: WEEKDAY_NAMES }
];

function parseValue(raw, spec) {
  const upper = raw.toUpperCase();
  const number = spec.names?.[upper] ?? (/^\d+$/.test(upper) ? Number(upper) : NaN);
  if (!Number.isInteger(number) || number < spec.min || number > spec.max) {
    throw new SyntaxError('Invalid ' + spec.name + ' value: "' + raw + '".');
  }
  return number;
}

function parseField(raw, spec) {
  if (!raw || raw.includes('?') || raw.includes('#')) {
    throw new SyntaxError('Unsupported ' + spec.name + ' field: "' + raw + '". Use standard five-field cron syntax.');
  }
  const values = new Set();
  for (const part of raw.split(',')) {
    const match = /^([^/]+)(?:\/(\d+))?$/.exec(part);
    if (!match) throw new SyntaxError('Invalid ' + spec.name + ' segment: "' + part + '".');
    const base = match[1];
    const step = match[2] === undefined ? 1 : Number(match[2]);
    if (!Number.isSafeInteger(step) || step < 1 || step > spec.max - spec.min + 1) {
      throw new SyntaxError('Invalid step in ' + spec.name + ': "' + part + '".');
    }

    let start;
    let end;
    if (base === '*') {
      start = spec.min;
      end = spec.max;
    } else if (base.includes('-')) {
      const parts = base.split('-');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new SyntaxError('Invalid range in ' + spec.name + ': "' + part + '".');
      }
      start = parseValue(parts[0], spec);
      end = parseValue(parts[1], spec);
    } else {
      start = parseValue(base, spec);
      end = match[2] === undefined ? start : spec.max;
    }
    if (start > end) throw new SyntaxError('Backward range in ' + spec.name + ': "' + part + '".');
    for (let n = start; n <= end; n += step) {
      values.add(spec.name === 'dayOfWeek' && n === 7 ? 0 : n);
    }
  }
  const totalPossible = spec.max - spec.min + (spec.name === 'dayOfWeek' ? 0 : 1);
  return { raw, values, unrestricted: values.size === totalPossible };
}

/**
 * Parse a traditional five-field cron expression.
 * @param {string} input An expression such as "*/15 9-17 * * MON-FRI".
 * @returns {{expression: string, original: string, minute: object, hour: object, dayOfMonth: object, month: object, dayOfWeek: object}}
 */
export function parseCron(input) {
  if (typeof input !== 'string') throw new TypeError('Expression must be a string.');
  const original = input.trim();
  if (!original) throw new SyntaxError('Enter a cron expression.');
  const expression = ALIASES[original.toLowerCase()] ?? original;
  const parts = expression.toUpperCase().split(/\s+/);
  if (parts.length !== 5) {
    throw new SyntaxError('Expected exactly five fields: minute hour day-of-month month day-of-week.');
  }
  const fields = SPECS.map((spec, index) => parseField(parts[index], spec));
  return {
    original,
    expression: parts.join(' '),
    minute: fields[0],
    hour: fields[1],
    dayOfMonth: fields[2],
    month: fields[3],
    dayOfWeek: fields[4]
  };
}

function matchesDay(schedule, date) {
  const dayOfMonth = schedule.dayOfMonth.values.has(date.getDate());
  const dayOfWeek = schedule.dayOfWeek.values.has(date.getDay());
  if (schedule.dayOfMonth.unrestricted) return dayOfWeek;
  if (schedule.dayOfWeek.unrestricted) return dayOfMonth;
  return dayOfMonth || dayOfWeek;
}

/**
 * Find upcoming local-clock matches, strictly after the given time.
 * Handles skipped local hours via JavaScript Date and does not assert
 * portability across crontab implementations with different DST policies.
 * @param {ReturnType<typeof parseCron>} schedule
 * @param {number} [count=5]
 * @param {Date} [from=new Date()]
 * @returns {Date[]}
 */
export function nextRuns(schedule, count = 5, from = new Date()) {
  if (!(from instanceof Date) || !Number.isFinite(from.getTime())) {
    throw new TypeError('from must be a valid Date.');
  }
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new RangeError('count must be between 1 and 20.');
  }
  const result = [];
  let cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  if (cursor.getTime() <= from.getTime()) {
    cursor = new Date(cursor.getTime() + 60000);
  }
  const lastYear = from.getFullYear() + 8;
  let iterations = 0;

  while (result.length < count && cursor.getFullYear() <= lastYear) {
    if (++iterations > 3000000) break;
    if (!schedule.month.values.has(cursor.getMonth() + 1)) {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      continue;
    }
    if (!matchesDay(schedule, cursor)) {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      continue;
    }
    if (!schedule.hour.values.has(cursor.getHours())) {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), cursor.getHours() + 1);
      continue;
    }
    if (!schedule.minute.values.has(cursor.getMinutes())) {
      cursor = new Date(cursor.getTime() + 60000);
      continue;
    }
    result.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 60000);
  }
  return result;
}

function formatSelected(field, names = null) {
  return [...field.values].sort((a, b) => a - b).map(n => names ? names[n] : String(n)).join(', ');
}

/**
 * Give a faithful human-readable description; preserves cron OR semantics.
 * @param {ReturnType<typeof parseCron>} schedule
 * @param {'en'|'he'} [locale='en']
 * @returns {string}
 */
export function describeCron(schedule, locale = 'en') {
  if (locale !== 'en' && locale !== 'he') throw new RangeError('Locale must be en or he.');
  const dayRule = !schedule.dayOfMonth.unrestricted && !schedule.dayOfWeek.unrestricted;
  const minute = schedule.minute.unrestricted ? null : formatSelected(schedule.minute);
  const hour = schedule.hour.unrestricted ? null : formatSelected(schedule.hour);
  const month = schedule.month.unrestricted ? null : formatSelected(schedule.month, Object.fromEntries(MONTHS.map((n, i) => [i + 1, n])));
  const dom = schedule.dayOfMonth.unrestricted ? null : formatSelected(schedule.dayOfMonth);
  const dow = schedule.dayOfWeek.unrestricted ? null : formatSelected(schedule.dayOfWeek, WEEKDAYS);

  if (locale === 'he') {
    return [
      minute ? 'בדקות ' + minute : 'בכל דקה',
      hour ? 'בשעות ' + hour : 'בכל שעה',
      month ? 'בחודשים ' + month : 'בכל חודש',
      dom ? 'בימי החודש ' + dom : 'ללא הגבלת יום בחודש',
      dow ? 'בימי השבוע ' + dow : 'ללא הגבלת יום בשבוע'
    ].join(' · ') + (dayRule ? '. כאשר יום בחודש ויום בשבוע מוגדרים, מספיק שאחד מהתנאים יתאים (OR).' : '.');
  }

  return [
    minute ? 'At minute(s) ' + minute : 'Every minute',
    hour ? 'during hour(s) ' + hour : 'every hour',
    month ? 'in month(s) ' + month : 'in every month',
    dom ? 'on day(s) of month ' + dom : 'on any day of the month',
    dow ? 'on weekday(s) ' + dow : 'on any weekday'
  ].join(' · ') + (dayRule ? '. When both day fields are restricted, either match is enough (OR).' : '.');
}
