import { useEffect, useState } from 'react';
import { X, Play, Pause, Trash2, Check, RotateCcw, ExternalLink } from 'lucide-react';
import { useStore } from '../store';
import type { ScheduledTask, TaskKind, TaskPriority, TaskStatus } from '../types';
import { actualSecondsForTask, KIND_META, linkLabel, PRIORITY_META } from '../planner';
import { entrySeconds, formatDuration, monthShort, parseDateKey, todayKey } from '../utils';

interface Props {
  task: ScheduledTask | null; // null = create mode
  defaultDate?: string;
  onClose: () => void;
}

const PRIORITIES: TaskPriority[] = ['asap', 'high', 'normal', 'low'];
const KINDS: TaskKind[] = ['design', 'print', 'meeting', 'email', 'admin'];
const STATUSES: TaskStatus[] = ['todo', 'doing', 'done', 'blocked'];

export function TaskDrawer({ task, defaultDate, onClose }: Props) {
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const entries = useStore((s) => s.entries);
  const settings = useStore((s) => s.settings);
  const addScheduledTask = useStore((s) => s.addScheduledTask);
  const updateScheduledTask = useStore((s) => s.updateScheduledTask);
  const deleteScheduledTask = useStore((s) => s.deleteScheduledTask);
  const startTaskTimer = useStore((s) => s.startTaskTimer);
  const stopTimer = useStore((s) => s.stopTimer);

  const isNew = !task;
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [clientId, setClientId] = useState(task?.clientId || '');
  const [projectId, setProjectId] = useState(task?.projectId || '');
  const [date, setDate] = useState(task?.date || defaultDate || todayKey());
  const [deadline, setDeadline] = useState(task?.deadline || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'normal');
  const [kind, setKind] = useState<TaskKind>(task?.kind || 'design');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'todo');
  const [estimate, setEstimate] = useState(task?.estimateHours != null ? String(task.estimateHours) : '');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // Live data for an existing task
  const live = useStore((s) => s.scheduledTasks.find((t) => t.id === task?.id));
  const running = entries.find((e) => e.isRunning && e.scheduledTaskId === task?.id);
  const taskEntries = task ? entries.filter((e) => e.scheduledTaskId === task.id) : [];
  const actual = task ? actualSecondsForTask(entries, task.id) : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const clientProjects = projects.filter((p) => !clientId || p.clientId === clientId);

  const fields = () => ({
    title: title.trim() || 'Untitled task',
    description: description.trim() || undefined,
    clientId: clientId || undefined,
    projectId: projectId || undefined,
    date,
    deadline: deadline || undefined,
    priority,
    kind,
    estimateHours: estimate.trim() && !isNaN(Number(estimate)) ? Number(estimate) : undefined,
    links: task?.links,
    attachments: task?.attachments,
  });

  const onSave = () => {
    if (isNew) {
      addScheduledTask({ ...fields(), source: 'manual' });
    } else if (task) {
      updateScheduledTask(task.id, { ...fields(), status });
    }
    onClose();
  };

  // For an existing task, write status changes through immediately.
  const changeStatus = (s: TaskStatus) => {
    setStatus(s);
    if (task) updateScheduledTask(task.id, { status: s });
  };

  const onDelete = () => {
    if (task && confirm(`Delete "${task.title}"? Tracked time is kept but unlinked.`)) {
      deleteScheduledTask(task.id);
      onClose();
    }
  };

  const fmtDate = (key: string) => {
    const d = parseDateKey(key);
    return `${monthShort(d)} ${d.getDate()}`;
  };

  const links = live?.links || task?.links || [];
  const attachments = live?.attachments || task?.attachments || [];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-top">
          <div className="drawer-chips">
            <select
              className={`chip-select prio-${priority}`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_META[p].label}</option>
              ))}
            </select>
            <select className="chip-select" value={status} onChange={(e) => changeStatus(e.target.value as TaskStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>

        <input
          className="drawer-title"
          value={title}
          placeholder="Task title"
          onChange={(e) => setTitle(e.target.value)}
          autoFocus={isNew}
        />

        <div className="drawer-grid">
          <label>
            <span>Client</span>
            <select value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(''); }}>
              <option value="">—</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            <span>Project</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">—</option>
              {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            <span>Scheduled</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span>Deadline</span>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
          <label>
            <span>Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>
              {KINDS.map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
            </select>
          </label>
          <label>
            <span>Estimate (h)</span>
            <input className="mono" value={estimate} placeholder="—" inputMode="decimal" onChange={(e) => setEstimate(e.target.value)} />
          </label>
        </div>

        <label className="drawer-field">
          <span>Description</span>
          <textarea value={description} placeholder="Details…" rows={4} onChange={(e) => setDescription(e.target.value)} />
        </label>

        {links.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-h">Links</div>
            <div className="drawer-links">
              {links.map((url) => (
                <a key={url} className="link-chip" href={url} target="_blank" rel="noreferrer">
                  <ExternalLink size={12} /> {linkLabel(url)}
                </a>
              ))}
            </div>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-h">Attachments</div>
            <div className="drawer-thumbs">
              {attachments.map((src, i) => (
                <button key={i} className="drawer-thumb" onClick={() => setLightbox(src)}>
                  <img src={src} alt={`attachment ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {task && (
          <div className="drawer-section">
            <div className="drawer-section-h">
              Time {task.estimateHours ? `· est ${task.estimateHours}h` : ''}
              {actual > 0 && (
                <span className={`mono ${task.estimateHours && actual / 3600 > task.estimateHours ? 'over' : ''}`} style={{ marginLeft: 8 }}>
                  · {formatDuration(actual, settings.timeFormat)} tracked
                </span>
              )}
            </div>
            {taskEntries.length === 0 ? (
              <div className="drawer-muted">No time tracked yet.</div>
            ) : (
              <div className="drawer-entries">
                {taskEntries.map((e) => (
                  <div key={e.id} className="drawer-entry">
                    <span>{fmtDate(e.date)}</span>
                    <span className="mono">{formatDuration(entrySeconds(e), settings.timeFormat)}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn"
              style={{ marginTop: 8 }}
              onClick={() => (running ? stopTimer() : startTaskTimer(task.id))}
            >
              {running ? <><Pause size={14} /> Stop timer</> : <><Play size={14} /> Start timer</>}
            </button>
          </div>
        )}

        {task?.rawText && (
          <div className="drawer-section">
            <button className="drawer-raw-toggle" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? '▾' : '▸'} Source · from pasted {task.source === 'paste' ? 'message' : 'note'}
            </button>
            {showRaw && <pre className="drawer-raw">{task.rawText}</pre>}
          </div>
        )}

        <div className="drawer-actions">
          {task && (
            <button className="btn btn-danger-ghost" onClick={onDelete} style={{ marginRight: 'auto' }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          {task && status !== 'done' && (
            <button className="btn" onClick={() => changeStatus('done')}><Check size={14} /> Mark done</button>
          )}
          {task && status === 'done' && (
            <button className="btn" onClick={() => changeStatus('todo')}><RotateCcw size={14} /> Reopen</button>
          )}
          <button className="btn btn-dark" onClick={onSave}>{isNew ? 'Create' : 'Save'}</button>
        </div>
      </aside>

      {lightbox && (
        <div className="lightbox" onClick={(e) => { e.stopPropagation(); setLightbox(null); }}>
          <img src={lightbox} alt="attachment" />
        </div>
      )}
    </div>
  );
}
