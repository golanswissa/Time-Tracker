import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../ui';
import { actualSecondsForTask, sortTasks } from '../planner';
import {
  addDays, entrySeconds, formatHMS, monthShort, parseDateKey, startOfWeek, toDateKey, todayKey,
} from '../utils';
import type { ScheduledTask } from '../types';
import { IconCal, IconPause, IconPencil, IconPlay } from '../components/icons';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DayView() {
  const scheduledTasks = useStore((s) => s.scheduledTasks);
  const entries = useStore((s) => s.entries);
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const settings = useStore((s) => s.settings);
  const startTaskTimer = useStore((s) => s.startTaskTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const openEdit = useUI((s) => s.openEdit);
  const openCreate = useUI((s) => s.openCreate);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const selectedKey = toDateKey(selectedDate);
  const isToday = selectedKey === todayKey();

  const dayTasks = useMemo(
    () => scheduledTasks.filter((t) => t.date === selectedKey).slice().sort(sortTasks),
    [scheduledTasks, selectedKey]
  );

  const weekKeys = useMemo(() => {
    const start = startOfWeek(selectedDate, settings.weekStart);
    return new Set(Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i))));
  }, [selectedDate, settings.weekStart]);

  const dayTotal = entries.filter((e) => e.date === selectedKey).reduce((a, e) => a + entrySeconds(e, now), 0);
  const weekTotal = entries.filter((e) => weekKeys.has(e.date)).reduce((a, e) => a + entrySeconds(e, now), 0);

  const runningTaskId = entries.find((e) => e.isRunning)?.scheduledTaskId ?? null;
  const expandedId =
    activeId && dayTasks.some((t) => t.id === activeId) ? activeId
      : runningTaskId && dayTasks.some((t) => t.id === runningTaskId) ? runningTaskId
        : null;

  const getProject = (id?: string) => projects.find((p) => p.id === id);
  const getClient = (t: ScheduledTask) => {
    if (t.clientId) return clients.find((c) => c.id === t.clientId);
    const p = getProject(t.projectId);
    return p ? clients.find((c) => c.id === p.clientId) : undefined;
  };

  const shiftDay = (d: number) => setSelectedDate((cur) => addDays(cur, d));
  const onCardClick = (t: ScheduledTask) => {
    if (runningTaskId === t.id) stopTimer();
    else startTaskTimer(t.id);
    setActiveId(t.id);
  };

  const d = parseDateKey(selectedKey);
  const dateLabel = `${DOW[d.getDay()]}, ${d.getDate()} ${monthShort(d)}`;

  return (
    <div className="wk-col">
      <div className="wk-head">
        <div className="wk-daynav">
          <button onClick={() => shiftDay(-1)} aria-label="Previous day">‹</button>
          <button onClick={() => shiftDay(1)} aria-label="Next day">›</button>
          <label className="wk-cal" title="Jump to a date">
            <IconCal />
            <input type="date" value={selectedKey} onChange={(e) => e.target.value && setSelectedDate(parseDateKey(e.target.value))} />
          </label>
          {!isToday && <button className="wk-today" onClick={() => setSelectedDate(new Date())}>Today</button>}
        </div>
        <div className="wk-title">
          {isToday && <span className="lbl">Today: </span>}{dateLabel}
        </div>
        <div className="wk-totline mono">
          <b>{formatHMS(dayTotal)}</b> today · {formatHMS(weekTotal)} this week
        </div>
      </div>

      <div className="wk-list">
        {dayTasks.length === 0 && (
          <div className="wk-empty">
            Nothing here yet — hit <b>+</b> to add a task{' '}
            <button className="wk-today" style={{ marginLeft: 6 }} onClick={openCreate}>New task</button>
          </div>
        )}
        {dayTasks.map((t) => {
          const project = getProject(t.projectId);
          const client = getClient(t);
          const tracked = actualSecondsForTask(entries, t.id, now);
          const running = runningTaskId === t.id;
          const worked = tracked > 0;
          const estS = (t.estimateHours || 0) * 3600;
          const over = estS > 0 && tracked > estS;
          const overH = Math.round((tracked - estS) / 3600);
          const pct = estS > 0 ? Math.min(100, (tracked / estS) * 100) : 0;

          if (t.id === expandedId) {
            return (
              <div key={t.id} className={`wk-card exp ${running ? 'run' : worked ? 'done' : ''}`} onClick={() => onCardClick(t)}>
                <div className="top">
                  <div>
                    <div className="pj">{project?.name || client?.name || 'No project'}</div>
                    <div className="nm">{t.title}</div>
                  </div>
                  <div className="acts">
                    <button className="wk-ed" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(t.id); }}><IconPencil /></button>
                    <button className="wk-pp" onClick={(e) => { e.stopPropagation(); onCardClick(t); }}>{running ? <IconPause /> : <IconPlay />}</button>
                  </div>
                </div>
                {t.description && <div className="desc">{t.description}</div>}
                <div className="time mono" title={over ? `${overH}h over estimate` : undefined}>{formatHMS(tracked)}</div>
                {estS > 0 && (
                  <div className="wk-pbar">
                    <div className="track"><div className="tick" style={{ left: `${pct}%` }} /></div>
                    <div className="ends">
                      <span>{running ? <><span className="live" />running</> : worked ? 'stopped' : 'not started'}</span>
                      <span>est {t.estimateHours}h{over ? ` · +${overH}h over` : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return (
            <div key={t.id} className={`wk-card cond ${worked ? 'done' : ''}`} onClick={() => onCardClick(t)}>
              <button className="wk-pp" onClick={(e) => { e.stopPropagation(); onCardClick(t); }}>{running ? <IconPause /> : <IconPlay />}</button>
              <div>
                <div className="nm">{t.title}</div>
                <div className="pj">{project?.name || client?.name || 'No project'}</div>
              </div>
              <div className="t mono" title={over ? `${overH}h over estimate` : undefined}>{formatHMS(tracked)}</div>
              <div className="wk-cbar"><i style={{ width: `${estS > 0 ? pct : (worked ? 100 : 0)}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
