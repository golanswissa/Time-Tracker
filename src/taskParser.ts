import type { Project, TaskPriority } from './types';
import { toDateKey } from './utils';

/**
 * Local task-parsing "brain" — no network, no key, fully private.
 *
 * Turns a pasted message (English or Hebrew, day-grouped lists, numbered or
 * bulleted) into a list of ParsedTask suggestions, each with a guessed project
 * and (when the message groups by day) a scheduled date / deadline.
 *
 * This is intentionally a pure function with a stable signature so a real LLM
 * (Claude vision, for images + smarter guessing) can later be dropped in behind
 * the same ParsedTask[] contract without touching the UI.
 */

export interface ParsedTask {
  /** Local temp id (not the store id). */
  id: string;
  /** English (translated) title — what gets filed. */
  title: string;
  /** Original (pre-translation) text, kept for reference when it differed. */
  original?: string;
  /** Explanation / note pulled from continuation lines under the task. */
  description?: string;
  /** Best-guess project id (may be undefined if there are no projects). */
  projectId?: string;
  /** Auto-detected urgency. */
  priority: TaskPriority;
  /** Scheduled day, YYYY-MM-DD (from a day header like "by Sunday"). */
  dateKey?: string;
  /** True when the day was auto-assigned (no day in the message). */
  autoScheduled?: boolean;
  /** Hard deadline, YYYY-MM-DD (set when the header says "by <day>"). */
  deadline?: string;
  /** Human label of the section this came under, e.g. "by Sunday". */
  sectionLabel?: string;
  /** Short reason for the project guess, e.g. matched "mobile". */
  reason?: string;
}

// ---- project category inference -------------------------------------------

type Cat = 'web' | 'slides' | 'brand' | 'studio';

const CAT_KEYWORDS: Record<Cat, string[]> = {
  web: ['page', 'עמוד', 'עמודים', 'mobile', 'מובייל', 'home', 'בית', 'homepage',
    'solution', 'solutions', 'contact', 'case study', 'case', 'marketing', 'hub',
    'landing', 'web', 'אתר', 'website', 'nav', 'footer', 'hero'],
  slides: ['slide', 'slides', 'מצגת', 'מצגות', 'deck', 'presentation', 'ppt',
    'keynote', 'שקופית', 'שקופיות', 'master deck', 'pitch'],
  brand: ['asset', 'assets', 'אסט', 'אסטים', 'brand', 'מותג', 'design system',
    'דיזיין סיסטם', 'system', 'מערכת', 'component', 'components', 'קומפוננט',
    'icon', 'icons', 'אייקון', 'token', 'tokens', 'documentation', 'תיעוד',
    'guideline', 'tool', 'tools', 'כלי', 'כלים', 'logo', 'לוגו'],
  studio: ['studio', 'סטודיו', 'retainer', 'ongoing', 'שוטף', 'misc', 'general',
    'social', 'באנר', 'banner', 'rollup', 'rollups', 'print', 'דפוס'],
};

/** Infer a category from a project's name so guesses adapt to real projects. */
function projectCat(name: string): Cat {
  const n = name.toLowerCase();
  if (/(slide|deck|presentation|מצגת|ppt|keynote)/.test(n)) return 'slides';
  if (/(brand|system|מותג|דיזיין|guideline)/.test(n)) return 'brand';
  if (/(studio|סטודיו|retainer|ongoing|שוטף)/.test(n)) return 'studio';
  return 'web';
}

// ---- day headers -----------------------------------------------------------

const HE_DOW: Record<string, number> = {
  'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6,
};
const EN_DOW: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};
const DOW_LABEL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The next date (today inclusive) that falls on the given weekday. */
function nextWeekday(dow: number, from: Date): Date {
  const diff = (dow - from.getDay() + 7) % 7; // 0 = today
  const d = new Date(from);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** If a line is a day header, return {dow, byDeadline, label}; else null. */
function parseHeader(line: string): { dow: number; by: boolean; label: string } | null {
  const raw = stripMarkers(line).toLowerCase().replace(/[:.]+$/, '').trim();
  if (!raw) return null;
  const by = /^(by|until|עד)\b/.test(raw) || raw.includes('עד יום');

  // Hebrew: "יום ראשון", "עד יום שני"
  for (const [he, dow] of Object.entries(HE_DOW)) {
    if (new RegExp(`יום\\s+${he}`).test(raw) || raw === he || raw === `עד יום ${he}`) {
      return { dow, by, label: `${by ? 'by ' : ''}${DOW_LABEL[dow]}` };
    }
  }
  // English: a short line that is essentially just a day name
  const words = raw.split(/\s+/).filter((w) => !['by', 'until', 'on', 'עד', 'יום'].includes(w));
  if (words.length <= 2) {
    for (const w of words) {
      const key = w.replace(/[^a-z]/g, '');
      if (key in EN_DOW) {
        const dow = EN_DOW[key];
        return { dow, by, label: `${by ? 'by ' : ''}${DOW_LABEL[dow]}` };
      }
    }
  }
  return null;
}

// ---- line cleanup ----------------------------------------------------------

/** Strip list markers, leading numbers, bullets and stray format chars. */
function stripMarkers(line: string): string {
  return line
    // drop zero-width / bidi / word-joiner / BOM control chars
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '')
    // normalize nbsp / narrow / thin spaces to a plain space
    .replace(/[\u00A0\u2007\u2009\u202F]/g, ' ')
    .trim()
    // leading "1.", "1)", "1 -", bullets
    .replace(/^\s*(\d+[.)]\s*|[-*\u2022\u00B7\u2013\u2014]\s*)+/, '')
    .trim();
}

// ---- Hebrew → English translation -----------------------------------------

/** Multi-word phrases, replaced first (longest match wins via length sort). */
const HE_PHRASES: [string, string][] = [
  ['עמוד הבית', 'Homepage'], ['עמוד בית', 'Homepage'], ['דף הבית', 'Homepage'],
  ['צור קשר', 'Contact us'], ['צרו קשר', 'Contact us'], ['דף נחיתה', 'Landing page'],
  ['דיזיין סיסטם', 'Design system'], ['מערכת עיצוב', 'Design system'],
  ['מצגת מאסטר', 'Master deck'], ['שקופיות מאסטר', 'Master slides'],
  ['באנרים לסושיאל', 'Social banners'], ['באנר לסושיאל', 'Social banner'],
  ['מקרה בוחן', 'Case study'], ['מסך בית', 'Home screen'],
];

/** Single Hebrew words → English. */
const HE_WORDS: Record<string, string> = {
  עמוד: 'page', עמודים: 'pages', דף: 'page', דפים: 'pages', בית: 'home',
  מובייל: 'mobile', דסקטופ: 'desktop', מסך: 'screen', מסכים: 'screens',
  מצגת: 'deck', מצגות: 'decks', שקופית: 'slide', שקופיות: 'slides',
  אסט: 'asset', אסטים: 'assets', אייקון: 'icon', אייקונים: 'icons', לוגו: 'logo',
  צבע: 'color', צבעים: 'colors', גופן: 'font', פונט: 'font',
  כלי: 'tool', כלים: 'tools', קומפוננטה: 'component', קומפוננטות: 'components',
  קומפוננט: 'component', מותג: 'brand', עיצוב: 'design', פיתוח: 'development',
  תיעוד: 'documentation', מחקר: 'research', פגישה: 'meeting', פגישות: 'meetings',
  סושיאל: 'social', באנר: 'banner', באנרים: 'banners', דפוס: 'print', וידאו: 'video',
  של: 'of', עם: 'with', חדש: 'new', חדשה: 'new', תיקון: 'fix', תיקונים: 'fixes',
  מהיר: 'quick', סקיצה: 'sketch', גרסה: 'version', פתרון: 'solution',
  פתרונות: 'solutions', שיווק: 'marketing', אתר: 'website', מאסטר: 'master',
  נחיתה: 'landing', קשר: 'contact', תמונה: 'image', תמונות: 'images', גלריה: 'gallery',
};

const hasHebrew = (s: string) => /[֐-׿]/.test(s);

/** Core Hebrew→English replacement (phrase-first, then word-level), no styling. */
export function translateText(s: string): string {
  if (!hasHebrew(s)) return s;
  let t = s;
  for (const [he, en] of [...HE_PHRASES].sort((a, b) => b[0].length - a[0].length)) {
    if (t.includes(he)) t = t.split(he).join(en);
  }
  t = t.replace(/[א-ת]+/g, (w) => HE_WORDS[w] ?? w);
  return t.replace(/[ \t]{2,}/g, ' ').replace(/\s+([-–])\s+/g, ' $1 ').trim();
}

/** Translate a short task title (adds noun-flip + leading capital). */
export function translateTitle(s: string): string {
  if (!hasHebrew(s)) return s;
  // "page solution" → "solution page" (Hebrew puts the noun first; English flips it)
  const t = translateText(s).replace(/^(page|pages)\s+(?!\d)([^\s].*)$/i, '$2 $1');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ---- urgency / priority ----------------------------------------------------

const ASAP_RE = /\b(asap|urgent|critical|now|today|eod)\b|דחוף|בהול|עכשיו|היום|!!+/i;
const HIGH_RE = /\b(important|high|priority|tomorrow|soon)\b|חשוב|מחר|בהקדם/i;

/**
 * Decide urgency from explicit cues in the text, then from how close the
 * deadline is — whichever is more urgent wins.
 */
export function detectPriority(text: string, dateKey: string | undefined, today: Date): TaskPriority {
  // three levels only: low / normal(=Medium) / high
  const order: TaskPriority[] = ['low', 'normal', 'high'];
  let p: TaskPriority = 'normal';
  const bump = (to: TaskPriority) => { if (order.indexOf(to) > order.indexOf(p)) p = to; };

  if (ASAP_RE.test(text) || HIGH_RE.test(text)) bump('high');

  // deadline proximity (calendar days from today)
  if (dateKey) {
    const due = new Date(dateKey + 'T00:00:00');
    const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - t0.getTime()) / 86400000);
    if (days <= 2) bump('high');
    else if (days <= 7) bump('normal');
    else bump('low');
  }
  return p;
}

// ---- main ------------------------------------------------------------------

let counter = 0;
const tmpId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

const MARKER_RE = /^\s*(\d+[.)]|[-*•·–—])\s+/;

export function parseTasks(text: string, projects: Project[], today = new Date()): ParsedTask[] {
  const lines = text.split(/\r?\n/);
  // If the message uses list markers, unmarked lines are treated as notes
  // (descriptions) of the task above them; otherwise every line is its own task.
  const usesMarkers = lines.some((l) => MARKER_RE.test(l));
  const out: ParsedTask[] = [];

  let curDate: string | undefined;
  let curDeadline: string | undefined;
  let curLabel: string | undefined;
  let current: ParsedTask | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const header = parseHeader(line);
    if (header) {
      const d = toDateKey(nextWeekday(header.dow, today));
      curDate = d;
      curDeadline = header.by ? d : undefined;
      curLabel = header.label;
      current = null;
      continue;
    }

    const isTaskLine = usesMarkers ? MARKER_RE.test(line) : true;
    if (isTaskLine) {
      const cleaned = stripMarkers(line);
      if (!cleaned || cleaned.length < 2) continue;
      // guess project off the ORIGINAL (Hebrew keywords matter), then translate
      const guess = guessProject(cleaned, projects);
      const title = translateTitle(cleaned);
      const priority = detectPriority(`${curLabel ?? ''} ${cleaned}`, curDeadline, today);
      current = {
        id: tmpId(),
        title,
        original: title !== cleaned ? cleaned : undefined,
        projectId: guess?.projectId,
        priority,
        reason: guess?.reason,
        dateKey: curDate,
        deadline: curDeadline,
        sectionLabel: curLabel,
      };
      out.push(current);
    } else if (current) {
      // a continuation line → append to the current task's description
      const piece = translateText(stripMarkers(line));
      current.description = current.description ? `${current.description}\n${piece}` : piece;
    }
  }

  return out;
}

// ---- command intent (the chat is command-driven) ---------------------------

/**
 * Work out whether the user asked for ONE task or SEVERAL, and strip the
 * command lead-in ("Create a task:", "make these tasks and spread …:").
 * Returns mode 'ask' when it genuinely can't tell — the chat then asks.
 */
export function detectIntent(raw: string): { mode: 'one' | 'several' | 'ask'; body: string } {
  const trimmed = raw.trim();
  let command = '';
  let body = trimmed;

  const colon = trimmed.match(/^([^\n:]{1,80}):\s*([\s\S]+)$/);
  if (colon && /(create|make|add|task)/i.test(colon[1])) {
    command = colon[1];
    body = colon[2].trim();
  } else {
    const first = trimmed.split('\n')[0];
    if (/^(create|make|add|new)\b/i.test(first) && first.length < 80) {
      command = first;
      body = trimmed.slice(first.length).trim() || trimmed;
    }
  }

  const scope = (command || trimmed).toLowerCase();
  const plural = /\btasks\b|\bspread\b|across the (week|day)|\beach\b|\bthese\b/.test(scope);
  const singular = /\ba task\b|\bone task\b|\bthis\b|make this/.test(scope);
  const mode = plural && !singular ? 'several' : singular && !plural ? 'one' : 'ask';
  return { mode, body: body || trimmed };
}

/** Turn a whole pasted block into ONE task — title = first line, rest = note. */
export function parseSingleTask(text: string, projects: Project[], today = new Date()): ParsedTask {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const titleRaw = stripMarkers(lines[0] || text.trim());
  const descRaw = lines.slice(1).map((l) => stripMarkers(l)).filter(Boolean).join('\n');

  let dateKey: string | undefined;
  let deadline: string | undefined;
  let label: string | undefined;
  for (const l of lines) {
    const h = parseHeader(l);
    if (h) { const d = toDateKey(nextWeekday(h.dow, today)); dateKey = d; deadline = h.by ? d : undefined; label = h.label; break; }
  }

  const guess = guessProject(text, projects);
  const title = translateTitle(titleRaw);
  return {
    id: tmpId(),
    title,
    original: title !== titleRaw ? titleRaw : undefined,
    description: descRaw ? translateText(descRaw) : undefined,
    projectId: guess?.projectId,
    priority: detectPriority(text, deadline, today),
    reason: guess?.reason,
    dateKey,
    deadline,
    sectionLabel: label,
  };
}

// ---- auto-scheduling (spread day-less tasks across the work week) ----------

const PRIO_RANK: Record<TaskPriority, number> = { asap: 0, high: 1, normal: 2, low: 3 };

export interface ScheduleOpts {
  today?: Date;
  /** Work days as JS weekday numbers (0=Sun … 6=Sat). Default Mon–Fri. */
  workdays?: number[];
  /** Hours of focus per day before a day is "full". Default 8. */
  capacityHours?: number;
  /** Assumed hours per task when the paste gives no estimate. Default 2. */
  defaultEstimateHours?: number;
}

/**
 * Fill in a `dateKey` for every task that didn't get one from an explicit day
 * header. Tasks already pinned to a day are left untouched. Day-less tasks are
 * packed most-urgent-first into upcoming work days up to a daily capacity,
 * rolling into the next work day when a day fills up.
 */
export function autoSchedule(tasks: ParsedTask[], opts: ScheduleOpts = {}): ParsedTask[] {
  const workdays = opts.workdays ?? [1, 2, 3, 4, 5];
  const cap = opts.capacityHours ?? 8;
  const est = opts.defaultEstimateHours ?? 2;
  const today = opts.today ? new Date(opts.today) : new Date();
  today.setHours(0, 0, 0, 0);

  const isWork = (d: Date) => workdays.includes(d.getDay());
  const cursor = new Date(today);
  while (!isWork(cursor)) cursor.setDate(cursor.getDate() + 1);
  let load = 0;

  const dayless = tasks.filter((t) => !t.dateKey).sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority]);
  const assigned = new Map<string, string>();
  for (const t of dayless) {
    if (load > 0 && load + est > cap) {
      do { cursor.setDate(cursor.getDate() + 1); } while (!isWork(cursor));
      load = 0;
    }
    assigned.set(t.id, toDateKey(cursor));
    load += est;
  }
  return tasks.map((t) => (t.dateKey ? t : { ...t, dateKey: assigned.get(t.id), autoScheduled: true }));
}

/** Score each project by keyword hits in its category; return the best match. */
export function guessProject(
  title: string,
  projects: Project[]
): { projectId: string; reason?: string } | undefined {
  if (projects.length === 0) return undefined;
  const t = title.toLowerCase();

  let best: { projectId: string; score: number; reason?: string } | null = null;
  for (const p of projects) {
    const cat = projectCat(p.name);
    let score = 0;
    let hit: string | undefined;
    for (const kw of CAT_KEYWORDS[cat]) {
      if (t.includes(kw.toLowerCase())) {
        score += kw.length > 4 ? 2 : 1; // longer/more-specific keywords weigh more
        if (!hit) hit = kw;
      }
    }
    if (!best || score > best.score) best = { projectId: p.id, score, reason: hit };
  }

  // No keyword hit anywhere → default to a "web" project if present, else first.
  if (!best || best.score === 0) {
    const web = projects.find((p) => projectCat(p.name) === 'web') || projects[0];
    return { projectId: web.id, reason: undefined };
  }
  return { projectId: best.projectId, reason: best.reason ? `matched “${best.reason}”` : undefined };
}
