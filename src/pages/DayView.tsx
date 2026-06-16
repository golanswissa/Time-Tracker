import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../ui';
import { actualSecondsForTask, sortTasks } from '../planner';
import { addDays, entrySeconds, formatHMS, parseDateKey, toDateKey, todayKey } from '../utils';
import type { ScheduledTask } from '../types';
import { IconPause, IconPencil, IconPlay } from '../components/icons';

const DOW1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function DayView() {
  const scheduledTasks = useStore((s) => s.scheduledTasks);
  const entries = useStore((s) => s.entries);
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const startTaskTimer = useStore((s) => s.startTaskTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const setTaskStatus = useStore((s) => s.setTaskStatus);
  const openEdit = useUI((s) => s.openEdit);
  const openCreate = useUI((s) => s.openCreate);
  const setDayDate = useUI((s) => s.setDayDate);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const selectedKey = toDateKey(selectedDate);
  const isToday = selectedKey === todayKey();
  // keep the shell's "+" button creating tasks on the day you're looking at
  useEffect(() => { setDayDate(selectedKey); }, [selectedKey, setDayDate]);

  // Tasks "in play" for the day: scheduled on it, PLUS — only on today —
  // unfinished (Pending/Working/Under-review) tasks from earlier days, rolled
  // forward so nothing falls off. Done tasks don't roll.
  const relevant = useMemo(
    () => scheduledTasks.filter((t) =>
      t.date === selectedKey || (isToday && t.date < selectedKey && t.status !== 'done')),
    [scheduledTasks, selectedKey, isToday]
  );
  const dayTasks = useMemo(() => relevant.filter((t) => t.status !== 'blocked').slice().sort(sortTasks), [relevant]);
  const reviewTasks = useMemo(() => relevant.filter((t) => t.status === 'blocked'), [relevant]);

  // ----- week strip (Sunday-first) + month total -----
  const weekDays = useMemo(() => {
    const start = addDays(selectedDate, -selectedDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      const key = toDateKey(date);
      const secs = entries.filter((e) => e.date === key).reduce((a, e) => a + entrySeconds(e, now), 0);
      return { date, key, n: date.getDate(), secs };
    });
  }, [selectedDate, entries, now]);

  const monthTotal = useMemo(() => {
    const m = selectedDate.getMonth(), y = selectedDate.getFullYear();
    return entries
      .filter((e) => { const dd = parseDateKey(e.date); return dd.getMonth() === m && dd.getFullYear() === y; })
      .reduce((a, e) => a + entrySeconds(e, now), 0);
  }, [selectedDate, entries, now]);

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

  const shiftWeek = (d: number) => setSelectedDate((cur) => {
    const next = addDays(cur, d);
    // if the target week contains today, land on today (not the same weekday)
    const today = new Date();
    if (toDateKey(addDays(next, -next.getDay())) === toDateKey(addDays(today, -today.getDay()))) return today;
    return next;
  });
  const goReport = () => { window.location.hash = '#/reports'; };
  // Clicking the card body only expands/selects it — it does NOT start the timer.
  const expand = (t: ScheduledTask) => setActiveId(t.id);
  // The play/pause button starts/stops tracking — and starting marks it Working.
  const onPlay = (t: ScheduledTask) => {
    if (runningTaskId === t.id) stopTimer();
    else { startTaskTimer(t.id); setTaskStatus(t.id, 'doing'); }
    setActiveId(t.id);
  };
  // Pull a task back out of review → Working, surfaced at the top of the list.
  const reactivate = (t: ScheduledTask) => { setTaskStatus(t.id, 'doing'); setActiveId(t.id); setReviewOpen(false); };

  return (
    <div className="wk-col">
      <div className="wk-week">
        {!isToday && <button className="wk-wk-today" onClick={() => setSelectedDate(new Date())}>Today</button>}
        <button className="wk-wk-month" onClick={goReport} title="View this month’s report">
          <span>{MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
          <span className="vr"> · View report</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
        <div className="wk-wk-total">{formatHMS(monthTotal)}</div>
        <div className="wk-wk-row">
          <button className="wk-wk-arrow" onClick={() => shiftWeek(-7)} aria-label="Previous week">‹</button>
          <div className="wk-wk-days">
            {weekDays.map((wd, i) => (
              <button key={wd.key} className="wk-wk-day" onClick={() => setSelectedDate(wd.date)}>
                <span className="dow">{DOW1[i]}</span>
                <span className={`num ${wd.key === selectedKey ? 'sel' : ''}`}>{wd.n}</span>
                <span className="h">{formatHMS(wd.secs)}</span>
              </button>
            ))}
          </div>
          <button className="wk-wk-arrow" onClick={() => shiftWeek(7)} aria-label="Next week">›</button>
        </div>
      </div>

      <div className="wk-list">
        {dayTasks.length === 0 && (
          <div className="wk-empty">
            Nothing here yet — hit <b>+</b> to add a task{' '}
            <button className="wk-today" style={{ marginLeft: 6 }} onClick={() => openCreate({ date: selectedKey })}>New task</button>
          </div>
        )}
        {dayTasks.map((t) => {
          const project = getProject(t.projectId);
          const client = getClient(t);
          const tracked = actualSecondsForTask(entries, t.id, now);
          const running = runningTaskId === t.id;
          const worked = tracked > 0;
          const estS = (t.estimateHours || 0) * 3600;
          const overH = Math.round((tracked - estS) / 3600);
          const over = estS > 0 && overH >= 1;
          const pct = estS > 0 ? Math.min(100, (tracked / estS) * 100) : 0;

          if (t.id === expandedId) {
            return (
              <div key={t.id} className={`wk-card exp ${running ? 'run' : worked ? 'done' : ''}`} onClick={() => expand(t)}>
                <div className="top">
                  <div>
                    <div className="pj">{project?.name || client?.name || 'No project'}</div>
                    <div className="nm">{t.title}</div>
                  </div>
                  <div className="acts">
                    <button className="wk-ed" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(t.id); }}><IconPencil /></button>
                    <button className="wk-pp" onClick={(e) => { e.stopPropagation(); onPlay(t); }}>{running ? <IconPause /> : <IconPlay />}</button>
                  </div>
                </div>
                {t.description && <div className="desc">{t.description}</div>}
                <div className="time mono" title={over ? `${overH}h over estimate` : undefined}>{formatHMS(tracked, running)}</div>
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
            <div key={t.id} className={`wk-card cond ${running ? 'run' : worked ? 'done' : ''}`} onClick={() => expand(t)}>
              <button className="wk-pp" onClick={(e) => { e.stopPropagation(); onPlay(t); }}>{running ? <IconPause /> : <IconPlay />}</button>
              <div>
                <div className="nm">{t.title}</div>
                <div className="pj">{project?.name || client?.name || 'No project'}</div>
              </div>
              <div className="t mono" title={over ? `${overH}h over estimate` : undefined}>{formatHMS(tracked, running)}</div>
              <div className="wk-cbar"><i style={{ width: `${estS > 0 ? pct : (worked ? 100 : 0)}%` }} /></div>
            </div>
          );
        })}
      </div>

      {reviewTasks.length > 0 && (
        <div className="wk-rev">
          <button className="wk-rev-head" onClick={() => setReviewOpen((o) => !o)}>
            <span className="wk-rev-dot" />
            <span className="wk-rev-lbl">Under review · {reviewTasks.length}</span>
            <svg className={`wk-rev-cv ${reviewOpen ? 'open' : ''}`} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {reviewOpen && (
            <div className="wk-rev-list">
              {reviewTasks.map((t) => (
                <div key={t.id} className="wk-rev-row">
                  <div className="wk-rev-tx">
                    <div className="nm">{t.title}</div>
                    <div className="pj">{getProject(t.projectId)?.name || getClient(t)?.name || 'No project'}</div>
                  </div>
                  <button className="wk-rev-go" onClick={() => reactivate(t)}>Reactivate</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
