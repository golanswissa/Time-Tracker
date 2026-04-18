export type ProjectStatus = 'active' | 'archived';

export interface Client {
  id: string;
  name: string;
  color: string;
  /** Default hourly rate for all projects under this client. Projects may override. */
  hourlyRate?: number;
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  /** The owning client. Every project must belong to one client. */
  clientId: string;
  name: string;
  color: string;
  status: ProjectStatus;
  /** Project-level override of the client's hourly rate. Undefined = inherit client rate. */
  hourlyRate?: number;
  createdAt: string; // ISO timestamp
}

/**
 * Per-month rate overrides. Outer key is a month in YYYY-MM (local),
 * inner key is projectId, value is the rate for that project in that month.
 * Missing entry means: fall back to the project's default hourlyRate.
 */
export type RateOverrides = Record<string, Record<string, number>>;

export interface Task {
  id: string;
  name: string;
  active: boolean;
}

export interface Entry {
  id: string;
  projectId: string;
  taskId: string;
  notes: string;
  date: string; // YYYY-MM-DD (local)
  durationSeconds: number;
  isRunning: boolean;
  startedAt?: string; // ISO when currently running
}

export type WeekStart = 'mon' | 'sun';
export type TimeFormat = 'hhmm' | 'decimal';

export interface Settings {
  weekStart: WeekStart;
  timeFormat: TimeFormat;
  currencySymbol: string; // e.g. "$"
  defaultProjectId?: string;
  defaultTaskId?: string;
}

export type Route = 'timer' | 'clients' | 'reports' | 'projects' | 'tasks' | 'settings';
