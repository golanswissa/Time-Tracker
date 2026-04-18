import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useStore } from '../store';
import { ProjectModal } from '../components/ProjectModal';
import type { Project } from '../types';
import {
  effectiveRate,
  entrySeconds,
  formatDuration,
  formatMoney,
  monthShort,
} from '../utils';

export function ProjectsPage() {
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const entries = useStore((s) => s.entries);
  const settings = useStore((s) => s.settings);

  const [query, setQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Project | null | undefined>(undefined);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const e of entries) {
      t[e.projectId] = (t[e.projectId] || 0) + entrySeconds(e);
    }
    return t;
  }, [entries]);

  const filtered = projects.filter((p) => {
    if (clientFilter !== 'all' && p.clientId !== clientFilter) return false;
    if (!query) return true;
    const c = clients.find((x) => x.id === p.clientId);
    const hay = `${p.name} ${c?.name ?? ''}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  // Group by client for display
  const grouped = useMemo(() => {
    const byClient = new Map<string, Project[]>();
    for (const p of filtered) {
      if (!byClient.has(p.clientId)) byClient.set(p.clientId, []);
      byClient.get(p.clientId)!.push(p);
    }
    return Array.from(byClient.entries())
      .map(([clientId, items]) => ({
        client: clients.find((c) => c.id === clientId),
        projects: items,
      }))
      .filter((g) => g.client)
      .sort((a, b) => a.client!.name.localeCompare(b.client!.name));
  }, [filtered, clients]);

  const formatCreated = (iso: string) => {
    const d = new Date(iso);
    return `${monthShort(d)} ${d.getDate()}, ${d.getFullYear()}`;
  };

  return (
    <div className="page">
      <div className="topbar">
        <h1>Projects</h1>
        <div className="topbar-right">
          <select
            className="search"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="all">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            className="search"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="btn btn-dark"
            onClick={() => setEditing(null)}
            disabled={clients.length === 0}
            title={clients.length === 0 ? 'Add a client first' : undefined}
          >
            <Plus size={14} />
            New project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="table">
          <div className="empty">
            <strong>No projects yet</strong>
            {clients.length === 0
              ? 'Go to Clients first to add a client — projects belong to clients.'
              : 'Click New project to add your first.'}
          </div>
        </div>
      ) : grouped.length === 0 ? (
        <div className="table">
          <div className="empty">
            <strong>No projects match</strong>
            Try a different search or client filter.
          </div>
        </div>
      ) : (
        grouped.map((g) => {
          const client = g.client!;
          return (
            <div key={client.id} style={{ marginBottom: 24 }}>
              <div className="row" style={{ marginBottom: 10, gap: 10 }}>
                <span className="dot" style={{ background: client.color, width: 10, height: 10 }} />
                <div style={{ fontWeight: 600, letterSpacing: '-0.14px' }}>{client.name}</div>
                {client.hourlyRate ? (
                  <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    · {formatMoney(client.hourlyRate, settings.currencySymbol)}/hr default
                  </div>
                ) : null}
              </div>
              <div className="table">
                <div className="table-head cols-projects">
                  <div>Project</div>
                  <div>Client</div>
                  <div>Status</div>
                  <div>Rate / hr</div>
                  <div>Hours (total)</div>
                  <div>Created</div>
                  <div></div>
                </div>
                {g.projects.map((p) => {
                  const rate = effectiveRate(p, client);
                  const hasOverride = p.hourlyRate != null && p.hourlyRate > 0;
                  return (
                    <div key={p.id} className="table-row cols-projects">
                      <div className="project-name">
                        <span className="dot" style={{ background: p.color }} />
                        {p.name}
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>{client.name}</div>
                      <div>
                        <span className={`status-pill ${p.status === 'active' ? 'status-active' : 'status-archived'}`}>
                          {p.status === 'active' ? 'Active' : 'Archived'}
                        </span>
                      </div>
                      <div className="mono" style={{ color: rate > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                        {rate > 0 ? formatMoney(rate, settings.currencySymbol) : '—'}
                        {hasOverride && (
                          <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontSize: 11 }}>·override</span>
                        )}
                      </div>
                      <div className="mono">{formatDuration(totals[p.id] || 0, settings.timeFormat)}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatCreated(p.createdAt)}</div>
                      <div className="row-actions">
                        <button className="iconbtn-ghost" onClick={() => setEditing(p)} aria-label="Edit">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {editing !== undefined && (
        <ProjectModal project={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}
