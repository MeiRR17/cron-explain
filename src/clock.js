/**
 * Inspect actual predicted instants for timezone-offset changes and duplicate
 * local clock minutes. Does not predict cron daemon behavior.
 *
 * Each run is a Date in the browser's local timezone. The offset comparison
 * is a detection of a change somewhere BETWEEN the displayed occurrences;
 * no exact DST transition instant is inferred.
 */
function wallMinute(run) {
  return [
    String(run.getFullYear()).padStart(4, '0'),
    String(run.getMonth() + 1).padStart(2, '0'),
    String(run.getDate()).padStart(2, '0'),
    String(run.getHours()).padStart(2, '0'),
    String(run.getMinutes()).padStart(2, '0'),
  ].join('-');
}

export function previewClockRisks(runs) {
  if (!Array.isArray(runs) || runs.length > 20) {
    throw new RangeError('Expected at most 20 preview dates.');
  }
  const seen = new Set();
  const changedAfter = [];
  const repeatedLocalMinutes = [];
  let previousOffset = null;
  let previousInstant = -Infinity;
  for (let index = 0; index < runs.length; index++) {
    const run = runs[index];
    if (!(run instanceof Date) || !Number.isFinite(run.getTime()) ||
        run.getTime() <= previousInstant) {
      throw new TypeError('Preview dates must be valid and strictly increasing.');
    }
    previousInstant = run.getTime();
    const offset = run.getTimezoneOffset();
    if (previousOffset !== null && offset !== previousOffset) {
      changedAfter.push(index); // 0-based position of the later occurrence.
    }
    previousOffset = offset;
    const key = wallMinute(run);
    if (seen.has(key)) repeatedLocalMinutes.push(index);
    else seen.add(key);
  }
  return {
    offsetChanges: changedAfter.length,
    offsetChangeIndices: changedAfter,
    repeatedLocalMinutes: repeatedLocalMinutes.length,
    repeatedLocalMinuteIndices: repeatedLocalMinutes,
  };
}


/**
 * Compare actual elapsed time between adjacent predicted UTC instants.
 * A fixed cron rule need not produce uniform gaps, particularly across
 * calendar boundaries or daylight-saving changes. This does not model
 * whether a particular cron daemon will execute any of these matches.
 */
export function previewGaps(runs) {
  // Enforce the same bounded, strictly increasing Date contract as DST flags.
  previewClockRisks(runs);
  const gapsMinutes = [];
  for (let i = 1; i < runs.length; i++) {
    const minutes = (runs[i].getTime() - runs[i - 1].getTime()) / 60_000;
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new TypeError('Invalid interval between preview instants.');
    }
    gapsMinutes.push(minutes);
  }
  return {
    gapsMinutes,
    minMinutes: gapsMinutes.length ? Math.min(...gapsMinutes) : null,
    maxMinutes: gapsMinutes.length ? Math.max(...gapsMinutes) : null,
    uniform: gapsMinutes.length ? gapsMinutes.every(value => value === gapsMinutes[0]) : null,
    advisory: 'Elapsed minutes between predicted instants only; not a guarantee of actual job execution.',
  };
}


/**
 * Frequency of preview instants on local civil weekdays (Sunday first).
 * This is an observation of 1–20 displayed matches, NOT a recurrence
 * analysis and not evidence that the daemon will run on those weekdays.
 */
export function previewWeekdays(runs) {
  previewClockRisks(runs); // same bounded, strictly increasing Date contract
  const weekdays = ['sun','mon','tue','wed','thu','fri','sat'];
  const byWeekday = Object.fromEntries(weekdays.map(day => [day, 0]));
  for (const run of runs) byWeekday[weekdays[run.getDay()]]++;
  return {
    byWeekday,
    recordedMatches: runs.length,
    daysRepresented: Object.values(byWeekday).filter(count => count > 0).length,
    advisory: 'Only the displayed local-time predictions; not a weekly schedule or execution guarantee.',
  };
}
