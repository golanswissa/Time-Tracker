import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../ui';
import { ProjectModal } from '../components/ProjectModal';
import { actualSecondsForTask, sortTasks, STATUS_META } from '../planner';
import { entrySeconds, formatHMS, monthShort, parseDateKey } from '../utils';
import type { Project } from '../types';
import { IconPlus, IconPencil } from '../components/icons';

export function ProjectsView() {
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const scheduledTasks = useStore((s) => s.scheduledTasks);
  const entries = useStore((s) => s.entries);
  const openCreate = useUI((s) => s.openCreate);
  const openEdit = useUI((s) => s.openEdit);

  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<Project | null | 'new'>(null); // null closed, 'new' add, project edit

  // live tick so a running project's counter updates each second
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const client = (p?: Project) => clients.find((c) => c.id === p?.clientId);

  // which task (and therefore project) is currently running
  const runningEntry = entries.find((e) => e.isRunning);
  const runningTask = runningEntry
    ? scheduledTasks.find((t) => t.id === runningEntry.scheduledTaskId)
    : undefined;
  const runningProjectId = runningTask?.projectId ?? null;

  const stats = (pid: string) => {
    const secs = entries.filter((e) => e.projectId === pid).reduce((a, e) => a + entrySeconds(e, now), 0);
    const ts = scheduledTasks.filter((t) => t.projectId === pid);
    return {
      secs,
      total: ts.length,
      open: ts.filter((t) => t.status !== 'done').length,
      done: ts.filter((t) => t.status === 'done').length,
    };
  };

  const sel = selected ? projects.find((p) => p.id === selected) : null;

  // ---------- detail ----------
  if (sel) {
    const c = client(sel);
    const tasks = scheduledTasks.filter((t) => t.projectId === sel.id).slice().sort(sortTasks);
    const s = stats(sel.id);
    const running = runningProjectId === sel.id;
    const runSecs = running && runningTask ? actualSecondsForTask(entries, runningTask.id, now) : 0;
    return (
      <div className="wk-pwrap">
        <button className="wk-today" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>‹ All projects</button>
        <div className={`wk-pdetail ${running ? 'run' : ''}`}>
          <div className="wk-pd-top">
            <div className="wk-pd-text">
              <div className="wk-pd-cl">{c?.name || '—'}</div>
              <h1 className="wk-pd-nm">{sel.name}</h1>
              {sel.description && <div className="wk-pd-desc">{sel.description}</div>}
            </div>
            <div className="wk-pd-acts">
              {running && <div className="wk-pd-timer mono"><span className="wk-rdot" />{formatHMS(runSecs, true)}</div>}
              <button className="wk-ed" title="Edit project" onClick={() => setModal(sel)}><IconPencil /></button>
            </div>
          </div>
          <div className="wk-pd-stats mono">
            {formatHMS(s.secs)} tracked · {s.open} open · {s.done} done
          </div>
        </div>

        <div className="wk-pd-tasksbar">
          <span>Tasks</span>
          <button className="wk-today" onClick={() => openCreate({ projectId: sel.id, clientId: sel.clientId })}>+ Add task</button>
        </div>
        <div className="wk-tasklist">
          {tasks.length === 0 && <div className="wk-empty">No tasks yet — add the first one.</div>}
          {tasks.map((t) => {
            const tracked = actualSecondsForTask(entries, t.id, now);
            const sc = STATUS_META[t.status];
            const d = parseDateKey(t.date);
            const isRun = runningTask?.id === t.id;
            return (
              <button key={t.id} className="wk-trow" onClick={() => openEdit(t.id)}>
                <span className="wk-st" style={{ color: sc.c }}><span className="wk-dot" style={{ background: sc.c }} />{sc.label}</span>
                <span className="wk-tr-nm">{t.title}</span>
                <span className="wk-tr-date">{monthShort(d)} {d.getDate()}</span>
                <span className={`wk-tr-t mono ${isRun ? 'run' : tracked > 0 ? 'has' : ''}`}>{formatHMS(tracked, isRun)}</span>
              </button>
            );
          })}
        </div>

        {modal !== null && (
          <ProjectModal project={modal === 'new' ? null : modal} onClose={() => setModal(null)} />
        )}
      </div>
    );
  }

  // ---------- grid ----------
  return (
    <div className="wk-pwrap">
      <div className="wk-phead">
        <h1>Projects</h1>
        <button className="wk-pfab" onClick={() => setModal('new')} title="New project"><IconPlus /></button>
      </div>
      <div className="wk-pgrid">
        {projects.map((p) => {
          const s = stats(p.id);
          const c = client(p);
          const running = runningProjectId === p.id;
          const runSecs = running && runningTask ? actualSecondsForTask(entries, runningTask.id, now) : 0;
          return (
            <button key={p.id} className={`wk-pcard ${running ? 'run' : ''}`} onClick={() => setSelected(p.id)}>
              <div className="wk-pc-head">
                <div className="wk-pc-text">
                  <div className="wk-pc-cl">{c?.name || '—'}</div>
                  <div className="wk-pc-nm">{p.name}</div>
                </div>
                {running && <div className="wk-pc-timer mono"><span className="wk-rdot" />{formatHMS(runSecs, true)}</div>}
              </div>
              {p.description && <div className="wk-pc-desc">{p.description}</div>}
              <div className="wk-pc-stats mono">
                {formatHMS(s.secs)} · {s.open} open{s.done ? ` · ${s.done} done` : ''}
              </div>
            </button>
          );
        })}
      </div>

      {modal !== null && (
        <ProjectModal project={modal === 'new' ? null : modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
