import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { useStore } from '../store';
import { EntryModal } from '../components/EntryModal';
import {
  addDays,
  entrySeconds,
  formatDuration,
  formatHMS,
  formatLongDate,
  isSameDay,
  parseDateKey,
  toDateKey,
  weekDays,
} from '../utils';
import type { Entry } from '../types';

export function TimerPage() {
  const entries = useStore((s) => s.entries);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const clients = useStore((s) => s.clients);
  const settings = useStore((s) => s.settings);
  const stopTimer = useStore((s) => s.stopTimer);
  const resumeEntry = useStore((s) => s.resumeEntry);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [modalEntry, setModalEntry] = useState<Entry | null | undefined>(undefined);

  // Tick every second so running timers update live
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const selectedKey = toDateKey(selectedDate);
  const weekRefDays = useMemo(
    () => weekDays(selectedDate, settings.weekStart),
    [selectedDate, settings.weekStart]
  );

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of weekRefDays) totals[toDateKey(d)] = 0;
    for (const e of entries) {
      if (totals[e.date] !== undefined) {
        totals[e.date] += entrySeconds(e, now);
      }
    }
    return totals;
  }, [entries, weekRefDays, now]);

  const weekTotal = useMemo(
    () => Object.values(dayTotals).reduce((a, b) => a + b, 0),
    [dayTotals]
  );

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === selectedKey).sort((a, b) => (a.isRunning === b.isRunning ? 0 : a.isRunning ? 1 : -1)),
    [entries, selectedKey]
  );

  const dayTotal = dayTotals[selectedKey] || 0;

  const getProject = (id: string) => projects.find((p) => p.id === id);
  const getTask = (id: string) => tasks.find((t) => t.id === id);

  const openNew = () => setModalEntry(null);
  const openEdit = (e: Entry) => setModalEntry(e);

  const goDay = (delta: number) => setSelectedDate((d) => addDays(d, delta));

  return (
    <div className="page">
      <div className="page-header">
        <div className="date-nav">
          <button className="iconbtn" onClick={() => goDay(-1)} aria-label="Previous day">
            <ChevronLeft size={14} />
          </button>
          <button className="iconbtn" onClick={() => goDay(1)} aria-label="Next day">
            <ChevronRight size={14} />
          </button>
          <div className="date-title">
            {isSameDay(selectedDate, new Date()) && <span className="label">Today:</span>}
            {formatLongDate(selectedDate)}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <label className="iconbtn" aria-label="Pick date" style={{ position: 'relative' }}>
            <Calendar size={14} />
            <input
              type="date"
              value={selectedKey}
              onChange={(e) => setSelectedDate(parseDateKey(e.target.value))}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            />
          </label>
          <button className="btn" onClick={() => setSelectedDate(new Date())}>Today</button>
        </div>
      </div>

      <div className="tracker">
        <div className="track-wrap">
          <button className="track-btn" onClick={openNew} aria-label="Track time" title="Track time">
            <Plus strokeWidth={2.25} />
          </button>
          <div className="track-label">Track time</div>
        </div>

        <div className="panel">
          <div className="day-strip">
            {weekRefDays.map((d) => {
              const key = toDateKey(d);
              const total = dayTotals[key] || 0;
              const active = key === selectedKey;
              const zero = total === 0;
              return (
                <button
                  key={key}
                  className={`day ${active ? 'active' : ''} ${zero ? 'zero' : ''}`}
                  onClick={() => setSelectedDate(d)}
                >
                  <div className="name">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}</div>
                  <div className="hrs">{formatDuration(total, settings.timeFormat)}</div>
                </button>
              );
            })}
            <div className="day week-total">
              <div className="name">Week total</div>
              <div className="hrs">{formatDuration(weekTotal, settings.timeFormat)}</div>
            </div>
          </div>

          <div className="entries">
            {dayEntries.length === 0 && (
              <div className="empty">
                <strong>No entries for this day</strong>
                Click <em>Track time</em> to start your first timer.
              </div>
            )}
            {dayEntries.map((e) => {
              const project = getProject(e.projectId);
              const task = getTask(e.taskId);
              const client = project ? clients.find((c) => c.id === project.clientId) : undefined;
              const seconds = entrySeconds(e, now);
              return (
                <div key={e.id} className={`entry ${e.isRunning ? 'running' : ''}`}>
                  <div className="entry-info">
                    <div className="entry-title">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className="dot" style={{ background: project?.color || '#bbb' }} />
                        {project?.name || '(deleted project)'}
                        {client && <span className="client">({client.name})</span>}
                      </span>
                    </div>
                    <div className="entry-task">
                      {task?.name || '(deleted task)'}
                      {e.notes && <> · <span style={{ color: 'var(--text-subtle)' }}>{e.notes}</span></>}
                    </div>
                  </div>
                  <div className={`entry-time ${e.isRunning ? 'running-time' : ''}`}>
                    {e.isRunning ? formatHMS(seconds, true) : formatDuration(seconds, settings.timeFormat)}
                  </div>
                  {e.isRunning ? (
                    <button className="btn btn-stop" onClick={stopTimer}>
                      <Pause className="btn-icon" />
                      Stop
                    </button>
                  ) : (
                    <button className="btn" onClick={() => resumeEntry(e.id)}>
                      <Play className="btn-icon" />
                      Start
                    </button>
                  )}
                  <button className="btn" onClick={() => openEdit(e)}>Edit</button>
                </div>
              );
            })}
          </div>

          <div className="total-row">
            <div className="label">Total:</div>
            <div className="value">{formatDuration(dayTotal, settings.timeFormat)}</div>
          </div>
        </div>
      </div>

      {modalEntry !== undefined && (
        <EntryModal
          entry={modalEntry}
          defaultDate={selectedKey}
          onClose={() => setModalEntry(undefined)}
        />
      )}
    </div>
  );
}
