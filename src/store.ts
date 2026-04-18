import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Client, Entry, Project, RateOverrides, Settings, Task } from './types';
import { todayKey, uid } from './utils';

const DEFAULT_COLORS = ['#171717', '#0F5D3A', '#0068d6', '#7928ca', '#b45309', '#b91c1c', '#0891b2', '#db2777'];

interface State {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  entries: Entry[];
  rateOverrides: RateOverrides;
  settings: Settings;
}

interface Actions {
  // Clients
  addClient: (data: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string, strategy?: 'cascade' | 'orphan') => void;

  // Projects
  addProject: (data: Omit<Project, 'id' | 'createdAt' | 'status'> & { status?: 'active' | 'archived' }) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Tasks
  addTask: (name: string) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Entries
  addEntry: (data: Omit<Entry, 'id'>) => Entry;
  updateEntry: (id: string, data: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
  setEntryDuration: (id: string, seconds: number) => void;

  // Timer
  startTimer: (projectId: string, taskId: string, notes: string) => Entry;
  stopTimer: () => void;
  resumeEntry: (entryId: string) => void;

  // Rate overrides (per-month, per-project)
  setRateOverride: (monthKey: string, projectId: string, rate: number | null) => void;

  // Settings
  updateSettings: (data: Partial<Settings>) => void;

  // Data
  exportAll: () => string;
  importAll: (json: string) => { ok: true } | { ok: false; error: string };
  clearAll: () => void;
}

export type Store = State & Actions;

const initialState: State = {
  clients: [],
  projects: [],
  tasks: [],
  entries: [],
  rateOverrides: {},
  settings: {
    weekStart: 'mon',
    timeFormat: 'hhmm',
    currencySymbol: '$',
  },
};

export const DEFAULT_PROJECT_COLORS = DEFAULT_COLORS;

/**
 * Legacy shape: projects used to carry `client: string` + `hourlyRate`.
 * Convert to clients[] entity + project.clientId.
 * Each distinct legacy client name (case-insensitive, trimmed) becomes one client.
 * Hourly rate on the legacy project is preserved as project.hourlyRate.
 */
function migrateLegacyProjects(state: Partial<State>): Partial<State> {
  const legacyProjects = (state.projects ?? []) as Array<Project & { client?: string }>;
  const hasLegacy = legacyProjects.some((p) => 'client' in p && !(p as Project).clientId);
  if (!hasLegacy) return state;

  const existingClients = state.clients ?? [];
  const byName = new Map<string, Client>();
  existingClients.forEach((c) => byName.set(c.name.trim().toLowerCase(), c));

  const newClients: Client[] = [...existingClients];
  const newProjects: Project[] = legacyProjects.map((p) => {
    if ((p as Project).clientId) {
      const { client: _legacy, ...rest } = p as Project & { client?: string };
      return rest as Project;
    }
    const rawName = (p.client ?? 'Personal').trim() || 'Personal';
    const key = rawName.toLowerCase();
    let c = byName.get(key);
    if (!c) {
      c = {
        id: uid(),
        name: rawName,
        color: p.color || DEFAULT_COLORS[0],
        hourlyRate: undefined,
        createdAt: new Date().toISOString(),
      };
      byName.set(key, c);
      newClients.push(c);
    }
    const { client: _legacy, ...rest } = p as Project & { client?: string };
    return { ...(rest as Project), clientId: c.id };
  });

  return { ...state, clients: newClients, projects: newProjects };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ---------- Clients ----------
      addClient: ({ name, color, hourlyRate, notes }) => {
        const c: Client = {
          id: uid(),
          name: name.trim(),
          color: color || DEFAULT_COLORS[0],
          hourlyRate: hourlyRate && hourlyRate > 0 ? hourlyRate : undefined,
          notes: notes?.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ clients: [...s.clients, c] }));
        return c;
      },
      updateClient: (id, data) =>
        set((s) => ({
          clients: s.clients.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...data,
                  // normalize empty/zero rate to undefined
                  hourlyRate:
                    data.hourlyRate !== undefined
                      ? data.hourlyRate && data.hourlyRate > 0
                        ? data.hourlyRate
                        : undefined
                      : c.hourlyRate,
                }
              : c
          ),
        })),
      deleteClient: (id, strategy = 'cascade') =>
        set((s) => {
          const projectIds = s.projects.filter((p) => p.clientId === id).map((p) => p.id);
          if (strategy === 'cascade') {
            return {
              clients: s.clients.filter((c) => c.id !== id),
              projects: s.projects.filter((p) => p.clientId !== id),
              entries: s.entries.filter((e) => !projectIds.includes(e.projectId)),
            };
          }
          // 'orphan' strategy: projects survive but lose their client — create a "Personal" fallback
          const fallback = s.clients.find((c) => c.name === 'Personal') ?? {
            id: uid(),
            name: 'Personal',
            color: DEFAULT_COLORS[0],
            hourlyRate: undefined,
            notes: undefined,
            createdAt: new Date().toISOString(),
          };
          const nextClients = s.clients.find((c) => c.id === fallback.id)
            ? s.clients.filter((c) => c.id !== id)
            : [...s.clients.filter((c) => c.id !== id), fallback];
          return {
            clients: nextClients,
            projects: s.projects.map((p) => (p.clientId === id ? { ...p, clientId: fallback.id } : p)),
          };
        }),

      // ---------- Projects ----------
      addProject: ({ clientId, name, color, status, hourlyRate }) => {
        const p: Project = {
          id: uid(),
          clientId,
          name,
          color,
          status: status || 'active',
          hourlyRate: hourlyRate && hourlyRate > 0 ? hourlyRate : undefined,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ projects: [...s.projects, p] }));
        return p;
      },
      updateProject: (id, data) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...data,
                  hourlyRate:
                    data.hourlyRate !== undefined
                      ? data.hourlyRate && data.hourlyRate > 0
                        ? data.hourlyRate
                        : undefined
                      : p.hourlyRate,
                }
              : p
          ),
        })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          entries: s.entries.filter((e) => e.projectId !== id),
        })),

      // ---------- Tasks ----------
      addTask: (name) => {
        const t: Task = { id: uid(), name, active: true };
        set((s) => ({ tasks: [...s.tasks, t] }));
        return t;
      },
      updateTask: (id, data) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          entries: s.entries.filter((e) => e.taskId !== id),
        })),

      // ---------- Entries ----------
      addEntry: (data) => {
        const e: Entry = { ...data, id: uid() };
        set((s) => ({ entries: [...s.entries, e] }));
        return e;
      },
      updateEntry: (id, data) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...data } : e)),
        })),
      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      setEntryDuration: (id, seconds) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id
              ? { ...e, durationSeconds: Math.max(0, Math.floor(seconds)), isRunning: false, startedAt: undefined }
              : e
          ),
        })),

      // ---------- Timer ----------
      startTimer: (projectId, taskId, notes) => {
        get().stopTimer();
        const entry: Entry = {
          id: uid(),
          projectId,
          taskId,
          notes,
          date: todayKey(),
          durationSeconds: 0,
          isRunning: true,
          startedAt: new Date().toISOString(),
        };
        set((s) => ({ entries: [...s.entries, entry] }));
        return entry;
      },
      stopTimer: () => {
        const running = get().entries.find((e) => e.isRunning);
        if (!running || !running.startedAt) return;
        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(running.startedAt).getTime()) / 1000));
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === running.id
              ? { ...e, durationSeconds: e.durationSeconds + elapsed, isRunning: false, startedAt: undefined }
              : e
          ),
        }));
      },
      resumeEntry: (entryId) => {
        get().stopTimer();
        const src = get().entries.find((e) => e.id === entryId);
        if (!src) return;
        const newEntry: Entry = {
          id: uid(),
          projectId: src.projectId,
          taskId: src.taskId,
          notes: src.notes,
          date: todayKey(),
          durationSeconds: 0,
          isRunning: true,
          startedAt: new Date().toISOString(),
        };
        set((s) => ({ entries: [...s.entries, newEntry] }));
      },

      // ---------- Rate overrides ----------
      setRateOverride: (monthKey, projectId, rate) =>
        set((s) => {
          const current = s.rateOverrides || {};
          const forMonth = { ...(current[monthKey] || {}) };
          if (rate === null || rate === undefined || isNaN(rate)) {
            delete forMonth[projectId];
          } else {
            forMonth[projectId] = Math.max(0, rate);
          }
          const next = { ...current };
          if (Object.keys(forMonth).length === 0) {
            delete next[monthKey];
          } else {
            next[monthKey] = forMonth;
          }
          return { rateOverrides: next };
        }),

      updateSettings: (data) => set((s) => ({ settings: { ...s.settings, ...data } })),

      // ---------- Data ----------
      exportAll: () => {
        const { clients, projects, tasks, entries, rateOverrides, settings } = get();
        return JSON.stringify(
          { version: 3, clients, projects, tasks, entries, rateOverrides, settings },
          null,
          2
        );
      },
      importAll: (json) => {
        try {
          const parsed = JSON.parse(json);
          if (!parsed || typeof parsed !== 'object') throw new Error('Invalid data');
          const { projects = [], tasks = [], entries = [], rateOverrides, settings } = parsed;
          let { clients = [] } = parsed;
          if (!Array.isArray(projects) || !Array.isArray(tasks) || !Array.isArray(entries)) {
            throw new Error('Missing required arrays');
          }
          // Migrate legacy projects if needed
          const migrated = migrateLegacyProjects({ clients, projects });
          clients = migrated.clients ?? clients;
          const newProjects = migrated.projects ?? projects;
          set({
            clients,
            projects: newProjects,
            tasks,
            entries,
            rateOverrides: rateOverrides && typeof rateOverrides === 'object' ? rateOverrides : {},
            settings: { ...initialState.settings, ...(settings || {}) },
          });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
      clearAll: () => set({ ...initialState }),
    }),
    {
      name: 'tracker:v1',
      version: 3,
      migrate: (persisted) => {
        // We rely on `merge` below to reshape legacy data, so pass through as-is.
        return persisted as State;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        const migrated = migrateLegacyProjects({
          clients: p.clients,
          projects: p.projects,
        });
        return {
          ...current,
          ...p,
          clients: migrated.clients ?? p.clients ?? [],
          projects: migrated.projects ?? p.projects ?? [],
          rateOverrides: p.rateOverrides ?? {},
          settings: { ...current.settings, ...(p.settings ?? {}) },
        };
      },
    }
  )
);

// --- seed defaults for first run ---
export const seedIfEmpty = () => {
  const { clients, projects, tasks, addClient, addProject, addTask } = useStore.getState();
  if (clients.length === 0) {
    const personal = addClient({ name: 'Personal', color: '#171717', hourlyRate: undefined });
    addClient({ name: 'Acme Co.', color: '#0068d6', hourlyRate: 120 });
    if (projects.length === 0) {
      addProject({ clientId: personal.id, name: 'Site redesign', color: '#171717' });
      addProject({ clientId: personal.id, name: 'Learning', color: '#0F5D3A' });
    }
  }
  if (tasks.length === 0) {
    ['Development', 'Design', 'Research', 'Meetings', 'Writing'].forEach((name) => addTask(name));
  }
};
