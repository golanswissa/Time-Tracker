import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../ui';
import { actualSecondsForTask, actualSecondsForTaskOnDay, STATUS_META, STATUS_ORDER } from '../planner';
import { dayShort, formatHMS, monthShort, parseDateKey, todayKey } from '../utils';
import type { TaskKind, TaskPriority, TaskStatus } from '../types';
import { IconPlayS, IconPauseS, IconTrash } from './icons';

// urgency — three levels (asap collapses into High)
const PRIO3: { v: TaskPriority; label: string; c: string }[] = [
  { v: 'high', label: 'High', c: '#b4502a' },
  { v: 'normal', label: 'Medium', c: '#2563eb' },
  { v: 'low', label: 'Low', c: '#0e8a7d' },
];
const isPrio = (v: TaskPriority, cur: TaskPriority) => cur === v || (v === 'high' && cur === 'asap');
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
  const createPreset = useUI((s) => s.createPreset);
  const dayDate = useUI((s) => s.dayDate);
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
  // All-time tracked (used for the delete-confirm message).
  const tracked = task ? actualSecondsForTask(entries, task.id) : 0;
  // The hours field shows/edits the tracked time for the day you're viewing the
  // task on (the day-view's selected day), so editing matches what the card shows.
  const dayTracked = task ? actualSecondsForTaskOnDay(entries, task.id, dayDate) : 0;
  const running = !!task && entries.some((e) => e.isRunning && e.scheduledTaskId === task.id);
  // Label for the editable field: "today" when the viewed day is today, else the date.
  const viewingToday = dayDate === todayKey();
  const dayLabel = viewingToday
    ? 'Hours worked today'
    : `Hours worked · ${(() => { const d = parseDateKey(dayDate); return `${dayShort(d)} ${d.getDate()} ${monthShort(d)}`; })()}`;

  const [form, setForm] = useState<Form>(blankForm);
  const titleRef = useRef<HTMLInputElement>(null);
  // The hours string as loaded on open — lets us write only on a real edit.
  const loadedHours = useRef('0:00');

  // Populate only on open (keep the content during the slide-out close).
  useEffect(() => {
    if (!taskPanel) return;
    if (task) {
      const hours = formatHMS(dayTracked);
      loadedHours.current = hours;
      setForm({
        title: task.title, clientId: task.clientId || '', projectId: task.projectId || '',
        date: task.date, deadline: task.deadline || '', kind: task.kind,
        estimate: task.estimateHours != null ? String(task.estimateHours) : '',
        hours, description: task.description || '',
        status: task.status, priority: task.priority,
      });
    } else {
      loadedHours.current = '0:00';
      setForm({ ...blankForm(), projectId: createPreset?.projectId || '', clientId: createPreset?.clientId || '', date: createPreset?.date || todayKey() });
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
      // New task: hours land on the day it's scheduled for.
      if (newSecs > 0) setTaskHours(created.id, newSecs, fields.date);
    } else if (task) {
      updateScheduledTask(task.id, { ...fields, status: form.status });
      // Only rewrite hours when the field was actually edited — a plain Save must
      // never touch tracked time. Edits land on the day you're viewing (dayDate),
      // never on another day's recorded time.
      if (form.hours.trim() !== loadedHours.current.trim()) setTaskHours(task.id, newSecs, dayDate);
    }
    closePanel();
  };
  const onDelete = () => {
    if (!task) return;
    const msg = tracked > 0
      ? `Delete "${task.title}"? This also removes its ${formatHMS(tracked)} of tracked time.`
      : `Delete "${task.title}"?`;
    if (confirm(msg)) {
      deleteScheduledTask(task.id);
      closePanel();
    }
  };
  const onInlineTimer = () => { if (task) running ? stopTimer() : startTaskTimer(task.id); };

  return (
    <>
      <div className={`wk-ov ${open ? 'on' : ''}`} onClick={closePanel} />
      <aside className={`wk-panel ${open ? 'on' : ''}`} aria-hidden={!open}>
        <div className="wk-ptop">
          <span className="wk-pseclbl">Status</span>
          <button className="wk-px" onClick={closePanel} aria-label="Close">×</button>
        </div>
        <div className="wk-seg">
          {STATUS_ORDER.map((v) => {
            const m = STATUS_META[v];
            const on = form.status === v;
            return (
              <button key={v} className={`wk-segb ${on ? 'on' : ''}`} style={on ? { color: m.c, borderColor: m.c, background: `${m.c}14` } : undefined} onClick={() => set({ status: v })}>
                <i style={{ background: m.c }} />{m.label}
              </button>
            );
          })}
        </div>
        <div className="wk-pseclbl wk-pseclbl-2">Urgency</div>
        <div className="wk-seg">
          {PRIO3.map((p) => {
            const on = isPrio(p.v, form.priority);
            return (
              <button key={p.v} className={`wk-segb ${on ? 'on' : ''}`} style={on ? { color: p.c, borderColor: p.c, background: `${p.c}14` } : undefined} onClick={() => set({ priority: p.v })}>
                <i style={{ background: p.c }} />{p.label}
              </button>
            );
          })}
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
          <div className="wk-fld full"><span>{dayLabel}</span>
            <div className="wk-hline">
              <input className="mono" value={form.hours} onChange={(e) => set({ hours: e.target.value })} />
              {task && (
                <button className={`wk-ipp ${running ? 'run' : ''}`} onClick={onInlineTimer}>
                  {running ? <IconPauseS /> : <IconPlayS />}{running ? 'running' : 'paused'}
                </button>
              )}
            </div>
          </div>
          {task && (
            <div className="wk-fld full wk-rocum"><span>Total · all days</span>
              <div className="wk-rocum-val mono">{formatHMS(tracked)}</div>
            </div>
          )}
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
