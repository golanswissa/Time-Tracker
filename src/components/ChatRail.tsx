import { useMemo, useState } from 'react';
import { useUI } from '../ui';
import { useStore } from '../store';
import { parseTasks, autoSchedule, type ParsedTask } from '../taskParser';
import type { TaskPriority } from '../types';
import { parseDateKey, monthShort, todayKey } from '../utils';

type Row = ParsedTask & { state: 'pending' | 'approved'; reallocating?: boolean };

const PRIO: Record<TaskPriority, { label: string; c: string }> = {
  asap: { label: 'ASAP', c: '#b4502a' },
  high: { label: 'High', c: '#a9870b' },
  normal: { label: 'Normal', c: '#6b7280' },
  low: { label: 'Low', c: '#9aa0a6' },
};
const PRIO_CYCLE: TaskPriority[] = ['asap', 'high', 'normal', 'low'];

const EXAMPLE = `By Sunday:
1. Homepage – mobile
2. Solution page

Monday:
1. Case study
2. Marketing Hub`;

export function ChatRail() {
  const chatOpen = useUI((s) => s.chatOpen);
  const toggleChat = useUI((s) => s.toggleChat);
  const projects = useStore((s) => s.projects);
  const addScheduledTask = useStore((s) => s.addScheduledTask);

  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState(false);

  const proj = (id?: string) => projects.find((p) => p.id === id);
  const pendingCount = useMemo(() => rows.filter((r) => r.state === 'pending').length, [rows]);

  const run = () => {
    if (!text.trim()) return;
    const parsed = autoSchedule(parseTasks(text, projects), { workdays: [1, 2, 3, 4, 5] });
    setRows(parsed.map((p) => ({ ...p, state: 'pending' as const })));
    setDone(true);
  };

  const reset = () => { setRows([]); setDone(false); setText(''); };

  const fileRow = (r: Row) => {
    const p = proj(r.projectId);
    addScheduledTask({
      title: r.title,
      projectId: r.projectId,
      clientId: p?.clientId,
      date: r.dateKey || todayKey(),
      deadline: r.deadline,
      priority: r.priority,
      kind: 'design',
      source: 'paste',
      status: 'todo',
    });
  };

  const approve = (r: Row) => {
    fileRow(r);
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, state: 'approved', reallocating: false } : x)));
  };
  const approveAll = () => {
    const pend = rows.filter((r) => r.state === 'pending');
    pend.forEach(fileRow);
    setRows((rs) => rs.map((x) => (x.state === 'pending' ? { ...x, state: 'approved', reallocating: false } : x)));
  };
  const setProject = (id: string, projectId: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, projectId, reallocating: false, reason: 'you picked it' } : r)));
  const updateTitle = (id: string, title: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, title } : r)));
  const setPriority = (id: string, priority: Row['priority']) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, priority } : r)));
  const toggleRealloc = (id: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, reallocating: !r.reallocating } : r)));
  const dismiss = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  const dateLabel = (key?: string) => {
    if (!key) return null;
    const d = parseDateKey(key);
    return `${monthShort(d)} ${d.getDate()}`;
  };

  return (
    <aside className={`wk-chat ${chatOpen ? 'on' : ''}`}>
      <div className="wk-cp-in">
        <div className="wk-cp-h">
          <span>Traffic</span>
          {done && <button className="wk-ai-reset" onClick={reset} title="Start over">↺ New</button>}
          <button className="x" onClick={toggleChat} aria-label="Close">×</button>
        </div>

        {/* ---- results ---- */}
        {done && (
          <div className="wk-cp-s">
            <div className="wk-ai-sum">
              {rows.length === 0
                ? 'No tasks found in that text — try again.'
                : `Found ${rows.length} task${rows.length > 1 ? 's' : ''}. Approve each, or reallocate the project.`}
            </div>

            {rows.map((r) => {
              const p = proj(r.projectId);
              if (r.state === 'approved') {
                return (
                  <div key={r.id} className="wk-ai-card ok">
                    <div className="wk-ai-t">{r.title}</div>
                    <div className="wk-ai-done">✓ Added to {p?.name || 'No project'}{r.dateKey ? ` · ${dateLabel(r.dateKey)}` : ''}</div>
                  </div>
                );
              }
              return (
                <div key={r.id} className="wk-ai-card">
                  <button className="wk-ai-x" onClick={() => dismiss(r.id)} aria-label="Dismiss">×</button>
                  <input
                    className="wk-ai-t-in"
                    value={r.title}
                    onChange={(e) => updateTitle(r.id, e.target.value)}
                    aria-label="Task title"
                  />
                  {r.original && <div className="wk-ai-orig" dir="rtl">{r.original}</div>}
                  <div className="wk-ai-meta">
                    <span className="wk-ai-chip"><i style={{ background: p?.color || '#bbb' }} />{p?.name || 'No project'}</span>
                    <button
                      className="wk-ai-prio"
                      style={{ color: PRIO[r.priority].c, borderColor: PRIO[r.priority].c }}
                      onClick={() => setPriority(r.id, PRIO_CYCLE[(PRIO_CYCLE.indexOf(r.priority) + 1) % PRIO_CYCLE.length])}
                      title="Click to change urgency"
                    >{PRIO[r.priority].label}</button>
                    {r.dateKey && <span className="wk-ai-due">{r.deadline ? 'by ' : ''}{dateLabel(r.dateKey)}{r.autoScheduled ? ' · auto' : ''}</span>}
                  </div>
                  {r.reason && !r.reallocating && <div className="wk-ai-reason">{r.reason}</div>}

                  {r.reallocating ? (
                    <div className="wk-ai-opts">
                      <div className="wk-ai-opts-h">File under…</div>
                      {projects.map((op) => (
                        <button
                          key={op.id}
                          className={`wk-ai-opt ${op.id === r.projectId ? 'sel' : ''}`}
                          onClick={() => setProject(r.id, op.id)}
                        >
                          <i style={{ background: op.color }} />{op.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="wk-ai-acts">
                      <button className="wk-ai-approve" onClick={() => approve(r)}>Approve</button>
                      <button className="wk-ai-realloc" onClick={() => toggleRealloc(r.id)}>Reallocate</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ---- intro (before parse) ---- */}
        {!done && (
          <div className="wk-cp-s">
            <div className="wk-m ai">
              <div className="who">Traffic</div>
              <div className="wk-cp-note">
                Paste a message — a to-do list, a WhatsApp dump, day-grouped tasks — and I’ll split
                it into tasks, each filed under the project I think it belongs to. You approve or
                reallocate before anything lands.
              </div>
            </div>
          </div>
        )}

        {/* ---- composer ---- */}
        {!done && (
          <div className="wk-ai-composer">
            <textarea
              className="wk-ai-ta"
              placeholder={EXAMPLE}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="wk-ai-comprow">
              <span className="wk-ai-hint">{projects.length} projects to file under</span>
              <button className="wk-ai-go" onClick={run} disabled={!text.trim()}>Parse →</button>
            </div>
          </div>
        )}

        {/* ---- approve-all footer ---- */}
        {done && pendingCount > 0 && (
          <div className="wk-ai-foot">
            <button className="wk-ai-all" onClick={approveAll}>Approve all ({pendingCount})</button>
          </div>
        )}
      </div>
    </aside>
  );
}
