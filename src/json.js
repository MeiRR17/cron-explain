import { previewClockRisks } from './clock.js';

/**
 * Machine-readable snapshot of predicted cron wall-clock matches.
 * It is informational only: never an executable cron definition or schedule.
 */
const two = n => String(n).padStart(2, '0');
function localMinute(date) {
  return String(date.getFullYear()).padStart(4, '0') + '-' +
    two(date.getMonth() + 1) + '-' + two(date.getDate()) + 'T' +
    two(date.getHours()) + ':' + two(date.getMinutes());
}
function offsetMinutes(date) {
  return -date.getTimezoneOffset();
}

export function runsToJson({
  expression, runs, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
}) {
  if (typeof expression !== 'string' || !expression.trim() ||
      expression.length > 120 || /[\u0000-\u001F\u007F]/u.test(expression)) {
    throw new RangeError('Provide a one-line cron expression (max 120 characters).');
  }
  if (typeof timeZone !== 'string' || !timeZone.trim() || timeZone.length > 100 ||
      /[\u0000-\u001F\u007F]/u.test(timeZone)) {
    throw new RangeError('Invalid local timezone label.');
  }
  if (!Array.isArray(runs) || runs.length < 1 || runs.length > 20) {
    throw new RangeError('Provide 1–20 predicted run dates.');
  }
  // Reuse one common order and validity contract for DST warnings.
  const risks = previewClockRisks(runs);
  const changed = new Set(risks.offsetChangeIndices);
  const repeated = new Set(risks.repeatedLocalMinuteIndices);
  const occurrences = runs.map((date, index) => {
    if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999 ||
        date.getFullYear() < 1 || date.getFullYear() > 9999) {
      throw new RangeError('Preview runs must use four-digit calendar years.');
    }
    return {
      number: index + 1,
      localDateTime: localMinute(date),
      utcDateTime: date.toISOString(),
      utcOffsetMinutes: offsetMinutes(date),
      offsetChangedSincePrevious: changed.has(index),
      repeatedLocalClockMinute: repeated.has(index),
    };
  });
  return JSON.stringify({
    format: 'cron-explain-preview-v1',
    kind: 'informational_preview_not_scheduled',
    expression,
    timeZone,
    occurrenceCount: occurrences.length,
    clockWarnings: {
      offsetChanges: risks.offsetChanges,
      repeatedLocalMinutes: risks.repeatedLocalMinutes,
    },
    occurrences,
    advisory: 'Matching local times are estimates, not cron daemon executions. DST handling depends on the scheduler.',
  }, null, 2) + '\n';
}
