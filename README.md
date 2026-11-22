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
- Export the same up to 20 predicted occurrences as **CSV**, with local date/time, UTC timestamp, per-occurrence UTC offset and timezone name. The file also flags offset changes since the preceding occurrence and repeated local-clock minutes (which can happen during clock changes). The CSV contains no command or executable schedule.
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
- When **both** day-of-month and weekday fields are restricted, a date matches if **either** field matches (traditional cron OR semantics). Other fields all must match.
- When the preview contains different UTC offsets, the UI warns about the change. If two predicted instants have the same local minute but different UTC instants, it warns about the repeated wall-clock label. The checker does not determine *when* a transition occurred or how your actual cron daemon handles DST.
- Future times are calculated against the **browser's local timezone** using JavaScript \`Date\`. The preview is not a guarantee that your specific cron scheduler will run (especially around daylight-saving clock changes).
- The optional start date/time is interpreted in the browser's local timezone. Invalid calendar dates and nonexistent wall-clock minutes during forward daylight-saving changes are rejected. Ambiguous repeated minutes resolve to the earlier occurrence according to JavaScript Date behavior. A chosen start affects the preview only and is not transmitted anywhere.
- Search looks up to eight years ahead; expressions with no matching time in that horizon display a clear message.
- No external requests or server-side processing are performed by the application.
- The ICS export is a *snapshot* of up to 20 predicted matches, not a recurring rule. Events are informational; no automatic execution or guarantee around daylight saving changes is implied. Programmatic ICS export now rejects unsorted, duplicate, non-Date or invalid run instants (matching the CSV preview ordering), out-of-range UTC calendar years, and multiline/control-character expressions rather than silently emitting a misleading calendar.
- Modifying a cron expression immediately clears the old preview and disables both exports until recalculation. CSV offsets are calculated separately for each occurrence, which matters when an interval crosses a daylight-saving transition; the predictions still follow the browser's local timezone and may differ from an actual daemon's policy.

## Structure

\`\`\`text
index.html       Localized interface and field reference
styles.css       Responsive layout and dark mode
src/cron.js      Parser, local-time scheduler, English/Hebrew explanation
src/ics.js       RFC 5545 snapshot export of up to 20 predicted runs
src/csv.js       UTF-8 CSV snapshot including local/UTC timestamps and UTC offsets
src/clock.js     Pure offset-change and repeated-wall-minute diagnostics
src/app.js       Browser interactions and localized output
\`\`\`

## Author

Built by Meir Dvir · [https://github.com/MeiRR17](https://github.com/MeiRR17)
