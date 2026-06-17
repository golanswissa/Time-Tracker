import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '../store';
import { useUI } from '../ui';
import { actualSecondsForTask, actualSecondsForTaskOnDay, dueInfo, PRIORITY_META, sortTasks, STATUS_META, STATUS_ORDER } from '../planner';
import { addDays, entrySeconds, formatHMS, parseDateKey, toDateKey, todayKey } from '../utils';
import type { ScheduledTask, TaskStatus } from '../types';
import { IconPause, IconPencil, IconPlay, IconStatus, IconPriority } from '../components/icons';

/** Status picker: a trigger you render, plus a dropdown of the four statuses. */
function StatusPicker({ value, onPick, children }: {
  value: TaskStatus; onPick: (s: TaskStatus) => void; children: (open: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="wk-stp" ref={ref}>
      <button className="wk-stp-trig" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>{children(open)}</button>
      {open && (
        <div className="wk-stp-menu" onClick={(e) => e.stopPropagation()}>
          {STATUS_ORDER.map((s) => (
            <button key={s} className={`wk-stp-opt ${s === value ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onPick(s); setOpen(false); }}>
              <span className="wk-stp-ic" style={{ color: STATUS_META[s].c }}><IconStatus status={s} /></span>
              <span className="wk-stp-lb">{STATUS_META[s].label}</span>
              {s === value && (
                <svg className="wk-stp-ck" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [statusFilter, setStatusFilter] = useState<TaskStatus>('doing');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const selectedKey = toDateKey(selectedDate);
  const isToday = selectedKey === todayKey();
  // keep the shell's "+" button creating tasks on the day you're looking at
  useEffect(() => { setDayDate(selectedKey); }, [selectedKey, setDayDate]);

  // Tasks always exist; the view is filtered by STATUS, not by the day.
  // The selected day is the time-context (per-day hours + week strip). In Progress
  // tasks simply persist until you change their status. List is priority-ordered.
  const dayTasks = useMemo(
    () => scheduledTasks.filter((t) => t.status === statusFilter).slice().sort(sortTasks),
    [scheduledTasks, statusFilter]
  );
  const counts = useMemo(() => {
    const c: Record<TaskStatus, number> = { todo: 0, doing: 0, blocked: 0, done: 0 };
    scheduledTasks.forEach((t) => { c[t.status] += 1; });
    return c;
  }, [scheduledTasks]);

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

  const weekTotal = useMemo(() => weekDays.reduce((a, d) => a + d.secs, 0), [weekDays]);

  const monthTotal = useMemo(() => {
    const m = selectedDate.getMonth(), y = selectedDate.getFullYear();
    return entries
      .filter((e) => { const dd = parseDateKey(e.date); return dd.getMonth() === m && dd.getFullYear() === y; })
      .reduce((a, e) => a + entrySeconds(e, now), 0);
  }, [selectedDate, entries, now]);

  // A timer is "running here" only for the day its entry is dated on — so a task
  // tracked today doesn't show as running when you look at other days.
  const runningHereId = entries.find((e) => e.isRunning && e.date === selectedKey)?.scheduledTaskId ?? null;
  const expandedId =
    activeId && dayTasks.some((t) => t.id === activeId) ? activeId
      : runningHereId && dayTasks.some((t) => t.id === runningHereId) ? runningHereId
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
  // Clicking anywhere on the card body opens the side drawer (and selects it).
  // The play/pause + edit buttons stop propagation, so they keep their own actions.
  const expand = (t: ScheduledTask) => { setActiveId(t.id); openEdit(t.id); };
  // The play/pause button starts/stops tracking — and starting marks it Working.
  const onPlay = (t: ScheduledTask) => {
    if (runningHereId === t.id) stopTimer();
    else { startTaskTimer(t.id, selectedKey); setTaskStatus(t.id, 'doing'); }
    setActiveId(t.id);
  };

  return (
    <div className="wk-col">
      <div className="wk-week">
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

      <div className="wk-filter">
        <StatusPicker value={statusFilter} onPick={setStatusFilter}>
          {(open) => (
            <span className={`wk-fpill ${open ? 'open' : ''}`}>
              <span className="wk-fpill-ic" style={{ color: STATUS_META[statusFilter].c }}><IconStatus status={statusFilter} /></span>
              <span className="wk-fpill-lb">{STATUS_META[statusFilter].label}</span>
              <span className="wk-fpill-n">{counts[statusFilter]}</span>
            </span>
          )}
        </StatusPicker>
        <div className="wk-filter-right">
          <span className="wk-wktot">Week Total: {formatHMS(weekTotal)}</span>
          {!isToday && <button className="wk-wk-today" onClick={() => setSelectedDate(new Date())}>Today</button>}
        </div>
      </div>

      <div className="wk-list">
        {dayTasks.length === 0 && (
          <div className="wk-empty">
            No {STATUS_META[statusFilter].label.toLowerCase()} tasks — hit <b>+</b> to add one{' '}
            <button className="wk-today" style={{ marginLeft: 6 }} onClick={() => openCreate({ date: selectedKey })}>New task</button>
          </div>
        )}
        {dayTasks.map((t) => {
          const project = getProject(t.projectId);
          const client = getClient(t);
          // Big number = the hours worked on THIS day (matches the panel + week
          // strip). The estimate bar references the whole-task budget (all days).
          const dayTracked = actualSecondsForTaskOnDay(entries, t.id, selectedKey, now);
          const tracked = actualSecondsForTask(entries, t.id, now);
          const running = runningHereId === t.id;
          const worked = dayTracked > 0;
          const estS = (t.estimateHours || 0) * 3600;
          const overH = Math.round((tracked - estS) / 3600);
          const over = estS > 0 && overH >= 1;
          const pct = estS > 0 ? Math.min(100, (tracked / estS) * 100) : 0;
          const due = dueInfo(t.deadline, todayKey());
          const prioColor = PRIORITY_META[t.priority].color;
          const statusGlyph = (
            <StatusPicker value={t.status} onPick={(s) => setTaskStatus(t.id, s)}>
              {() => <span className="wk-cstat" style={{ color: STATUS_META[t.status].c }} title={STATUS_META[t.status].label}><IconStatus status={t.status} size={16} /></span>}
            </StatusPicker>
          );
          // Priority bars + due label are ONE pill. With no deadline, bars alone.
          const prioBars = <span className="wk-prio" style={{ color: prioColor }} title={PRIORITY_META[t.priority].label}><IconPriority level={t.priority} /></span>;
          const metaPill = due
            ? <span className={`wk-due ${due.tone}`}>{prioBars}{due.label}</span>
            : prioBars;

          if (t.id === expandedId) {
            return (
              <div key={t.id} className={`wk-card exp ${running ? 'run' : worked ? 'done' : ''}`} onClick={() => expand(t)}>
                <div className="top">
                  <div className="wk-cinfo">
                    <div className="wk-cmeta">{statusGlyph}{metaPill}</div>
                    <div className="nm">{t.title}</div>
                    <div className="pj">{project?.name || client?.name || 'No project'}</div>
                  </div>
                  <div className="acts">
                    <button className="wk-ed" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(t.id); }}><IconPencil /></button>
                    <button className="wk-pp" onClick={(e) => { e.stopPropagation(); onPlay(t); }}>{running ? <IconPause /> : <IconPlay />}</button>
                  </div>
                </div>
                {t.description && <div className="desc">{t.description}</div>}
                <div className="time mono" title={over ? `${overH}h over estimate` : undefined}>{formatHMS(dayTracked, running)}</div>
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
              <div className="wk-cbody">
                {statusGlyph}
                {metaPill}
                <span className="nm">{t.title}</span>
              </div>
              <div className="t mono" title={over ? `${overH}h over estimate` : undefined}>{formatHMS(dayTracked, running)}</div>
              <button className="wk-pp" onClick={(e) => { e.stopPropagation(); onPlay(t); }}>{running ? <IconPause /> : <IconPlay />}</button>
              <div className="wk-cbar"><i style={{ width: `${estS > 0 ? pct : (worked ? 100 : 0)}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
