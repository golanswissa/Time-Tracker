import type { Entry, ScheduledTask, TaskPriority, TaskKind } from './types';
import { entrySeconds } from './utils';

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
