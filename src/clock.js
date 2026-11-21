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
