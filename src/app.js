import { parseCron, describeCron, nextRuns } from './cron.js';
import { runsToIcs } from './ics.js';
import { runsToCsv } from './csv.js';

const dictionary = {
  en: {
    language: 'Language',
    eyebrow: 'Cron, without the guesswork',
    headline: 'Understand when a cron job runs.',
    intro: "Paste a five-field Unix cron expression. Read what it means and see the next scheduled times in your browser's timezone.",
    expressionTitle: 'Your schedule',
    expressionLabel: 'Cron expression (minute hour day month weekday)',
    explain: 'Explain & preview',
    syntaxTip: 'Supports numbers, ranges, lists, steps, month/day names, and standard @daily-style macros.',
    examples: 'Try an example',
    resultTitle: 'What it means',
    normalized: 'Normalized:',
    nextTitle: 'Upcoming run times',
    countLabel: 'Show',
    exportCalendar: '↓ Export .ics',
    exportCsv: '↓ Export .csv',
    previewOutdated: 'Expression changed. Select Explain & preview to refresh the estimated times.',
    guideTitle: 'Field reference',
    fields: 'minute · hour · day of month · month · day of week',
    every15: 'Every 15 values in a field',
    weekday: 'Monday through Friday',
    list: 'The listed values only',
    limits: "Five-field Unix cron only, not Quartz or seconds. When both day-of-month and weekday are restricted, either matching day counts. Results use your browser's local timezone; behavior around daylight-saving transitions may vary between cron implementations.",
    local: 'Calculated locally, without an account or API.',
    timezone: 'Local timezone',
    notFound: 'No occurrence found within the next 8 years.',
    previewNote: 'Preview starts after your current local time. This is an estimate of matching wall-clock minutes, not a guarantee of execution by your scheduler.'
  },
  he: {
    language: 'שפה',
    eyebrow: 'הבנת Cron בלי ניחושים',
    headline: 'לגלות מתי משימה מתוזמנת תפעל.',
    intro: 'הכניסו ביטוי Cron בן חמישה שדות, קבלו הסבר בעברית ואת זמני ההפעלה הבאים לפי אזור הזמן של הדפדפן.',
    expressionTitle: 'הגדרת התזמון',
    expressionLabel: 'ביטוי Cron (דקה שעה יום בחודש חודש יום בשבוע)',
    explain: 'הסבר והצגת מועדים',
    syntaxTip: 'תמיכה במספרים, טווחים, רשימות, צעדים, שמות חודשים וימים וקיצורים כמו @daily.',
    examples: 'דוגמאות',
    resultTitle: 'משמעות הביטוי',
    normalized: 'ביטוי מנורמל:',
    nextTitle: 'מועדי ההפעלה הבאים',
    countLabel: 'הצג',
    exportCalendar: '↓ ייצוא ליומן',
    exportCsv: '↓ ייצוא CSV',
    previewOutdated: 'הביטוי השתנה. יש ללחוץ על הסבר והצגת מועדים כדי לחשב תחזית מעודכנת.',
    guideTitle: 'מדריך השדות',
    fields: 'דקה · שעה · יום בחודש · חודש · יום בשבוע',
    every15: 'כל 15 ערכים בשדה',
    weekday: 'מיום שני עד יום שישי',
    list: 'רק הערכים המפורטים',
    limits: 'הכלי תומך ב־Unix Cron עם חמישה שדות בלבד, ללא תחביר Quartz או שדה שניות. אם גם היום בחודש וגם היום בשבוע מוגבלים, מספיק שאחד מהם יתאים. המועדים מחושבים לפי שעון הדפדפן; התנהגות בשינויי שעון קיץ עשויה להשתנות בין מערכות.',
    local: 'החישוב מקומי, ללא חשבון או API.',
    timezone: 'אזור זמן מקומי',
    notFound: 'לא נמצא מועד מתאים בשמונה השנים הבאות.',
    previewNote: 'התחזית מתחילה לאחר השעה המקומית הנוכחית. היא מתארת דקות התואמות לביטוי, ואינה מבטיחה שהמערכת אכן תפעיל את המשימה.'
  }
};

const localePicker = document.querySelector('#locale');
const cronInput = document.querySelector('#cron-input');
const explanation = document.querySelector('#explanation');
const normalized = document.querySelector('#normalized');
const runsList = document.querySelector('#next-runs');
const errorBox = document.querySelector('#error');
const timezone = document.querySelector('#timezone');
const note = document.querySelector('#next-note');
const runCount = document.querySelector('#run-count');
const calendarButton = document.querySelector('#export-calendar');
const csvButton = document.querySelector('#export-csv');
let lastPreview = null;

function language() { return localePicker.value === 'he' ? 'he' : 'en'; }

function translate() {
  const lang = language();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = dictionary[lang][element.dataset.i18n];
  }
}

function render() {
  const lang = language();
  const messages = dictionary[lang];
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  timezone.textContent = messages.timezone + ': ' + zone;
  note.textContent = messages.previewNote;
  lastPreview = null;
  calendarButton.disabled = csvButton.disabled = true;
  try {
    const schedule = parseCron(cronInput.value);
    const dates = nextRuns(schedule, Number(runCount.value), new Date());
    if (dates.length) {
      lastPreview = { expression: schedule.expression, runs: dates };
      calendarButton.disabled = csvButton.disabled = false;
    }
    normalized.textContent = schedule.expression;
    explanation.textContent = describeCron(schedule, lang);
    errorBox.hidden = true;
    errorBox.textContent = '';
    runsList.replaceChildren();
    if (dates.length === 0) {
      const item = document.createElement('li');
      item.textContent = messages.notFound;
      runsList.append(item);
      return;
    }

    const formatter = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    const fragment = document.createDocumentFragment();
    for (const date of dates) {
      const item = document.createElement('li');
      item.textContent = formatter.format(date);
      fragment.append(item);
    }
    runsList.append(fragment);
  } catch (error) {
    explanation.textContent = '';
    normalized.textContent = '';
    runsList.replaceChildren();
    errorBox.textContent = error instanceof Error ? error.message : 'Invalid cron expression.';
    errorBox.hidden = false;
  }
}

function downloadSnapshot(contents, filename, mime) {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function saveSnapshot(kind) {
  if (!lastPreview) return;
  try {
    const isCsv = kind === 'csv';
    const contents = isCsv ? runsToCsv(lastPreview) : runsToIcs(lastPreview);
    downloadSnapshot(contents, isCsv ? 'cron-preview.csv' : 'cron-preview.ics',
      isCsv ? 'text/csv;charset=utf-8' : 'text/calendar;charset=utf-8');
    errorBox.hidden = true;
  } catch (error) {
    errorBox.textContent = error instanceof Error ? error.message : 'Preview export failed.';
    errorBox.hidden = false;
  }
}
calendarButton.addEventListener('click', () => saveSnapshot('ics'));
csvButton.addEventListener('click', () => saveSnapshot('csv'));
runCount.addEventListener('change', render);
cronInput.addEventListener('input', () => {
  lastPreview = null;
  calendarButton.disabled = csvButton.disabled = true;
  explanation.textContent = '';
  normalized.textContent = '';
  runsList.replaceChildren();
  errorBox.hidden = true;
  errorBox.textContent = '';
  note.textContent = dictionary[language()].previewOutdated;
});
document.querySelector('#cron-form').addEventListener('submit', event => {
  event.preventDefault();
  render();
});
document.querySelectorAll('[data-cron]').forEach(button => {
  button.addEventListener('click', () => {
    cronInput.value = button.dataset.cron;
    render();
  });
});
localePicker.addEventListener('change', () => {
  translate();
  render();
});

translate();
render();
