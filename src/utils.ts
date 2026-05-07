export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Return YYYY-MM-DD in local time for a Date. */
export const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayKey = (): string => toDateKey(new Date());

export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, days: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

/** Start of week for the given date, honoring weekStart setting. */
export const startOfWeek = (d: Date, weekStart: 'mon' | 'sun' = 'mon'): Date => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay(); // 0 = Sun
  const offset = weekStart === 'mon' ? (day === 0 ? 6 : day - 1) : day;
  r.setDate(r.getDate() - offset);
  return r;
};

export const weekDays = (ref: Date, weekStart: 'mon' | 'sun' = 'mon'): Date[] => {
  const start = startOfWeek(ref, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const dayShort = (d: Date): string =>
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];

export const monthShort = (d: Date): string =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];

export const formatLongDate = (d: Date): string =>
  `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]}, ${d.getDate()} ${monthShort(d)}`;

export const formatRangeLabel = (a: Date, b: Date): string => {
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return `${monthShort(a)} ${a.getDate()} — ${b.getDate()}, ${b.getFullYear()}`;
  }
  return `${monthShort(a)} ${a.getDate()} — ${monthShort(b)} ${b.getDate()}, ${b.getFullYear()}`;
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Format seconds as H:MM (no leading zero on hours). Shows 0:00 for zero. */
export const formatHMS = (totalSeconds: number, showSeconds = false): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (showSeconds) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${h}:${String(m).padStart(2, '0')}`;
};

/** Decimal hours, 2 dp. */
export const formatDecimal = (totalSeconds: number): string =>
  (totalSeconds / 3600).toFixed(2);

export const formatDuration = (s: number, format: 'hhmm' | 'decimal', showSeconds = false): string =>
  format === 'decimal' ? formatDecimal(s) : formatHMS(s, showSeconds);

/**
 * Parse "1:30", "1.5", "90m" into seconds.
 * Returns null if unparseable.
 */
export const parseDurationInput = (input: string): number | null => {
  const s = input.trim().toLowerCase();
  if (!s) return 0;
  // HH:MM or H:MM
  const colon = s.match(/^(\d+):(\d{1,2})$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (isNaN(h) || isNaN(m) || m >= 60) return null;
    return (h * 60 + m) * 60;
  }
  // Decimal hours (e.g. 1.5 or 1)
  const dec = s.match(/^(\d+(\.\d+)?)$/);
  if (dec) {
    const h = Number(dec[1]);
    return Math.round(h * 3600);
  }
  // Nm minutes
  const min = s.match(/^(\d+)\s*m$/);
  if (min) return Number(min[1]) * 60;
  return null;
};

/** Live elapsed seconds of an entry (adds running portion). */
export const entrySeconds = (e: { durationSeconds: number; isRunning: boolean; startedAt?: string }, now = Date.now()): number => {
  if (e.isRunning && e.startedAt) {
    const delta = Math.max(0, Math.floor((now - new Date(e.startedAt).getTime()) / 1000));
    return e.durationSeconds + delta;
  }
  return e.durationSeconds;
};

/** Format a currency amount like "$1,250.00". */
export const formatMoney = (amount: number, symbol: string = '$'): string => {
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}${symbol}${parts.join('.')}`;
};

/** Month key (YYYY-MM) in local time. */
export const monthKey = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthKeyFromDateKey = (dateKey: string): string => dateKey.slice(0, 7);

export const parseMonthKey = (key: string): Date => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
};

export const formatMonthLong = (d: Date): string => {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

/** Convert seconds to fractional hours. */
export const secondsToHours = (s: number): number => s / 3600;

/**
 * Resolve the effective hourly rate for a project in a given month.
 * Precedence: monthOverride > project.hourlyRate > client.hourlyRate > 0.
 */
export const effectiveRate = (
  project: { hourlyRate?: number; clientId: string } | undefined,
  client: { hourlyRate?: number } | undefined,
  monthOverride?: number
): number => {
  if (monthOverride !== undefined && monthOverride !== null) return monthOverride;
  if (project?.hourlyRate && project.hourlyRate > 0) return project.hourlyRate;
  if (client?.hourlyRate && client.hourlyRate > 0) return client.hourlyRate;
  return 0;
};

/** Round hours to 2 decimal places. */
export const roundHours = (hours: number): number => Math.round(hours * 100) / 100;

export interface TierSegment {
  hours: number;
  rate: number;
  /** Inclusive lower bound of this segment (hours). */
  fromHours: number;
  /** Exclusive upper bound of this segment (hours), or null for "above". */
  toHours: number | null;
}

/**
 * Split `hours` across rate tiers. Tiers are processed in order; each tier's
 * `uptoHours` is the cumulative cap. The last tier should omit `uptoHours`
 * to mean "no cap" — anything left over flows there.
 */
export const splitHoursIntoTiers = (
  hours: number,
  tiers: { uptoHours?: number; rate: number }[]
): TierSegment[] => {
  if (!tiers || tiers.length === 0 || hours <= 0) return [];
  const segments: TierSegment[] = [];
  let consumed = 0;
  let remaining = hours;
  for (let i = 0; i < tiers.length; i++) {
    if (remaining <= 0) break;
    const tier = tiers[i];
    const isLast = i === tiers.length - 1;
    const cap = tier.uptoHours;
    const capacity =
      cap == null ? Infinity : Math.max(0, cap - consumed);
    const takeRaw = isLast || cap == null ? remaining : Math.min(capacity, remaining);
    const take = takeRaw;
    if (take > 0) {
      segments.push({
        hours: take,
        rate: tier.rate,
        fromHours: consumed,
        toHours: cap == null || isLast ? null : cap,
      });
      consumed += take;
      remaining -= take;
    } else if (capacity === 0 && !isLast) {
      // tier exhausted, move on
      continue;
    }
  }
  return segments;
};

/**
 * Compute the total billable amount for `hours` against tiers.
 * Returns 0 if no tiers configured.
 */
export const computeTieredAmount = (
  hours: number,
  tiers: { uptoHours?: number; rate: number }[] | undefined
): number => {
  if (!tiers || tiers.length === 0) return 0;
  return splitHoursIntoTiers(hours, tiers).reduce(
    (acc, seg) => acc + seg.hours * seg.rate,
    0
  );
};

/** Pretty-print a tier segment range, e.g. "first 100 hrs", "over 100 hrs", "100-200 hrs". */
export const describeTierSegment = (seg: TierSegment): string => {
  const from = roundHours(seg.fromHours);
  const to = seg.toHours == null ? null : roundHours(seg.toHours);
  if (from === 0 && to != null) return `first ${to} hrs`;
  if (to == null) return from > 0 ? `over ${from} hrs` : 'all hours';
  return `hrs ${from}–${to}`;
};

/** Format a YYYY-MM-DD as e.g. "15 March 2026". */
export const formatLongDateKey = (key: string): string => {
  const d = parseDateKey(key);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/** Add days to a YYYY-MM-DD key, returning a new YYYY-MM-DD key. */
export const addDaysToKey = (key: string, days: number): string =>
  toDateKey(addDays(parseDateKey(key), days));

/** Format the next invoice number using a prefix and a sequence integer. */
export const formatInvoiceNumber = (prefix: string, n: number): string =>
  `${prefix}${String(n).padStart(3, '0')}`;
