import { useMemo, useState } from 'react';
import { ChevronLeft, FileText, Pencil, Plus } from 'lucide-react';
import { useStore } from '../store';
import { ClientModal } from '../components/ClientModal';
import { ProjectModal } from '../components/ProjectModal';
import type { Client, Project } from '../types';
import {
  effectiveRate,
  entrySeconds,
  formatDuration,
  formatMoney,
  formatMonthLong,
  monthKey as toMonthKey,
  monthKeyFromDateKey,
  parseMonthKey,
  secondsToHours,
} from '../utils';

interface Props {
  onOpenReport: (clientId: string) => void;
}

export function ClientsPage({ onOpenReport }: Props) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  if (selectedClientId) {
    return (
      <ClientDetail
        clientId={selectedClientId}
        onBack={() => setSelectedClientId(null)}
        onOpenReport={() => onOpenReport(selectedClientId)}
      />
    );
  }
  return <ClientList onSelect={setSelectedClientId} />;
}

/* ---------- LIST ---------- */
function ClientList({ onSelect }: { onSelect: (id: string) => void }) {
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const entries = useStore((s) => s.entries);
  const rateOverrides = useStore((s) => s.rateOverrides);
  const settings = useStore((s) => s.settings);

  const [editing, setEditing] = useState<Client | null | undefined>(undefined);

  const currentMonth = toMonthKey(new Date());

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; thisMonth: number; earned: number; projectCount: number }>();
    for (const c of clients) {
      map.set(c.id, { total: 0, thisMonth: 0, earned: 0, projectCount: 0 });
    }
    for (const p of projects) {
      const s = map.get(p.clientId);
      if (s) s.projectCount += 1;
    }
    for (const e of entries) {
      const project = projects.find((p) => p.id === e.projectId);
      if (!project) continue;
      const s = map.get(project.clientId);
      if (!s) continue;
      const sec = entrySeconds(e);
      s.total += sec;
      const mk = monthKeyFromDateKey(e.date);
      if (mk === currentMonth) s.thisMonth += sec;
      const client = clients.find((c) => c.id === project.clientId);
      const override = rateOverrides?.[mk]?.[project.id];
      const rate = effectiveRate(project, client, override);
      if (rate > 0) s.earned += secondsToHours(sec) * rate;
    }
    return map;
  }, [clients, projects, entries, rateOverrides, currentMonth]);

  return (
    <div className="page">
      <div className="topbar">
        <h1>Clients</h1>
        <div className="topbar-right">
          <button className="btn btn-dark" onClick={() => setEditing(null)}>
            <Plus size={14} />
            New client
          </button>
        </div>
      </div>

      <div className="table">
        <div className="table-head cols-clients">
          <div>Client</div>
          <div>Projects</div>
          <div>Hours (total)</div>
          <div>This month</div>
          <div>Total earned</div>
          <div></div>
        </div>

        {clients.length === 0 && (
          <div className="empty">
            <strong>No clients yet</strong>
            Add a client to start grouping projects and generating reports.
          </div>
        )}

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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, letterSpacing: '-0.14px' }}>{c.name}</div>
                  {c.hourlyRate ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }} className="mono">
                      {formatMoney(c.hourlyRate, settings.currencySymbol)}/hr
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 2 }}>
                      No default rate
                    </div>
                  )}
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>{s.projectCount}</div>
              <div className="mono" style={{ fontWeight: 500 }}>
                {formatDuration(s.total, settings.timeFormat)}
              </div>
              <div className="mono" style={{ color: s.thisMonth > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                {formatDuration(s.thisMonth, settings.timeFormat)}
              </div>
              <div className="mono" style={{ fontWeight: 500, color: s.earned > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                {s.earned > 0 ? formatMoney(s.earned, settings.currencySymbol) : '—'}
              </div>
              <div className="row-actions" style={{ opacity: 1 }}>
                <button
                  className="iconbtn-ghost"
                  onClick={(e) => { e.stopPropagation(); setEditing(c); }}
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </button>
          );
        })}
      </div>

      {editing !== undefined && <ClientModal client={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

/* ---------- DETAIL ---------- */
function ClientDetail({
  clientId,
  onBack,
  onOpenReport,
}: {
  clientId: string;
  onBack: () => void;
  onOpenReport: () => void;
}) {
  const client = useStore((s) => s.clients.find((c) => c.id === clientId));
  const projects = useStore((s) => s.projects.filter((p) => p.clientId === clientId));
  const entries = useStore((s) => s.entries);
  const rateOverrides = useStore((s) => s.rateOverrides);
  const settings = useStore((s) => s.settings);

  const [editingClient, setEditingClient] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null | undefined>(undefined);

  const clientEntries = useMemo(() => {
    const projectIds = new Set(projects.map((p) => p.id));
    return entries.filter((e) => projectIds.has(e.projectId));
  }, [entries, projects]);

  // Per-project totals
  const projectStats = useMemo(() => {
    const map = new Map<string, { seconds: number; earned: number }>();
    for (const p of projects) map.set(p.id, { seconds: 0, earned: 0 });
    for (const e of clientEntries) {
      const s = map.get(e.projectId);
      if (!s) continue;
      const sec = entrySeconds(e);
      s.seconds += sec;
      const project = projects.find((p) => p.id === e.projectId);
      const override = rateOverrides?.[monthKeyFromDateKey(e.date)]?.[e.projectId];
      const rate = effectiveRate(project, client, override);
      if (rate > 0) s.earned += secondsToHours(sec) * rate;
    }
    return map;
  }, [projects, clientEntries, rateOverrides, client]);

  // Monthly breakdown
  interface MonthStat {
    key: string;
    label: string;
    seconds: number;
    earned: number;
  }
  const monthStats: MonthStat[] = useMemo(() => {
    const map = new Map<string, MonthStat>();
    for (const e of clientEntries) {
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
  }, [clientEntries, projects, rateOverrides, client]);

  const totalSeconds = Array.from(projectStats.values()).reduce((a, b) => a + b.seconds, 0);
  const totalEarned = Array.from(projectStats.values()).reduce((a, b) => a + b.earned, 0);

  if (!client) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="row"><button className="iconbtn" onClick={onBack}><ChevronLeft size={14} /></button><h1>Client not found</h1></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="row" style={{ gap: 12 }}>
          <button className="iconbtn" onClick={onBack}><ChevronLeft size={14} /></button>
          <span className="dot" style={{ background: client.color, width: 12, height: 12 }} />
          <h1>{client.name}</h1>
        </div>
        <div className="topbar-right">
          <button className="btn" onClick={() => setEditingClient(true)}>
            <Pencil size={14} />
            Edit client
          </button>
          <button className="btn btn-dark" onClick={onOpenReport}>
            <FileText size={14} />
            View reports
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total hours</div>
          <div className="stat-value mono">{formatDuration(totalSeconds, settings.timeFormat)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total earned</div>
          <div className="stat-value mono">
            {totalEarned > 0 ? formatMoney(totalEarned, settings.currencySymbol) : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-value">{projects.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Default rate</div>
          <div className="stat-value mono">
            {client.hourlyRate ? formatMoney(client.hourlyRate, settings.currencySymbol) : '—'}
          </div>
        </div>
      </div>

      {client.notes && (
        <div className="note" style={{ marginTop: 0, marginBottom: 24, whiteSpace: 'pre-wrap' }}>
          {client.notes}
        </div>
      )}

      {/* Projects */}
      <div className="row" style={{ marginTop: 8, marginBottom: 12, justifyContent: 'space-between' }}>
        <h2 className="section-h" style={{ margin: 0 }}>Projects</h2>
        <button className="btn" onClick={() => setEditingProject(null)}>
          <Plus size={14} />
          New project
        </button>
      </div>
      <div className="table">
        <div className="table-head cols-client-projects">
          <div>Project</div>
          <div>Hours</div>
          <div>Earned</div>
          <div></div>
        </div>
        {projects.length === 0 && <div className="empty">No projects yet for this client.</div>}
        {projects.map((p) => {
          const s = projectStats.get(p.id)!;
          return (
            <div key={p.id} className="table-row cols-client-projects">
              <div className="project-name">
                <span className="dot" style={{ background: p.color }} />
                <div>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  {p.hourlyRate != null && (
                    <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                      Override: {formatMoney(p.hourlyRate, settings.currencySymbol)}/hr
                    </div>
                  )}
                </div>
              </div>
              <div className="mono" style={{ fontWeight: 500 }}>
                {formatDuration(s.seconds, settings.timeFormat)}
              </div>
              <div className="mono" style={{ color: s.earned > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                {s.earned > 0 ? formatMoney(s.earned, settings.currencySymbol) : '—'}
              </div>
              <div className="row-actions">
                <button className="iconbtn-ghost" onClick={() => setEditingProject(p)} aria-label="Edit">
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly breakdown */}
      <h2 className="section-h">Monthly breakdown</h2>
      <div className="table">
        <div className="table-head cols-project-months">
          <div>Month</div>
          <div>Hours</div>
          <div>Earned</div>
          <div></div>
        </div>
        {monthStats.length === 0 && <div className="empty">No entries yet.</div>}
        {monthStats.map((m) => (
          <button
            key={m.key}
            className="table-row cols-project-months"
            onClick={onOpenReport}
            style={{ textAlign: 'left', width: '100%', background: 'transparent' }}
          >
            <div style={{ fontWeight: 500 }}>{m.label}</div>
            <div className="mono" style={{ fontWeight: 500 }}>
              {formatDuration(m.seconds, settings.timeFormat)}
            </div>
            <div className="mono" style={{ color: m.earned > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
              {m.earned > 0 ? formatMoney(m.earned, settings.currencySymbol) : '—'}
            </div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>›</div>
          </button>
        ))}
      </div>

      {editingClient && <ClientModal client={client} onClose={() => setEditingClient(false)} />}
      {editingProject !== undefined && (
        <ProjectModal
          project={editingProject}
          defaultClientId={client.id}
          onClose={() => setEditingProject(undefined)}
        />
      )}
    </div>
  );
}
