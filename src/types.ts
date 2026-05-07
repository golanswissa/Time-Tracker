export type ProjectStatus = 'active' | 'archived';

export interface Client {
  id: string;
  name: string;
  color: string;
  /** Default hourly rate for all projects under this client. Projects may override. */
  hourlyRate?: number;
  notes?: string;
  /** Bill-to details used when generating invoices for this client. */
  billing?: ClientBilling;
  createdAt: string;
}

export interface ClientBilling {
  companyName?: string;
  contactName?: string;
  email?: string;
  /** Multi-line address. Newlines preserved on the invoice. */
  address?: string;
}

/**
 * A tier in a rate plan. Hours below `uptoHours` (cumulative for the month)
 * bill at `rate`. The last tier should omit `uptoHours` to mean "no cap".
 */
export interface RateTier {
  uptoHours?: number;
  rate: number;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  color: string;
  status: ProjectStatus;
  /** Project-level override of the client's hourly rate. Undefined = inherit client rate. */
  hourlyRate?: number;
  /**
   * Optional tiered billing. When set, monthly invoices for this project split
   * hours into segments per tier instead of using a flat rate.
   * If a month override is set on this project, it takes precedence over tiers.
   */
  rateTiers?: RateTier[];
  createdAt: string;
}

/**
 * Per-month rate overrides. Outer key is YYYY-MM (local), inner key is projectId.
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
  startedAt?: string;
}

export type WeekStart = 'mon' | 'sun';
export type TimeFormat = 'hhmm' | 'decimal';

export interface InvoiceFromDetails {
  name?: string;
  email?: string;
  address?: string;
}

export interface InvoicePaymentDetails {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bsb?: string;
  swift?: string;
  bankAddress?: string;
}

export interface InvoicingSettings {
  from: InvoiceFromDetails;
  payment: InvoicePaymentDetails;
  /** Default payment terms shown on every invoice. */
  terms?: string;
  /** Default invoice number prefix, e.g. "INV-". */
  numberPrefix: string;
  /** Next invoice number to assign. Auto-increments on creation. */
  nextNumber: number;
  /** Default due-by horizon, in days from issue date. */
  defaultDueDays: number;
  /** Default tax rate (percentage, 0-100). 0 disables tax line. */
  defaultTaxRate: number;
}

export interface Settings {
  weekStart: WeekStart;
  timeFormat: TimeFormat;
  currencySymbol: string;
  defaultProjectId?: string;
  defaultTaskId?: string;
  invoicing: InvoicingSettings;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  /** Quantity — typically hours, but can be units for flat-fee items. */
  quantity: number;
  unitPrice: number;
}

export type InvoiceStatus = 'draft' | 'final';

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;
  clientId: string;
  /** If generated from a monthly report, the month it covers (YYYY-MM). */
  monthKey?: string;
  /** Snapshotted at creation; editable on draft. */
  billFrom: InvoiceFromDetails;
  billTo: ClientBilling;
  payment: InvoicePaymentDetails;
  lineItems: InvoiceLineItem[];
  /** Tax rate (percentage). 0 means no tax line. */
  taxRate: number;
  notes?: string;
  terms?: string;
  currencySymbol: string;
  createdAt: string;
  finalizedAt?: string;
}

export type Route =
  | 'timer'
  | 'clients'
  | 'reports'
  | 'projects'
  | 'tasks'
  | 'invoices'
  | 'settings';
