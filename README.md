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
- Download the displayed occurrences as a standard **ICS calendar preview** with UTC event timestamps, a one-minute duration and explicit *not scheduled* labels. Importing ICS does not create cron jobs.
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
- Future times are calculated against the **browser's local timezone** using JavaScript \`Date\`. The preview is not a guarantee that your specific cron scheduler will run (especially around daylight-saving clock changes).
- Search looks up to eight years ahead; expressions with no matching time in that horizon display a clear message.
- No external requests or server-side processing are performed by the application.
- The ICS export is a *snapshot* of up to 20 predicted matches, not a recurring rule. Events are informational; no automatic execution or guarantee around daylight saving changes is implied.

## Structure

\`\`\`text
index.html       Localized interface and field reference
styles.css       Responsive layout and dark mode
src/cron.js      Parser, local-time scheduler, English/Hebrew explanation
src/ics.js       RFC 5545 snapshot export of up to 20 predicted runs
src/app.js       Browser interactions and localized output
\`\`\`

## Author

Built by Meir Dvir · [https://github.com/MeiRR17](https://github.com/MeiRR17)
