import type { Entry, ScheduledTask, TaskPriority, TaskStatus, TaskKind } from './types';
import { entrySeconds } from './utils';

/**
 * Task lifecycle — the user's four states, mapped onto the stored values.
 * Pending(todo) → Working(doing) → Under review(blocked) → Done(done).
 * Pending + Working stay in the day list and roll forward; Under review parks
 * in the bottom banner; Done leaves the list.
 */
export const STATUS_META: Record<TaskStatus, { label: string; c: string }> = {
  todo: { label: 'To do', c: '#9aa0a6' },
  doing: { label: 'In Progress', c: '#a9870b' },
  blocked: { label: 'In Review', c: '#b4502a' },
  done: { label: 'Done', c: '#0f7a45' },
};
export const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'blocked', 'done'];
/** Statuses that keep a task active in the day list (and rolling forward). */
export const ACTIVE_STATUSES: TaskStatus[] = ['todo', 'doing'];

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  asap: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  asap: { label: 'ASAP', color: '#b91c1c' },
  high: { label: 'High', color: '#b45309' },
  normal: { label: 'Normal', color: '#4d4d4d' },
  low: { label: 'Low', color: '#808080' },
};

export const KIND_META: Record<TaskKind, { label: string }> = {
  design: { label: 'Design' },
  print: { label: 'Print' },
  meeting: { label: 'Meeting' },
  email: { label: 'Email' },
  admin: { label: 'Admin' },
};

/** Sum of tracked seconds across every time entry linked to a task. */
export const actualSecondsForTask = (
  entries: Entry[],
  taskId: string,
  now = Date.now()
): number =>
  entries
    .filter((e) => e.scheduledTaskId === taskId)
    .reduce((acc, e) => acc + entrySeconds(e, now), 0);

/** Tracked seconds for a task on a single day (entries dated `dateKey`). */
export const actualSecondsForTaskOnDay = (
  entries: Entry[],
  taskId: string,
  dateKey: string,
  now = Date.now()
): number =>
  entries
    .filter((e) => e.scheduledTaskId === taskId && e.date === dateKey)
    .reduce((acc, e) => acc + entrySeconds(e, now), 0);

export interface DayCapacity {
  /** Sum of estimates of that day's tasks. */
  plannedHours: number;
  /** Actual time tracked that day (all entries). */
  trackedSeconds: number;
  availableHours: number;
  /** planned − available, clamped ≥ 0. */
  overHours: number;
}

export const dayCapacity = (
  tasks: ScheduledTask[],
  entries: Entry[],
  dateKey: string,
  availableHours: number,
  now = Date.now()
): DayCapacity => {
  const dayTasks = tasks.filter((t) => t.date === dateKey);
  const plannedHours = dayTasks.reduce((acc, t) => acc + (t.estimateHours || 0), 0);
  const trackedSeconds = entries
    .filter((e) => e.date === dateKey)
    .reduce((acc, e) => acc + entrySeconds(e, now), 0);
  return {
    plannedHours,
    trackedSeconds,
    availableHours,
    overHours: Math.max(0, plannedHours - availableHours),
  };
};

/** Sort: incomplete first (asap → low), done last; tie-break on deadline. */
export const sortTasks = (a: ScheduledTask, b: ScheduledTask): number => {
  const doneA = a.status === 'done' ? 1 : 0;
  const doneB = b.status === 'done' ? 1 : 0;
  if (doneA !== doneB) return doneA - doneB;
  const pa = PRIORITY_ORDER[a.priority];
  const pb = PRIORITY_ORDER[b.priority];
  if (pa !== pb) return pa - pb;
  const da = a.deadline || '9999-99';
  const db = b.deadline || '9999-99';
  return da < db ? -1 : da > db ? 1 : 0;
};

/**
 * Deadline proximity for a card chip. `tone`: 'over' (past due) · 'soon'
 * (today/tomorrow) · 'near' (≤3 days) · 'far'. Returns null when no deadline.
 */
export const dueInfo = (
  deadline: string | undefined,
  todayKey: string
): { label: string; tone: 'over' | 'soon' | 'near' | 'far'; days: number } | null => {
  if (!deadline) return null;
  const ms = 86400000;
  const a = new Date(todayKey + 'T00:00:00');
  const b = new Date(deadline + 'T00:00:00');
  const days = Math.round((b.getTime() - a.getTime()) / ms);
  let label: string;
  if (days < 0) label = `${-days}d overdue`;
  else if (days === 0) label = 'Due today';
  else if (days === 1) label = 'Due tomorrow';
  else label = `Due in ${days}d`;
  const tone = days < 0 ? 'over' : days <= 1 ? 'soon' : days <= 3 ? 'near' : 'far';
  return { label, tone, days };
};

/** Pull http(s) URLs out of a blob of pasted text. */
export const extractLinks = (text: string): string[] => {
  const re = /https?:\/\/[^\s)]+/g;
  return Array.from(new Set(text.match(re) || []));
};

/** Short host label for a link chip, e.g. "figma.com". */
export const linkLabel = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 30);
  }
};
