import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../ui';
import { actualSecondsForTask, actualSecondsForTaskOnDay, STATUS_META, STATUS_ORDER } from '../planner';
import { dayShort, formatHMS, monthShort, parseDateKey, todayKey } from '../utils';
import type { TaskKind, TaskPriority, TaskStatus } from '../types';
import { IconPlayS, IconPauseS, IconTrash, IconStatus, IconPriority, IconKind, IconCal } from './icons';
import type { ReactNode } from 'react';

// urgency — three levels (asap collapses into High)
const PRIO3: { v: TaskPriority; label: string; c: string }[] = [
  { v: 'high', label: 'High', c: '#b4502a' },
  { v: 'normal', label: 'Medium', c: '#2563eb' },
  { v: 'low', label: 'Low', c: '#0e8a7d' },
];
const KINDS: TaskKind[] = ['design', 'print', 'meeting', 'email', 'admin'];

const parseHMS = (v: string): number => {
  const s = v.trim();
  if (s.includes(':')) { const [h, m] = s.split(':').map(Number); return (h * 3600) + ((m || 0) * 60); }
  const n = Number(s); return isNaN(n) ? 0 : Math.round(n * 3600);
};

interface Form {
  title: string; clientId: string; projectId: string; date: string; deadline: string;
  kind: TaskKind; estimate: string; hours: string; description: string; notes: string;
  status: TaskStatus; priority: TaskPriority;
}
const blankForm = (): Form => ({
  title: '', clientId: '', projectId: '', date: todayKey(), deadline: '',
  kind: 'design', estimate: '', hours: '0:00', description: '', notes: '', status: 'todo', priority: 'normal',
});

/** Textarea that grows to fit its content — no inner scrollbar, no fixed height. */
function AutoTextarea({ value, onChange, placeholder, className, rows = 1, inputRef, singleLine }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  className?: string; rows?: number; inputRef?: React.RefObject<HTMLTextAreaElement>;
  /** Block Enter from inserting newlines (e.g. for the title). */
  singleLine?: boolean;
}) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? innerRef;
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, ref]);
  return (
    <textarea ref={ref} className={className} value={value} placeholder={placeholder} rows={rows}
      onKeyDown={singleLine ? (e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } } : undefined}
      onChange={(e) => onChange(e.target.value)} />
  );
}

/** "Mon 15 Jun" from a YYYY-MM-DD key. */
const fmtDay = (key: string): string => {
  const d = parseDateKey(key);
  return `${dayShort(d)} ${d.getDate()} ${monthShort(d)}`;
};

/** Calendar pill — shows the date (or placeholder), opens the native picker on click. */
function DatePill({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => {
    const el = ref.current; if (!el) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEl = el as any;
    if (typeof anyEl.showPicker === 'function') { try { anyEl.showPicker(); return; } catch { /* fall through */ } }
    el.focus();
  };
  return (
    <span className="wk-datepill">
      <button type="button" className={`wk-pill ${value ? '' : 'muted'}`} onClick={open}>
        <span className="wk-pill-ic-muted"><IconCal /></span>
        <span>{value ? fmtDay(value) : placeholder}</span>
      </button>
      <input ref={ref} type="date" className="wk-datehidden" value={value} onChange={(e) => onChange(e.target.value)} tabIndex={-1} />
    </span>
  );
}

interface PillOption { value: string; label: string; icon?: ReactNode }

/** Compact property pill — shows the current value's icon + label, opens a menu to change it. */
function PillSelect({ value, options, onChange }: {
  value: string; options: PillOption[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const sel = options.find((o) => o.value === value) || options[0];
  return (
    <div className="wk-pill-wrap" ref={ref}>
      <button type="button" className={`wk-pill ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)}>
        {sel?.icon && <span className="wk-pill-ic">{sel.icon}</span>}
        <span>{sel?.label ?? '—'}</span>
      </button>
      {open && (
        <div className="wk-pill-menu">
          {options.map((o) => (
            <button key={o.value || '_'} type="button" className={`wk-pill-opt ${o.value === value ? 'on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.icon && <span className="wk-pill-ic">{o.icon}</span>}
              <span className="wk-pill-lbl">{o.label}</span>
              {o.value === value && (
                <svg className="ck" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  // Label for the editable hours row: "today" when the viewed day is today, else the date.
  const viewingToday = dayDate === todayKey();
  const workedLabel = viewingToday ? 'Worked today' : `Worked · ${fmtDay(dayDate)}`;

  const [form, setForm] = useState<Form>(blankForm);
  const titleRef = useRef<HTMLTextAreaElement>(null);
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
        hours, description: task.description || '', notes: task.notes || '',
        status: task.status, priority: task.priority,
      });
    } else {
      loadedHours.current = '0:00';
      setForm({ ...blankForm(), projectId: createPreset?.projectId || '', clientId: createPreset?.clientId || '', date: createPreset?.date || todayKey() });
      setTimeout(() => titleRef.current?.focus(), 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskPanel]);

  // Keep the hours field in sync with the day you're viewing: if you navigate to
  // another day while the panel is open, re-load that day's hours for the task.
  useEffect(() => {
    if (!task) return;
    const hours = formatHMS(actualSecondsForTaskOnDay(entries, task.id, dayDate));
    loadedHours.current = hours;
    setForm((f) => ({ ...f, hours }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayDate]);

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
      notes: form.notes.trim() || undefined,
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
  const onInlineTimer = () => { if (task) running ? stopTimer() : startTaskTimer(task.id, dayDate); };

  return (
    <>
      <div className={`wk-ov ${open ? 'on' : ''}`} onClick={closePanel} />
      <aside className={`wk-panel ${open ? 'on' : ''}`} aria-hidden={!open}>
        <div className="wk-ptop">
          <button className="wk-px" onClick={closePanel} aria-label="Close">×</button>
        </div>

        <AutoTextarea inputRef={titleRef} className="wk-ptitle" value={form.title} placeholder="Task title"
          singleLine onChange={(v) => set({ title: v })} />

        <AutoTextarea className="wk-pdesc" value={form.description} placeholder="Add description…"
          onChange={(v) => set({ description: v })} />

        <div className="wk-pills">
          <PillSelect value={form.status}
            options={STATUS_ORDER.map((v) => ({ value: v, label: STATUS_META[v].label, icon: <span style={{ color: STATUS_META[v].c, display: 'inline-flex' }}><IconStatus status={v} /></span> }))}
            onChange={(v) => set({ status: v as TaskStatus })} />
          <PillSelect value={form.priority === 'asap' ? 'high' : form.priority}
            options={PRIO3.map((p) => ({ value: p.v, label: p.label, icon: <span style={{ color: p.c, display: 'inline-flex' }}><IconPriority level={p.v} /></span> }))}
            onChange={(v) => set({ priority: v as TaskPriority })} />
          <PillSelect value={form.clientId}
            options={[{ value: '', label: 'No client', icon: <span className="wk-pill-sw nofill" /> }, ...clients.map((c) => ({ value: c.id, label: c.name, icon: <span className="wk-pill-sw" style={{ background: c.color }} /> }))]}
            onChange={(v) => set({ clientId: v, projectId: '' })} />
          <PillSelect value={form.projectId}
            options={[{ value: '', label: 'No project', icon: <span className="wk-pill-sw nofill" /> }, ...clientProjects.map((p) => ({ value: p.id, label: p.name, icon: <span className="wk-pill-sw" style={{ background: p.color }} /> }))]}
            onChange={(v) => set({ projectId: v })} />
          <PillSelect value={form.kind}
            options={KINDS.map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1), icon: <span className="wk-pill-ic-muted"><IconKind kind={k} /></span> }))}
            onChange={(v) => set({ kind: v as TaskKind })} />
        </div>

        <div className="wk-rows">
          <div className="wk-row">
            <span className="wk-row-k">Scheduled</span>
            <DatePill value={form.date} onChange={(v) => set({ date: v })} placeholder="Pick a date" />
          </div>
          <div className="wk-row">
            <span className="wk-row-k">Deadline</span>
            <DatePill value={form.deadline} onChange={(v) => set({ deadline: v })} placeholder="Add deadline" />
          </div>
          <div className="wk-row">
            <span className="wk-row-k">Estimate</span>
            <span className="wk-row-v">
              <input className="wk-row-in mono" value={form.estimate} placeholder="—" inputMode="decimal"
                onChange={(e) => set({ estimate: e.target.value })} /><em>h</em>
            </span>
          </div>
          <div className={`wk-row ${running ? 'run' : ''}`}>
            <span className="wk-row-k">{workedLabel}</span>
            <span className="wk-row-v">
              <input className={`wk-row-in mono ${running ? 'run' : ''}`} value={form.hours} onChange={(e) => set({ hours: e.target.value })} />
              {task && (
                <button className={`wk-ipp ${running ? 'run' : ''}`} onClick={onInlineTimer}>
                  {running ? <IconPauseS /> : <IconPlayS />}{running ? 'running' : 'paused'}
                </button>
              )}
            </span>
          </div>
          {task && (
            <div className="wk-row">
              <span className="wk-row-k">All days</span>
              <span className="wk-row-v mono muted">{formatHMS(tracked)}</span>
            </div>
          )}
        </div>

        <label className="wk-fld full wk-notes-fld"><span>Notes &amp; links</span>
          <AutoTextarea className="wk-pnotes" value={form.notes} placeholder="Anything that shouldn’t show on the card — links, context, reminders…"
            onChange={(v) => set({ notes: v })} />
        </label>

        <div className="wk-pfoot">
          {task && <button className="wk-del" title="Delete" onClick={onDelete}><IconTrash /></button>}
          <button className="wk-save" onClick={onSave}>{isNew ? 'Create' : 'Save'}</button>
        </div>
      </aside>
    </>
  );
}
