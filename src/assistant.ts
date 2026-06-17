import type { ParsedTask } from './taskParser';
import type { Client, Project, TaskPriority } from './types';
import { todayKey } from './utils';

/**
 * Frontend bridge to the Claude-powered assistant (the /api/assistant Vercel
 * function). Sends the user's message plus lightweight context (project/client
 * names, today's date) and returns proposed tasks in the SAME `ParsedTask[]`
 * shape the local parser produces — so the chat's approve flow is unchanged.
 *
 * Returns null when the backend isn't reachable (local dev / preview / no key),
 * so the caller can fall back to the offline rule-based parser.
 */
export interface AiResult {
  tasks: ParsedTask[];
  reply?: string;
  clarify?: string;
}

let _uid = 0;
const tempId = () => `ai${Date.now().toString(36)}${_uid++}`;
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const PRIOS: TaskPriority[] = ['high', 'normal', 'low'];

export async function aiCapture(message: string, projects: Project[], clients: Client[]): Promise<AiResult | null> {
  let data: unknown;
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message,
        today: todayKey(),
        projects: projects.map((p) => ({ id: p.id, name: p.name, clientId: p.clientId })),
        clients: clients.map((c) => ({ id: c.id, name: c.name })),
      }),
    });
    if (!res.ok) return null; // 404 (no function) / 500 (no key) → fall back to local
    data = await res.json();
  } catch {
    return null; // offline / network error
  }

  const d = (data ?? {}) as { tasks?: unknown[]; reply?: unknown; clarify?: unknown };
  const reply = str(d.reply);
  const clarify = str(d.clarify);
  const rawTasks = Array.isArray(d.tasks) ? d.tasks : [];
  if (clarify && rawTasks.length === 0) return { tasks: [], clarify, reply };

  const validProjects = new Set(projects.map((p) => p.id));
  const tasks: ParsedTask[] = rawTasks.map((raw) => {
    const t = (raw ?? {}) as Record<string, unknown>;
    const pid = str(t.projectId);
    const prio = str(t.priority) as TaskPriority | undefined;
    return {
      id: tempId(),
      title: str(t.title) || 'Untitled task',
      original: str(t.original),
      description: str(t.description),
      projectId: pid && validProjects.has(pid) ? pid : undefined,
      priority: prio && PRIOS.includes(prio) ? prio : 'normal',
      dateKey: str(t.dateKey),
      deadline: str(t.deadline),
      reason: str(t.reason),
    };
  });
  return { tasks, reply };
}
