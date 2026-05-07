import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Client,
  Entry,
  Invoice,
  InvoiceLineItem,
  InvoicingSettings,
  Project,
  RateOverrides,
  Settings,
  Task,
} from './types';
import {
  addDaysToKey,
  computeTieredAmount,
  describeTierSegment,
  effectiveRate,
  entrySeconds,
  formatInvoiceNumber,
  monthKeyFromDateKey,
  roundHours,
  splitHoursIntoTiers,
  todayKey,
  uid,
} from './utils';

const DEFAULT_COLORS = ['#171717', '#0F5D3A', '#0068d6', '#7928ca', '#b45309', '#b91c1c', '#0891b2', '#db2777'];

const DEFAULT_INVOICING: InvoicingSettings = {
  from: {},
  payment: {},
  terms: 'Payment due within 7 days.',
  numberPrefix: 'INV-',
  nextNumber: 1,
  defaultDueDays: 7,
  defaultTaxRate: 0,
};

interface State {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  entries: Entry[];
  invoices: Invoice[];
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

  // Rate overrides
  setRateOverride: (monthKey: string, projectId: string, rate: number | null) => void;

  // Invoices
  generateInvoiceFromMonth: (clientId: string, monthKey: string) => Invoice;
  addInvoice: (data: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'status'>) => Invoice;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  finalizeInvoice: (id: string) => void;
  reopenInvoice: (id: string) => void;
  deleteInvoice: (id: string) => void;

  // Settings
  updateSettings: (data: Partial<Settings>) => void;
  updateInvoicingSettings: (data: Partial<InvoicingSettings>) => void;

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
  invoices: [],
  rateOverrides: {},
  settings: {
    weekStart: 'mon',
    timeFormat: 'hhmm',
    currencySymbol: '$',
    invoicing: DEFAULT_INVOICING,
  },
};

export const DEFAULT_PROJECT_COLORS = DEFAULT_COLORS;

/**
 * Legacy shape: projects used to carry `client: string` + `hourlyRate`.
 * Convert to clients[] entity + project.clientId.
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

function normalizeSettings(s: Partial<Settings> | undefined): Settings {
  const base = initialState.settings;
  if (!s) return base;
  return {
    ...base,
    ...s,
    invoicing: {
      ...DEFAULT_INVOICING,
      ...(s.invoicing ?? {}),
      from: { ...(s.invoicing?.from ?? {}) },
      payment: { ...(s.invoicing?.payment ?? {}) },
    },
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ---------- Clients ----------
      addClient: ({ name, color, hourlyRate, notes, billing }) => {
        const c: Client = {
          id: uid(),
          name: name.trim(),
          color: color || DEFAULT_COLORS[0],
          hourlyRate: hourlyRate && hourlyRate > 0 ? hourlyRate : undefined,
          notes: notes?.trim() || undefined,
          billing: billing && Object.values(billing).some((v) => v && String(v).trim()) ? billing : undefined,
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
      addProject: ({ clientId, name, color, status, hourlyRate, rateTiers }) => {
        const p: Project = {
          id: uid(),
          clientId,
          name,
          color,
          status: status || 'active',
          hourlyRate: hourlyRate && hourlyRate > 0 ? hourlyRate : undefined,
          rateTiers: rateTiers && rateTiers.length > 0 ? rateTiers : undefined,
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
                  rateTiers:
                    data.rateTiers !== undefined
                      ? data.rateTiers && data.rateTiers.length > 0
                        ? data.rateTiers
                        : undefined
                      : p.rateTiers,
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

      // ---------- Invoices ----------
      generateInvoiceFromMonth: (clientId, monthKey) => {
        const state = get();
        const client = state.clients.find((c) => c.id === clientId);
        if (!client) throw new Error('Client not found');

        const projects = state.projects.filter((p) => p.clientId === clientId);
        const projectIdSet = new Set(projects.map((p) => p.id));
        const monthEntries = state.entries.filter(
          (e) => projectIdSet.has(e.projectId) && monthKeyFromDateKey(e.date) === monthKey
        );

        const projectSeconds = new Map<string, number>();
        for (const e of monthEntries) {
          const prev = projectSeconds.get(e.projectId) || 0;
          projectSeconds.set(e.projectId, prev + entrySeconds(e));
        }

        const lineItems: InvoiceLineItem[] = [];
        const sortedProjects = projects
          .filter((p) => projectSeconds.has(p.id))
          .sort((a, b) => (projectSeconds.get(b.id)! - projectSeconds.get(a.id)!));

        for (const p of sortedProjects) {
          const seconds = projectSeconds.get(p.id) || 0;
          const hours = seconds / 3600;
          const monthOverride = state.rateOverrides?.[monthKey]?.[p.id];

          if (p.rateTiers && p.rateTiers.length > 0 && monthOverride == null) {
            const segments = splitHoursIntoTiers(hours, p.rateTiers);
            for (const seg of segments) {
              if (seg.hours <= 0) continue;
              lineItems.push({
                id: uid(),
                description: `${p.name} — ${describeTierSegment(seg)}`,
                quantity: roundHours(seg.hours),
                unitPrice: seg.rate,
              });
            }
          } else {
            const rate = monthOverride != null ? monthOverride : effectiveRate(p, client);
            lineItems.push({
              id: uid(),
              description: p.name,
              quantity: roundHours(hours),
              unitPrice: rate,
            });
          }
        }

        const inv = state.settings.invoicing;
        const issueDate = todayKey();
        const dueDate = addDaysToKey(issueDate, inv.defaultDueDays || 0);
        const number = formatInvoiceNumber(inv.numberPrefix || 'INV-', inv.nextNumber || 1);

        const invoice: Invoice = {
          id: uid(),
          number,
          status: 'draft',
          issueDate,
          dueDate,
          clientId,
          monthKey,
          billFrom: { ...inv.from },
          billTo: { ...(client.billing ?? {}) },
          payment: { ...inv.payment },
          lineItems,
          taxRate: inv.defaultTaxRate || 0,
          terms: inv.terms,
          currencySymbol: state.settings.currencySymbol,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          invoices: [...s.invoices, invoice],
          settings: {
            ...s.settings,
            invoicing: {
              ...s.settings.invoicing,
              nextNumber: (s.settings.invoicing.nextNumber || 1) + 1,
            },
          },
        }));
        return invoice;
      },

      addInvoice: (data) => {
        const state = get();
        const inv = state.settings.invoicing;
        const number = formatInvoiceNumber(inv.numberPrefix || 'INV-', inv.nextNumber || 1);
        const invoice: Invoice = {
          ...data,
          id: uid(),
          number,
          status: 'draft',
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          invoices: [...s.invoices, invoice],
          settings: {
            ...s.settings,
            invoicing: {
              ...s.settings.invoicing,
              nextNumber: (s.settings.invoicing.nextNumber || 1) + 1,
            },
          },
        }));
        return invoice;
      },
      updateInvoice: (id, data) =>
        set((s) => ({
          invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, ...data } : inv)),
        })),
      finalizeInvoice: (id) =>
        set((s) => ({
          invoices: s.invoices.map((inv) =>
            inv.id === id ? { ...inv, status: 'final', finalizedAt: new Date().toISOString() } : inv
          ),
        })),
      reopenInvoice: (id) =>
        set((s) => ({
          invoices: s.invoices.map((inv) =>
            inv.id === id ? { ...inv, status: 'draft', finalizedAt: undefined } : inv
          ),
        })),
      deleteInvoice: (id) =>
        set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) })),

      updateSettings: (data) =>
        set((s) => ({
          settings: {
            ...s.settings,
            ...data,
            invoicing: data.invoicing
              ? { ...s.settings.invoicing, ...data.invoicing }
              : s.settings.invoicing,
          },
        })),
      updateInvoicingSettings: (data) =>
        set((s) => ({
          settings: {
            ...s.settings,
            invoicing: {
              ...s.settings.invoicing,
              ...data,
              from: { ...s.settings.invoicing.from, ...(data.from ?? {}) },
              payment: { ...s.settings.invoicing.payment, ...(data.payment ?? {}) },
            },
          },
        })),

      // ---------- Data ----------
      exportAll: () => {
        const { clients, projects, tasks, entries, invoices, rateOverrides, settings } = get();
        return JSON.stringify(
          { version: 4, clients, projects, tasks, entries, invoices, rateOverrides, settings },
          null,
          2
        );
      },
      importAll: (json) => {
        try {
          const parsed = JSON.parse(json);
          if (!parsed || typeof parsed !== 'object') throw new Error('Invalid data');
          const {
            projects = [],
            tasks = [],
            entries = [],
            invoices = [],
            rateOverrides,
            settings,
          } = parsed;
          let { clients = [] } = parsed;
          if (
            !Array.isArray(projects) ||
            !Array.isArray(tasks) ||
            !Array.isArray(entries) ||
            !Array.isArray(invoices)
          ) {
            throw new Error('Missing required arrays');
          }
          const migrated = migrateLegacyProjects({ clients, projects });
          clients = migrated.clients ?? clients;
          const newProjects = migrated.projects ?? projects;
          set({
            clients,
            projects: newProjects,
            tasks,
            entries,
            invoices,
            rateOverrides: rateOverrides && typeof rateOverrides === 'object' ? rateOverrides : {},
            settings: normalizeSettings(settings),
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
      version: 4,
      migrate: (persisted) => persisted as State,
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
          invoices: p.invoices ?? [],
          rateOverrides: p.rateOverrides ?? {},
          settings: normalizeSettings(p.settings),
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

/** Helpers used by the report views to compute consistent earnings. */
export const computeProjectMonthAmount = (
  hours: number,
  project: Project | undefined,
  client: Client | undefined,
  monthOverride: number | undefined
): number => {
  if (monthOverride != null) return hours * monthOverride;
  if (project?.rateTiers && project.rateTiers.length > 0) {
    return computeTieredAmount(hours, project.rateTiers);
  }
  const rate = effectiveRate(project, client, undefined);
  return hours * rate;
};
