import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, Plus, Link2, Paperclip, ChevronLeft, ChevronRight, CornerDownRight } from 'lucide-react';
import { useStore, DEFAULT_DAILY_HOURS } from '../store';
import { TaskDrawer } from '../components/TaskDrawer';
import type { ScheduledTask } from '../types';
import { actualSecondsForTask, dayCapacity, PRIORITY_META, sortTasks } from '../planner';
import {
  addDays,
  entrySeconds,
  formatDuration,
  monthShort,
  parseDateKey,
  toDateKey,
  weekDays,
} from '../utils';

export function PlanPage() {
  const scheduledTasks = useStore((s) => s.scheduledTasks);
  const entries = useStore((s) => s.entries);
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const settings = useStore((s) => s.settings);
  const moveTaskToDay = useStore((s) => s.moveTaskToDay);
  const startTaskTimer = useStore((s) => s.startTaskTimer);
  const stopTimer = useStore((s) => s.stopTimer);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [drawer, setDrawer] = useState<ScheduledTask | null | undefined>(undefined); // undefined=closed, null=create
  const [dragId, setDragId] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const selectedKey = toDateKey(selectedDate);
  const week = useMemo(() => weekDays(selectedDate, settings.weekStart), [selectedDate, settings.weekStart]);

  const dayTasks = useMemo(
    () => scheduledTasks.filter((t) => t.date === selectedKey).sort(sortTasks),
    [scheduledTasks, selectedKey]
  );
  const open = dayTasks.filter((t) => t.status !== 'done');
  const done = dayTasks.filter((t) => t.status === 'done');
  const cap = dayCapacity(scheduledTasks, entries, selectedKey, DEFAULT_DAILY_HOURS, now);

  const runningEntry = entries.find((e) => e.isRunning);
  const getProject = (id?: string) => projects.find((p) => p.id === id);
  const getClient = (t: ScheduledTask) => {
    if (t.clientId) return clients.find((c) => c.id === t.clientId);
    const p = getProject(t.projectId);
    return p ? clients.find((c) => c.id === p.clientId) : undefined;
  };

  const carryUndone = () => {
    const next = toDateKey(addDays(selectedDate, 1));
    open.forEach((t) => moveTaskToDay(t.id, next));
  };

  const onDrop = (dayKey: string) => {
    if (dragId) moveTaskToDay(dragId, dayKey);
    setDragId(null);
  };

  const Row = ({ t }: { t: ScheduledTask }) => {
    const p = getProject(t.projectId);
    const c = getClient(t);
    const actual = actualSecondsForTask(entries, t.id, now);
    const running = runningEntry?.scheduledTaskId === t.id;
    const over = t.estimateHours != null && actual / 3600 > t.estimateHours;
    const linkN = t.links?.length || 0;
    const attN = t.attachments?.length || 0;
    return (
      <div
        className={`agenda-row ${t.status === 'done' ? 'is-done' : ''}`}
        draggable
        onDragStart={() => setDragId(t.id)}
        onDragEnd={() => setDragId(null)}
        onClick={() => setDrawer(t)}
      >
        <div className="agenda-line1">
          <span className="prio-dot" style={{ background: PRIORITY_META[t.priority].color }} title={PRIORITY_META[t.priority].label} />
          {c && <span className="dot" style={{ background: c.color }} />}
          <span className="agenda-title">{t.title}</span>
          {c && <span className="agenda-client">{c.name}</span>}
          <span className="agenda-spacer" />
          <span className={`agenda-time mono ${over ? 'over' : ''}`}>
            {t.estimateHours ? `${t.estimateHours}h` : '—'} · {actual > 0 ? formatDuration(actual, settings.timeFormat) : '0:00'}
            {over && ' 🔴'}
          </span>
          {t.deadline && (
            <span className={`agenda-deadline ${t.priority === 'asap' ? 'urgent' : ''}`}>
              {(() => { const d = parseDateKey(t.deadline); return `${monthShort(d)} ${d.getDate()}`; })()}
            </span>
          )}
          <button
            className="agenda-btn"
            onClick={(e) => { e.stopPropagation(); running ? stopTimer() : startTaskTimer(t.id); }}
            title={running ? 'Stop' : 'Start timer'}
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
        {(t.description || linkN > 0 || attN > 0) && (
          <div className="agenda-line2">
            <span className="agenda-desc">{t.description || ''}</span>
            {linkN > 0 && <span className="agenda-ind"><Link2 size={11} /> {linkN}</span>}
            {attN > 0 && <span className="agenda-ind"><Paperclip size={11} /> {attN}</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page plan-page">
      <div className="topbar">
        <h1>Plan</h1>
        <div className="row" style={{ gap: 8 }}>
          <button className="iconbtn" onClick={() => setSelectedDate((d) => addDays(d, -7))} aria-label="Previous week"><ChevronLeft size={14} /></button>
          <button className="btn" onClick={() => setSelectedDate(new Date())}>Today</button>
          <button className="iconbtn" onClick={() => setSelectedDate((d) => addDays(d, 7))} aria-label="Next week"><ChevronRight size={14} /></button>
          <button className="btn btn-dark" onClick={() => setDrawer(null)}><Plus size={14} /> Task</button>
        </div>
      </div>

      {/* Week ribbon */}
      <div className="week-ribbon">
        {week.map((d) => {
          const key = toDateKey(d);
          const dc = dayCapacity(scheduledTasks, entries, key, DEFAULT_DAILY_HOURS, now);
          const count = scheduledTasks.filter((t) => t.date === key).length;
          const pct = Math.min(100, (dc.plannedHours / dc.availableHours) * 100);
          const active = key === selectedKey;
          return (
            <button
              key={key}
              className={`ribbon-day ${active ? 'active' : ''} ${dragId ? 'drop-target' : ''}`}
              onClick={() => setSelectedDate(d)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(key)}
            >
              <div className="ribbon-name">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} {d.getDate()}</div>
              <div className="load-bar">
                <div className={`load-fill ${dc.overHours > 0 ? 'over' : ''}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="ribbon-meta">{count ? `${count} · ${dc.plannedHours}h` : '—'}</div>
            </button>
          );
        })}
      </div>

      {/* Day agenda */}
      <div className="agenda-head">
        <div>
          <h2 style={{ margin: 0 }}>
            {(() => { const d = parseDateKey(selectedKey); return `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]}, ${monthShort(d)} ${d.getDate()}`; })()}
          </h2>
          <div className="agenda-cap">
            {cap.availableHours}h avail · {open.length} tasks ≈ {cap.plannedHours}h
            {cap.overHours > 0 && <span className="cap-over"> ⚠ +{cap.overHours}h over</span>}
          </div>
        </div>
        {open.length > 0 && (
          <button className="btn" onClick={carryUndone} title="Move all undone tasks to the next day">
            <CornerDownRight size={14} /> Carry {open.length} →
          </button>
        )}
      </div>

      <div className="agenda">
        {dayTasks.length === 0 && (
          <div className="agenda-empty">
            <strong>Nothing scheduled</strong>
            Add a task, or paste a message on the <em>Today</em> screen.
          </div>
        )}
        {open.map((t) => <Row key={t.id} t={t} />)}
        {done.length > 0 && (
          <>
            <div className="agenda-divider">done · {done.length}</div>
            {done.map((t) => <Row key={t.id} t={t} />)}
          </>
        )}
      </div>

      {drawer !== undefined && (
        <TaskDrawer task={drawer} defaultDate={selectedKey} onClose={() => setDrawer(undefined)} />
      )}
    </div>
  );
}
