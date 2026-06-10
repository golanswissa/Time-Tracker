import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Play, Pause, ArrowRight, Plus, Clock, FileText, X } from 'lucide-react';
import { useStore, DEFAULT_DAILY_HOURS } from '../store';
import { TaskDrawer } from '../components/TaskDrawer';
import type { Route, ScheduledTask } from '../types';
import {
  actualSecondsForTask,
  dayCapacity,
  extractLinks,
  PRIORITY_META,
  sortTasks,
} from '../planner';
import {
  entrySeconds,
  formatHMS,
  formatDuration,
  monthShort,
  parseDateKey,
  todayKey,
} from '../utils';

interface Props {
  onNavigate: (r: Route) => void;
}

export function TodayPage({ onNavigate }: Props) {
  const scheduledTasks = useStore((s) => s.scheduledTasks);
  const entries = useStore((s) => s.entries);
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const settings = useStore((s) => s.settings);
  const addScheduledTask = useStore((s) => s.addScheduledTask);
  const startTaskTimer = useStore((s) => s.startTaskTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const setTaskStatus = useStore((s) => s.setTaskStatus);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [lastAdded, setLastAdded] = useState<ScheduledTask | null>(null);
  const [creating, setCreating] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const tKey = todayKey();

  const todayTasks = useMemo(
    () => scheduledTasks.filter((t) => t.date === tKey).sort(sortTasks),
    [scheduledTasks, tKey]
  );
  const openToday = todayTasks.filter((t) => t.status !== 'done');
  const cap = useMemo(
    () => dayCapacity(scheduledTasks, entries, tKey, DEFAULT_DAILY_HOURS, now),
    [scheduledTasks, entries, tKey, now]
  );

  // Future days only — never repeats what's already in today's Focus list.
  const comingUp = useMemo(() => {
    return scheduledTasks
      .filter((t) => t.status !== 'done' && t.date > tKey)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .slice(0, 4);
  }, [scheduledTasks, tKey]);

  const runningEntry = entries.find((e) => e.isRunning);

  const getProject = (id?: string) => projects.find((p) => p.id === id);
  const getClient = (t: ScheduledTask) => {
    if (t.clientId) return clients.find((c) => c.id === t.clientId);
    const p = getProject(t.projectId);
    return p ? clients.find((c) => c.id === p.clientId) : undefined;
  };

  // --- computed Brief (no AI yet): one calm line, capacity shown by the meter ---
  const brief = useMemo(() => {
    if (openToday.length === 0) {
      return 'Nothing scheduled yet — paste a message below to start your day.';
    }
    const asap = openToday.filter((t) => t.priority === 'asap');
    const risk = asap.find((t) => t.deadline && t.deadline <= tKey) || asap[0] || openToday[0];
    const lead: string[] = [];
    if (asap.length) lead.push(`${asap.length} ASAP`);
    if (cap.overHours > 0) lead.push(`${cap.overHours}h over capacity`);
    let s = lead.length ? lead.join(' · ') + '.' : `${openToday.length} tasks today.`;
    if (risk) {
      s += ` Start with “${risk.title}”${risk.deadline === tKey ? ' — due today' : ''}.`;
    }
    return s;
  }, [openToday, cap, tKey]);

  const meterPct = Math.min(100, cap.availableHours ? (cap.plannedHours / cap.availableHours) * 100 : 0);

  // --- capture (AI stubbed) ---
  const onPaste = (e: React.ClipboardEvent) => {
    const imgItems = Array.from(e.clipboardData.items).filter((i) => i.type.startsWith('image/'));
    if (imgItems.length === 0) return;
    e.preventDefault();
    for (const item of imgItems) {
      const file = item.getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, String(reader.result)]);
      reader.readAsDataURL(file);
    }
  };

  const routeCapture = () => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;
    // STUB: until the AI endpoint is wired, a capture becomes one manual task.
    // (Seam: replace this with a call to /api/ai that returns multiple parsed tasks.)
    const firstLine = trimmed.split('\n').find((l) => l.trim()) || 'Untitled task';
    const task = addScheduledTask({
      title: firstLine.slice(0, 80),
      description: trimmed || undefined,
      date: tKey,
      priority: 'normal',
      kind: 'design',
      links: extractLinks(trimmed),
      attachments: images.length ? images : undefined,
      source: 'paste',
      rawText: trimmed || undefined,
    });
    setLastAdded(task);
    setText('');
    setImages([]);
  };

  const onStart = (taskId: string) => startTaskTimer(taskId);

  return (
    <div className="today-page">
      <div className="today-scroll">
        <div className="today-head">
          <h1>Today</h1>
          <span className="today-date">
            {(() => {
              const d = parseDateKey(tKey);
              return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${monthShort(d)} ${d.getDate()}`;
            })()}
          </span>
        </div>

        {/* Brief */}
        <div className="today-card brief-card">
          <div className="brief-head">
            <Sparkles size={15} />
            <span>Brief</span>
            <span className="brief-stub">AI summary — basic for now</span>
          </div>
          {openToday.length > 0 && (
            <div className="brief-meter">
              <div className="brief-meter-bar">
                <div className={`brief-meter-fill ${cap.overHours > 0 ? 'over' : ''}`} style={{ width: `${meterPct}%` }} />
              </div>
              <span className="brief-meter-label">
                {cap.plannedHours}h planned · {cap.availableHours}h
                {cap.overHours > 0 && <span className="cap-over"> · +{cap.overHours}h</span>}
              </span>
            </div>
          )}
          <p className="brief-body">{brief}</p>
        </div>

        {/* Focus — top of the list, the rest live on the Plan tab */}
        <div className="today-card">
          <div className="today-card-head">
            <span>Focus</span>
            <span className="cap-tag">{openToday.length} today</span>
          </div>
          {openToday.length === 0 ? (
            <div className="today-empty">No tasks today. Paste something below to add one.</div>
          ) : (
            openToday.slice(0, 3).map((t) => {
              const p = getProject(t.projectId);
              const c = getClient(t);
              const actual = actualSecondsForTask(entries, t.id, now);
              const running = runningEntry?.scheduledTaskId === t.id;
              return (
                <div key={t.id} className="trow" onClick={() => onNavigate('plan')}>
                  <span
                    className="prio-dot"
                    style={{ background: PRIORITY_META[t.priority].color }}
                    title={PRIORITY_META[t.priority].label}
                  />
                  <span className="trow-title">{t.title}</span>
                  {c && (
                    <span className="trow-client">
                      <span className="dot" style={{ background: c.color }} /> {c.name}
                    </span>
                  )}
                  <span className="trow-time mono">
                    {t.estimateHours ? `${t.estimateHours}h` : '—'} ·{' '}
                    {actual > 0 ? formatDuration(actual, settings.timeFormat) : '0:00'}
                  </span>
                  <button
                    className="trow-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      running ? stopTimer() : onStart(t.id);
                    }}
                    title={running ? 'Stop' : 'Start timer'}
                  >
                    {running ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                </div>
              );
            })
          )}
          {openToday.length > 0 && (
            <button className="today-link" onClick={() => onNavigate('plan')}>
              {openToday.length > 3 ? `+${openToday.length - 3} more in plan` : 'Open plan'} <ArrowRight size={13} />
            </button>
          )}
        </div>

        {/* Coming up */}
        {comingUp.length > 0 && (
          <div className="today-card">
            <div className="today-card-head">
              <span>Coming up</span>
            </div>
            <div className="coming-list">
              {comingUp.map((t) => {
                const d = parseDateKey(t.date);
                const c = getClient(t);
                return (
                  <div key={t.id} className="coming-row" onClick={() => onNavigate('plan')}>
                    <span className="coming-date mono">
                      {monthShort(d)} {d.getDate()}
                    </span>
                    {t.priority === 'asap' && <span className="prio-dot" style={{ background: PRIORITY_META.asap.color }} />}
                    <span className="coming-title">{t.title}</span>
                    {c && <span className="coming-client">{c.name}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {runningEntry && (
          <div className="today-running">
            <Clock size={13} /> Tracking now · {formatHMS(entrySeconds(runningEntry, now), true)}
            <button className="today-running-stop" onClick={stopTimer}>Stop</button>
          </div>
        )}
      </div>

      {/* Composer (docked) */}
      <div className="composer">
        {lastAdded && (
          <div className="composer-added">
            Added <strong>{lastAdded.title}</strong> to today.
            <button onClick={() => onNavigate('plan')}>Open in plan →</button>
            <button className="composer-added-x" onClick={() => setLastAdded(null)}><X size={13} /></button>
          </div>
        )}
        {images.length > 0 && (
          <div className="composer-thumbs">
            {images.map((src, i) => (
              <div key={i} className="composer-thumb">
                <img src={src} alt="pasted" />
                <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))}><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="composer-box">
          <textarea
            ref={composerRef}
            value={text}
            placeholder="Dump anything — paste text or a screenshot…"
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                routeCapture();
              }
            }}
            rows={1}
          />
          <button className="composer-route" onClick={routeCapture} disabled={!text.trim() && images.length === 0}>
            Route <ArrowRight size={14} />
          </button>
        </div>
        <div className="composer-pills">
          <button className="pill" onClick={() => setCreating(true)}><Plus size={13} /> Task</button>
          <button className="pill" onClick={() => onNavigate('timer')}><Play size={13} /> Start timer</button>
          <button className="pill" onClick={() => onNavigate('invoices')}><FileText size={13} /> Invoice</button>
          <button className="pill" onClick={() => onNavigate('plan')}>Plan <ArrowRight size={13} /></button>
        </div>
      </div>

      {creating && <TaskDrawer task={null} defaultDate={tKey} onClose={() => setCreating(false)} />}
    </div>
  );
}
