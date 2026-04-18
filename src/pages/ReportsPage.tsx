import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Pencil, Printer } from 'lucide-react';
import { useStore } from '../store';
import { EntryModal } from '../components/EntryModal';
import type { Entry } from '../types';
import {
  effectiveRate,
  entrySeconds,
  formatDuration,
  formatMoney,
  formatMonthLong,
  monthKeyFromDateKey,
  monthShort,
  parseDateKey,
  parseMonthKey,
  secondsToHours,
} from '../utils';

interface Props {
  initialClientId?: string | null;
  onConsumedInitial?: () => void;
}

/** Flow: select client → select month → month detail (printable). */
export function ReportsPage({ initialClientId, onConsumedInitial }: Props) {
  const clients = useStore((s) => s.clients);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Consume initial client once, if provided
  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
      setSelectedMonth(null);
      onConsumedInitial?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientId]);

  if (selectedClientId && selectedMonth) {
    return (
      <MonthDetail
        clientId={selectedClientId}
        monthKey={selectedMonth}
        onBack={() => setSelectedMonth(null)}
      />
    );
  }
  if (selectedClientId) {
    return (
      <ClientMonths
        clientId={selectedClientId}
        onBack={() => setSelectedClientId(null)}
        onSelectMonth={setSelectedMonth}
      />
    );
  }

  return <ClientPicker clients={clients} onSelect={setSelectedClientId} />;
}

/* ------------- STEP 1: Pick a client ------------- */
function ClientPicker({
  clients,
  onSelect,
}: {
  clients: ReturnType<typeof useStore.getState>['clients'];
  onSelect: (id: string) => void;
}) {
  const projects = useStore((s) => s.projects);
  const entries = useStore((s) => s.entries);
  const rateOverrides = useStore((s) => s.rateOverrides);
  const settings = useStore((s) => s.settings);

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; earned: number; months: Set<string> }>();
    for (const c of clients) map.set(c.id, { total: 0, earned: 0, months: new Set() });
    for (const e of entries) {
      const project = projects.find((p) => p.id === e.projectId);
      if (!project) continue;
      const s = map.get(project.clientId);
      if (!s) continue;
      const sec = entrySeconds(e);
      s.total += sec;
      s.months.add(monthKeyFromDateKey(e.date));
      const client = clients.find((c) => c.id === project.clientId);
      const override = rateOverrides?.[monthKeyFromDateKey(e.date)]?.[e.projectId];
      const rate = effectiveRate(project, client, override);
      if (rate > 0) s.earned += secondsToHours(sec) * rate;
    }
    return map;
  }, [clients, projects, entries, rateOverrides]);

  return (
    <div className="page">
      <div className="topbar">
        <h1>Reports</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
        Pick a client to see their monthly reports — each one exportable as PDF.
      </p>

      {clients.length === 0 ? (
        <div className="table">
          <div className="empty">
            <strong>No clients yet</strong>
            Add a client first — reports are always scoped to a client.
          </div>
        </div>
      ) : (
        <div className="table">
          <div className="table-head cols-clients">
            <div>Client</div>
            <div>Months</div>
            <div>Hours (total)</div>
            <div></div>
            <div>Total earned</div>
            <div></div>
          </div>
          {clients.map((c) => {
            const s = stats.get(c.id)!;
            return (
              <button
                key={c.id}
                className="table-row cols-clients"
                onClick={() => onSelect(c.id)}
                style={{ textAlign: 'left', width: '100%', background: 'transparent' }}
              >
                <div className="project-name">
                  <span className="dot" style={{ background: c.color }} />
                  <div style={{ fontWeight: 600, letterSpacing: '-0.14px' }}>{c.name}</div>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>{s.months.size}</div>
                <div className="mono" style={{ fontWeight: 500 }}>
                  {formatDuration(s.total, settings.timeFormat)}
                </div>
                <div />
                <div className="mono" style={{ fontWeight: 500, color: s.earned > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                  {s.earned > 0 ? formatMoney(s.earned, settings.currencySymbol) : '—'}
                </div>
                <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>›</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------- STEP 2: Pick a month for that client ------------- */
function ClientMonths({
  clientId,
  onBack,
  onSelectMonth,
}: {
  clientId: string;
  onBack: () => void;
  onSelectMonth: (key: string) => void;
}) {
  const client = useStore((s) => s.clients.find((c) => c.id === clientId));
  const projects = useStore((s) => s.projects);
  const entries = useStore((s) => s.entries);
  const rateOverrides = useStore((s) => s.rateOverrides);
  const settings = useStore((s) => s.settings);

  const clientProjectIds = useMemo(
    () => new Set(projects.filter((p) => p.clientId === clientId).map((p) => p.id)),
    [projects, clientId]
  );

  const months = useMemo(() => {
    const map = new Map<string, { key: string; label: string; seconds: number; earned: number }>();
    for (const e of entries) {
      if (!clientProjectIds.has(e.projectId)) continue;
      const mk = monthKeyFromDateKey(e.date);
      if (!map.has(mk)) {
        map.set(mk, { key: mk, label: formatMonthLong(parseMonthKey(mk)), seconds: 0, earned: 0 });
      }
      const m = map.get(mk)!;
      const sec = entrySeconds(e);
      m.seconds += sec;
      const project = projects.find((p) => p.id === e.projectId);
      const override = rateOverrides?.[mk]?.[e.projectId];
      const rate = effectiveRate(project, client, override);
      if (rate > 0) m.earned += secondsToHours(sec) * rate;
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [entries, clientProjectIds, projects, client, rateOverrides]);

  if (!client) return null;

  return (
    <div className="page">
      <div className="topbar">
        <div className="row" style={{ gap: 12 }}>
          <button className="iconbtn" onClick={onBack}><ChevronLeft size={14} /></button>
          <span className="dot" style={{ background: client.color, width: 12, height: 12 }} />
          <h1>{client.name}</h1>
        </div>
      </div>

      {months.length === 0 ? (
        <div className="table">
          <div className="empty">
            <strong>No entries yet</strong>
            Track some time on a {client.name} project — monthly reports appear here.
          </div>
        </div>
      ) : (
        <div className="table">
          <div className="table-head cols-months">
            <div>Month</div>
            <div>Hours</div>
            <div>Earnings</div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          {months.map((m) => (
            <button
              key={m.key}
              className="table-row cols-months"
              onClick={() => onSelectMonth(m.key)}
              style={{ textAlign: 'left', width: '100%', background: 'transparent' }}
            >
              <div style={{ fontWeight: 600, letterSpacing: '-0.14px' }}>{m.label}</div>
              <div className="mono" style={{ fontWeight: 500 }}>
                {formatDuration(m.seconds, settings.timeFormat)}
              </div>
              <div className="mono" style={{ fontWeight: 500, color: m.earned > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                {m.earned > 0 ? formatMoney(m.earned, settings.currencySymbol) : '—'}
              </div>
              <div />
              <div />
              <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>›</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------- STEP 3: Month detail (printable) ------------- */
function MonthDetail({
  clientId,
  monthKey,
  onBack,
}: {
  clientId: string;
  monthKey: string;
  onBack: () => void;
}) {
  const client = useStore((s) => s.clients.find((c) => c.id === clientId));
  const projects = useStore((s) => s.projects.filter((p) => p.clientId === clientId));
  const tasks = useStore((s) => s.tasks);
  const allEntries = useStore((s) => s.entries);
  const rateOverrides = useStore((s) => s.rateOverrides);
  const setRateOverride = useStore((s) => s.setRateOverride);
  const settings = useStore((s) => s.settings);

  const [editing, setEditing] = useState<Entry | null | undefined>(undefined);

  const monthLabel = formatMonthLong(parseMonthKey(monthKey));
  const monthOverrides = rateOverrides?.[monthKey] || {};
  const clientProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);

  const monthEntries = useMemo(
    () =>
      allEntries.filter(
        (e) => clientProjectIds.has(e.projectId) && monthKeyFromDateKey(e.date) === monthKey
      ),
    [allEntries, clientProjectIds, monthKey]
  );

  interface ProjectSummary {
    projectId: string;
    seconds: number;
    rate: number;
    defaultRate: number;
    amount: number;
    hasOverride: boolean;
  }

  const projectSummaries: ProjectSummary[] = useMemo(() => {
    const map = new Map<string, ProjectSummary>();
    for (const e of monthEntries) {
      const project = projects.find((p) => p.id === e.projectId);
      const defaultRate = effectiveRate(project, client, undefined);
      const override = monthOverrides[e.projectId];
      const rate = override != null ? override : defaultRate;
      if (!map.has(e.projectId)) {
        map.set(e.projectId, {
          projectId: e.projectId,
          seconds: 0,
          rate,
          defaultRate,
          amount: 0,
          hasOverride: override != null,
        });
      }
      const s = map.get(e.projectId)!;
      s.seconds += entrySeconds(e);
    }
    for (const s of map.values()) s.amount = secondsToHours(s.seconds) * s.rate;
    return Array.from(map.values()).sort((a, b) => b.seconds - a.seconds);
  }, [monthEntries, projects, monthOverrides, client]);

  const totalSeconds = projectSummaries.reduce((a, b) => a + b.seconds, 0);
  const totalAmount = projectSummaries.reduce((a, b) => a + b.amount, 0);

  const sortedEntries = useMemo(
    () =>
      [...monthEntries].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    [monthEntries]
  );

  const formatDate = (key: string) => {
    const d = parseDateKey(key);
    return `${monthShort(d)} ${d.getDate()}`;
  };

  const getProject = (id: string) => projects.find((p) => p.id === id);
  const getTask = (id: string) => tasks.find((t) => t.id === id);

  const onRateChange = (projectId: string, raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') { setRateOverride(monthKey, projectId, null); return; }
    const n = Number(trimmed);
    if (isNaN(n) || n < 0) return;
    setRateOverride(monthKey, projectId, n);
  };

  if (!client) return null;

  return (
    <div className="page report-page">
      <div className="topbar no-print">
        <div className="row" style={{ gap: 12 }}>
          <button className="iconbtn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={14} />
          </button>
          <span className="dot" style={{ background: client.color, width: 12, height: 12 }} />
          <h1>{client.name} — {monthLabel}</h1>
        </div>
        <div className="topbar-right">
          <button className="btn btn-dark" onClick={() => window.print()}>
            <Printer size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="print-only print-header">
        <div className="print-brand">Tracker · Time report</div>
        <h1 style={{ fontSize: 30, letterSpacing: '-1.28px', marginTop: 4 }}>{client.name}</h1>
        <div style={{ color: '#4d4d4d', fontSize: 14, marginTop: 4 }}>{monthLabel}</div>
      </div>

      {/* Summary stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total hours</div>
          <div className="stat-value mono">{formatDuration(totalSeconds, settings.timeFormat)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total earnings</div>
          <div className="stat-value mono">
            {totalAmount > 0 ? formatMoney(totalAmount, settings.currencySymbol) : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-value">{projectSummaries.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Entries</div>
          <div className="stat-value">{monthEntries.length}</div>
        </div>
      </div>

      <h2 className="section-h">By project</h2>
      <div className="table">
        <div className="table-head cols-report-projects">
          <div>Project</div>
          <div>Hours</div>
          <div>Rate / hr</div>
          <div style={{ textAlign: 'right' }}>Amount</div>
          <div></div>
        </div>
        {projectSummaries.length === 0 && <div className="empty">No entries this month.</div>}
        {projectSummaries.map((s) => {
          const project = getProject(s.projectId);
          return (
            <div key={s.projectId} className="table-row cols-report-projects">
              <div className="project-name">
                <span className="dot" style={{ background: project?.color || '#bbb' }} />
                <div>
                  <div>{project?.name || '(deleted)'}</div>
                </div>
              </div>
              <div className="mono" style={{ fontWeight: 500 }}>
                {formatDuration(s.seconds, settings.timeFormat)}
              </div>
              <div className="row" style={{ gap: 6 }}>
                <div className="rate-input-wrap no-print">
                  <span className="rate-prefix">{settings.currencySymbol}</span>
                  <input
                    className="rate-input mono"
                    value={s.hasOverride ? String(s.rate) : (s.defaultRate || '')}
                    placeholder={s.defaultRate ? String(s.defaultRate) : '0'}
                    onChange={(e) => onRateChange(s.projectId, e.target.value)}
                    inputMode="decimal"
                    aria-label="Hourly rate for this month"
                  />
                </div>
                <span className="print-only mono">
                  {s.rate > 0 ? formatMoney(s.rate, settings.currencySymbol) : '—'}
                </span>
                {s.hasOverride && (
                  <button
                    className="iconbtn-ghost no-print"
                    title={`Reset to default ${s.defaultRate ? formatMoney(s.defaultRate, settings.currencySymbol) : '—'}`}
                    onClick={() => setRateOverride(monthKey, s.projectId, null)}
                    style={{ fontSize: 11, width: 'auto', padding: '0 6px', height: 22 }}
                  >
                    reset
                  </button>
                )}
              </div>
              <div className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                {s.amount > 0 ? formatMoney(s.amount, settings.currencySymbol) : '—'}
              </div>
              <div />
            </div>
          );
        })}
        {projectSummaries.length > 0 && (
          <div className="table-row cols-report-projects report-total">
            <div style={{ fontWeight: 600 }}>Total</div>
            <div className="mono" style={{ fontWeight: 600 }}>
              {formatDuration(totalSeconds, settings.timeFormat)}
            </div>
            <div />
            <div className="mono" style={{ textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
              {totalAmount > 0 ? formatMoney(totalAmount, settings.currencySymbol) : '—'}
            </div>
            <div />
          </div>
        )}
      </div>

      <h2 className="section-h">All entries</h2>
      <div className="table">
        <div className="table-head cols-report-entries">
          <div>Date</div>
          <div>Project · Task</div>
          <div>Notes</div>
          <div style={{ textAlign: 'right' }}>Hours</div>
          <div style={{ textAlign: 'right' }}>Amount</div>
          <div className="no-print"></div>
        </div>
        {sortedEntries.length === 0 && <div className="empty">No entries.</div>}
        {sortedEntries.map((e) => {
          const p = getProject(e.projectId);
          const t = getTask(e.taskId);
          const seconds = entrySeconds(e);
          const override = monthOverrides[e.projectId];
          const rate = override != null ? override : effectiveRate(p, client, undefined);
          const amount = secondsToHours(seconds) * rate;
          return (
            <div key={e.id} className="table-row cols-report-entries">
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDate(e.date)}</div>
              <div>
                <div className="project-name" style={{ fontWeight: 500 }}>
                  <span className="dot" style={{ background: p?.color || '#bbb' }} />
                  {p?.name || '(deleted)'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2, marginLeft: 18 }}>
                  {t?.name || '(deleted)'}
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.notes || '—'}
              </div>
              <div className="mono" style={{ textAlign: 'right', fontWeight: 500 }}>
                {formatDuration(seconds, settings.timeFormat)}
              </div>
              <div className="mono" style={{ textAlign: 'right', color: amount > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                {amount > 0 ? formatMoney(amount, settings.currencySymbol) : '—'}
              </div>
              <div className="row-actions no-print">
                <button className="iconbtn-ghost" onClick={() => setEditing(e)} aria-label="Edit">
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="print-only print-footer">
        Generated {new Date().toLocaleDateString()} · Tracker
      </div>

      {editing !== undefined && <EntryModal entry={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
