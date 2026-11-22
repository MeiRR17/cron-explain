# cron-explain

**Understand five-field Unix cron expressions in plain English and Hebrew.**

A responsive, dependency-free browser tool that explains an expression and previews its next five scheduled local times. No account, analytics, backend, or API.

## Features

- Five-field Unix cron syntax: minute, hour, day of month, month, and weekday.
- Wildcards (\`*\`), lists (\`1,15\`), ranges (\`9-17\`), and steps (\`*/15\`).
- English month/weekday names (\`JAN-DEC\`, \`SUN-SAT\`).
- \`@hourly\`, \`@daily\`, \`@weekly\`, \`@monthly\`, \`@yearly\`, and equivalent aliases.
- Hebrew/English explanations with a one-click language switch.
- Next **5, 10 or 20** matching local times, with timezone information.
- Choose an optional **local start date/time** to preview future schedules, or reset to the current time; changing this field clears stale preview results and disables exports until the next calculation.
- Download the displayed occurrences as a standard **ICS calendar preview** with UTC event timestamps, a one-minute duration and explicit *not scheduled* labels. Importing ICS does not create cron jobs.
- Export the same up to 20 predicted occurrences as **CSV**, with local date/time, UTC timestamp, per-occurrence UTC offset and timezone name. The file also flags offset changes since the preceding occurrence, repeated local-clock minutes, and `elapsed_minutes_since_previous`: the actual elapsed minutes between the current predicted UTC instant and its preceding occurrence. The first row leaves this field blank (no predecessor). The CSV contains no command or executable schedule.
- Export a separate **JSON preview snapshot**, with normalized cron expression, timezone, UTC instants, browser-local wall-clock minutes, per-run UTC offset in minutes, **elapsed minutes since the previous prediction**, observed minimum/maximum intervals and DST warning flags. It contains no shell command and is not a runnable cron schedule.
- See a **local-weekday frequency breakdown** of the displayed 1–20 predictions. The bilingual preview reports only weekdays with observed matches; JSON includes a fixed Sunday–Saturday `localWeekdayCounts` map and `weekdaysRepresented` count. This is descriptive of the sampled preview window, **not a statement that other weekdays can never match**, not a recurring rule and not a guarantee of daemon execution.
- See observed elapsed-time gaps between adjacent displayed predictions: a single gap for evenly spaced snapshots, or a minimum–maximum range for varying gaps. CSV and JSON both reuse the same `previewGaps()` calculations; neither interprets wall-clock label differences as elapsed UTC minutes. These are **actual elapsed minutes between predicted instants**, not a guaranteed cron interval. Calendar boundaries and daylight saving changes can make gaps unequal; only the 1–20 displayed predictions are measured.
- Preset examples, mobile-friendly layout, accessible form, and dark-mode styling.

## Use it

Serve the repository root on a static HTTP server:

\`\`\`sh
python3 -m http.server 8000
\`\`\`

Open \`http://localhost:8000\`. You can deploy the same files as-is to GitHub Pages (after enabling Pages for the repository), Netlify or another static hosting provider.

Try:

\`\`\`text
*/15 9-17 * * MON-FRI
0 9 * * 1-5
30 6 1 * *
@daily
\`\`\`

## Parser API

\`\`\`js
import { parseCron, describeCron, nextRuns } from './src/cron.js';

const schedule = parseCron('0 9 * * MON-FRI');
console.log(describeCron(schedule, 'en'));
console.log(describeCron(schedule, 'he'));
console.log(nextRuns(schedule, 5, new Date()));
\`\`\`

### Scheduling semantics and limits

- This is **traditional five-field Unix cron**, not Quartz. Seconds, \`?\`, \`L\`, \`W\`, and \`#\` extensions are not supported.
- Sunday is represented as \`0\` or \`7\`; Monday is \`1\`. Day/month name abbreviations are case-insensitive.
- **Day-of-month/day-of-week syntax matters**, not just the number of selected values. Following traditional Vixie/Cronie leading-asterisk semantics, when **neither** day field starts with `*`, either selected field can match (**OR**). When **either** begins with `*` (including `*/step`), both selected day sets must match (**AND**). An explicit range such as `1-31` remains syntactically restricted even though it selects every day; `*/1` is wildcard-form even though it selects every day. Examples: `0 0 1 * MON` means the first of each month **or** Mondays; `0 0 1-31 * MON` means every day; `0 0 */2 * MON` means Mondays on days selected by the stepped day-of-month field. Other fields always combine with AND. Some cron implementations differ; check the semantics of your deployment scheduler.
- When the preview contains different UTC offsets, the UI warns about the change. If two predicted instants have the same local minute but different UTC instants, it warns about the repeated wall-clock label. The checker does not determine *when* a transition occurred or how your actual cron daemon handles DST.
- Future times are calculated against the **browser's local timezone** using JavaScript \`Date\`. The preview is not a guarantee that your specific cron scheduler will run (especially around daylight-saving clock changes).
- The optional start date/time is interpreted in the browser's local timezone. Invalid calendar dates and nonexistent wall-clock minutes during forward daylight-saving changes are rejected. Ambiguous repeated minutes resolve to the earlier occurrence according to JavaScript Date behavior. A chosen start affects the preview only and is not transmitted anywhere.
- Search looks up to eight years ahead; expressions with no matching time in that horizon display a clear message.
- No external requests or server-side processing are performed by the application.
- The JSON/CSV/ICS exports are strictly snapshots of the displayed predicted matches, not a recurring rule. All export controls are disabled after input edits until recomputation; the JSON version rejects invalid or nonchronological instants and carries an explicit informational-only marker.
- The ICS export is a *snapshot* of up to 20 predicted matches, not a recurring rule. Events are informational; no automatic execution or guarantee around daylight saving changes is implied. Programmatic ICS export now rejects unsorted, duplicate, non-Date or invalid run instants (matching the CSV preview ordering), out-of-range UTC calendar years, and multiline/control-character expressions rather than silently emitting a misleading calendar.
- Modifying a cron expression immediately clears the old preview and disables both exports until recalculation. CSV offsets are calculated separately for each occurrence, which matters when an interval crosses a daylight-saving transition; the predictions still follow the browser's local timezone and may differ from an actual daemon's policy.

## Structure

\`\`\`text
index.html       Localized interface and field reference
styles.css       Responsive layout and dark mode
src/cron.js      Parser, local-time scheduler, English/Hebrew explanation
src/ics.js       RFC 5545 snapshot export of up to 20 predicted runs
src/csv.js       UTF-8 CSV snapshot including local/UTC timestamps, offsets and elapsed minutes
src/json.js      Machine-readable informational snapshot with DST diagnostic flags
src/clock.js     Pure offset-change, repeated-wall-minute, elapsed-gap and weekday-frequency diagnostics
src/app.js       Browser interactions and localized output
\`\`\`

## Author

Built by Meir Dvir · [https://github.com/MeiRR17](https://github.com/MeiRR17)
