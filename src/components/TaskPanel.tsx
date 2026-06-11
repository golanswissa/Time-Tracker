import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../ui';
import { actualSecondsForTask } from '../planner';
import { formatHMS, todayKey } from '../utils';
import type { TaskKind, TaskPriority, TaskStatus } from '../types';
import { IconPlayS, IconPauseS, IconTrash } from './icons';

const PRIO: { v: TaskPriority; label: string; c: string }[] = [
  { v: 'asap', label: 'ASAP', c: '#b4502a' },
  { v: 'high', label: 'High', c: '#b45309' },
  { v: 'normal', label: 'Normal', c: '#6b7280' },
  { v: 'low', label: 'Low', c: '#a1a1aa' },
];
const STATUS: { v: TaskStatus; label: string; c: string; i: string }[] = [
  { v: 'todo', label: 'Todo', c: '#9aa0a6', i: '○' },
  { v: 'doing', label: 'Doing', c: '#a9870b', i: '◑' },
  { v: 'done', label: 'Done', c: '#0f7a45', i: '✓' },
  { v: 'blocked', label: 'Blocked', c: '#b4502a', i: '⊘' },
];
const KINDS: TaskKind[] = ['design', 'print', 'meeting', 'email', 'admin'];

const parseHMS = (v: string): number => {
  const s = v.trim();
  if (s.includes(':')) { const [h, m] = s.split(':').map(Number); return (h * 3600) + ((m || 0) * 60); }
  const n = Number(s); return isNaN(n) ? 0 : Math.round(n * 3600);
};

interface Form {
  title: string; clientId: string; projectId: string; date: string; deadline: string;
  kind: TaskKind; estimate: string; hours: string; description: string;
  status: TaskStatus; priority: TaskPriority;
}
const blankForm = (): Form => ({
  title: '', clientId: '', projectId: '', date: todayKey(), deadline: '',
  kind: 'design', estimate: '', hours: '0:00', description: '', status: 'todo', priority: 'normal',
});

export function TaskPanel() {
  const taskPanel = useUI((s) => s.taskPanel);
  const closePanel = useUI((s) => s.closePanel);
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.scheduledTasks);
  const entries = useStore((s) => s.entries);
  const addScheduledTask = useStore((s) => s.addScheduledTask);
  const updateScheduledTask = useStore((s) => s.updateScheduledTask);
  const deleteScheduledTask = useStore((s) => s.deleteScheduledTask);
  const setTaskHours = useStore((s) => s.setTaskHours);
  const startTaskTimer = useStore((s) => s.startTaskTimer);
  const stopTimer = useStore((s) => s.stopTimer);

  const open = taskPanel !== null;
  const isNew = taskPanel === 'new';
  const task = !isNew && taskPanel ? tasks.find((t) => t.id === taskPanel) : undefined;
  const tracked = task ? actualSecondsForTask(entries, task.id) : 0;
  const running = !!task && entries.some((e) => e.isRunning && e.scheduledTaskId === task.id);

  const [form, setForm] = useState<Form>(blankForm);
  const [menu, setMenu] = useState<'status' | 'prio' | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Populate only on open (keep the content during the slide-out close).
  useEffect(() => {
    if (!taskPanel) return;
    setMenu(null);
    if (task) {
      setForm({
        title: task.title, clientId: task.clientId || '', projectId: task.projectId || '',
        date: task.date, deadline: task.deadline || '', kind: task.kind,
        estimate: task.estimateHours != null ? String(task.estimateHours) : '',
        hours: formatHMS(tracked), description: task.description || '',
        status: task.status, priority: task.priority,
      });
    } else {
      setForm(blankForm());
      setTimeout(() => titleRef.current?.focus(), 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskPanel]);

  const clientProjects = useMemo(
    () => projects.filter((p) => !form.clientId || p.clientId === form.clientId),
    [projects, form.clientId]
  );

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const onSave = () => {
    const fields = {
      title: form.title.trim() || 'Untitled task',
      clientId: form.clientId || undefined,
      projectId: form.projectId || undefined,
      date: form.date || todayKey(),
      deadline: form.deadline || undefined,
      kind: form.kind,
      priority: form.priority,
      estimateHours: form.estimate.trim() && !isNaN(Number(form.estimate)) ? Number(form.estimate) : undefined,
      description: form.description.trim() || undefined,
    };
    const newSecs = parseHMS(form.hours);
    if (isNew) {
      const created = addScheduledTask({ ...fields, status: form.status, source: 'manual' });
      if (newSecs > 0) setTaskHours(created.id, newSecs);
    } else if (task) {
      updateScheduledTask(task.id, { ...fields, status: form.status });
      if (newSecs !== tracked) setTaskHours(task.id, newSecs);
    }
    closePanel();
  };
  const onDelete = () => {
    if (task && confirm(`Delete "${task.title}"? Its tracked time is unlinked but kept.`)) {
      deleteScheduledTask(task.id);
      closePanel();
    }
  };
  const onInlineTimer = () => { if (task) running ? stopTimer() : startTaskTimer(task.id); };

  const sMeta = STATUS.find((s) => s.v === form.status)!;
  const pMeta = PRIO.find((p) => p.v === form.priority)!;

  return (
    <>
      <div className={`wk-ov ${open ? 'on' : ''}`} onClick={closePanel} />
      <aside className={`wk-panel ${open ? 'on' : ''}`} onClick={() => setMenu(null)} aria-hidden={!open}>
        <div className="wk-ptop" onClick={(e) => e.stopPropagation()}>
          <div className="wk-cs">
            <button className="wk-chip" style={{ color: sMeta.c }} onClick={() => setMenu(menu === 'status' ? null : 'status')}>
              <span className="wk-dot" style={{ background: sMeta.c }} /> {sMeta.i} {sMeta.label}
            </button>
            {menu === 'status' && (
              <div className="wk-menu">
                {STATUS.map((o) => (
                  <div key={o.v} className="wk-mi" style={{ color: o.c }} onClick={() => { set({ status: o.v }); setMenu(null); }}>
                    <span className="wk-dot" style={{ background: o.c }} /> {o.i} {o.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="wk-cs">
            <button className="wk-chip" style={{ color: pMeta.c }} onClick={() => setMenu(menu === 'prio' ? null : 'prio')}>
              <span className="wk-dot" style={{ background: pMeta.c }} /> {pMeta.label}
            </button>
            {menu === 'prio' && (
              <div className="wk-menu">
                {PRIO.map((o) => (
                  <div key={o.v} className="wk-mi" style={{ color: o.c }} onClick={() => { set({ priority: o.v }); setMenu(null); }}>
                    <span className="wk-dot" style={{ background: o.c }} /> {o.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="wk-px" onClick={closePanel} aria-label="Close">×</button>
        </div>

        <input ref={titleRef} className="wk-ptitle" value={form.title} placeholder="Task title"
          onChange={(e) => set({ title: e.target.value })} />

        <div className="wk-grid2">
          <label className="wk-fld"><span>Client</span>
            <select value={form.clientId} onChange={(e) => set({ clientId: e.target.value, projectId: '' })}>
              <option value="">—</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="wk-fld"><span>Project</span>
            <select value={form.projectId} onChange={(e) => set({ projectId: e.target.value })}>
              <option value="">—</option>
              {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="wk-fld"><span>Scheduled</span>
            <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label className="wk-fld"><span>Deadline</span>
            <input type="date" value={form.deadline} onChange={(e) => set({ deadline: e.target.value })} />
          </label>
          <label className="wk-fld"><span>Type</span>
            <select value={form.kind} onChange={(e) => set({ kind: e.target.value as TaskKind })}>
              {KINDS.map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
            </select>
          </label>
          <label className="wk-fld"><span>Estimate (h)</span>
            <input className="mono" value={form.estimate} placeholder="—" inputMode="decimal"
              onChange={(e) => set({ estimate: e.target.value })} />
          </label>
          <div className="wk-fld full"><span>Total hours worked</span>
            <div className="wk-hline">
              <input className="mono" value={form.hours} onChange={(e) => set({ hours: e.target.value })} />
              {task && (
                <button className={`wk-ipp ${running ? 'run' : ''}`} onClick={onInlineTimer}>
                  {running ? <IconPauseS /> : <IconPlayS />}{running ? 'running' : 'paused'}
                </button>
              )}
            </div>
          </div>
          <label className="wk-fld full"><span>Description</span>
            <textarea value={form.description} placeholder="Details…" onChange={(e) => set({ description: e.target.value })} />
          </label>
        </div>

        <div className="wk-pfoot">
          {task && <button className="wk-del" title="Delete" onClick={onDelete}><IconTrash /></button>}
          <button className="wk-save" onClick={onSave}>{isNew ? 'Create' : 'Save'}</button>
        </div>
      </aside>
    </>
  );
}
