import { useEffect, useRef, useState } from 'react';
import { useUI } from '../ui';
import { useStore } from '../store';
import { parseTasks, parseSingleTask, autoSchedule, detectIntent, type ParsedTask } from '../taskParser';
import type { TaskPriority } from '../types';
import { parseDateKey, monthShort, todayKey } from '../utils';

type Row = ParsedTask & { state: 'pending' | 'approved'; reallocating?: boolean };
type Msg = { id: string; role: 'user' | 'assistant'; text?: string; rows?: Row[]; clarify?: { body: string } };

// three urgency levels only: Low / Medium / High (store 'normal' = Medium)
const PRIO_LABEL: Record<TaskPriority, string> = { asap: 'High', high: 'High', normal: 'Medium', low: 'Low' };
const PRIO_LEVEL: Record<TaskPriority, number> = { asap: 3, high: 3, normal: 2, low: 1 };
const PRIO_CYCLE: TaskPriority[] = ['high', 'normal', 'low'];

let _id = 0;
const uid = () => `m${Date.now().toString(36)}${_id++}`;

const ArrowUp = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
const CalIcon = () => (
  <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
);
const FolderIc = () => (
  <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5a2 2 0 0 1 2-2h3.6l2 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
);
const Signal = ({ level }: { level: number }) => (
  <svg className="sig" viewBox="0 0 24 24" width="15" height="15">
    <rect x="3" y="14" width="4" height="6" rx="1" fill={level >= 1 ? '#161616' : '#d3d3d8'} />
    <rect x="10" y="9.5" width="4" height="10.5" rx="1" fill={level >= 2 ? '#161616' : '#d3d3d8'} />
    <rect x="17" y="5" width="4" height="15" rx="1" fill={level >= 3 ? '#161616' : '#d3d3d8'} />
  </svg>
);

export function ChatRail() {
  const chatOpen = useUI((s) => s.chatOpen);
  const toggleChat = useUI((s) => s.toggleChat);
  const projects = useStore((s) => s.projects);
  const addScheduledTask = useStore((s) => s.addScheduledTask);

  const [text, setText] = useState('');
  const [thread, setThread] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread]);

  const proj = (id?: string) => projects.find((p) => p.id === id);
  const dateLabel = (key?: string) => {
    if (!key) return null;
    const d = parseDateKey(key);
    return `${monthShort(d)} ${d.getDate()}`;
  };

  // Build the assistant's response for a decided intent ('one' | 'several').
  const buildAssistant = (mode: 'one' | 'several', body: string): Msg => {
    if (mode === 'one') {
      const [r] = autoSchedule([parseSingleTask(body, projects)], { workdays: [1, 2, 3, 4, 5] });
      return { id: uid(), role: 'assistant', text: 'Here you go — one task:', rows: [{ ...r, state: 'pending' }] };
    }
    const parsed = autoSchedule(parseTasks(body, projects), { workdays: [1, 2, 3, 4, 5] });
    if (!parsed.length) return { id: uid(), role: 'assistant', text: "I couldn’t pull a task out of that — try again." };
    return { id: uid(), role: 'assistant', text: `Here you go — ${parsed.length} tasks, spread across the week:`, rows: parsed.map((p) => ({ ...p, state: 'pending' as const })) };
  };

  const send = () => {
    if (!text.trim()) return;
    const raw = text.trim();
    const { mode, body } = detectIntent(raw);
    const user: Msg = { id: uid(), role: 'user', text: raw };
    const assistant: Msg = mode === 'ask'
      ? { id: uid(), role: 'assistant', text: 'Got it — should I make this one task, or several?', clarify: { body } }
      : buildAssistant(mode, body);
    setThread((t) => [...t, user, assistant]);
    setText('');
  };

  // resolve an "one or several?" prompt → replace it with the actual cards
  const resolveClarify = (msgId: string, mode: 'one' | 'several') =>
    setThread((t) => t.map((m) => {
      if (m.id !== msgId || !m.clarify) return m;
      const built = buildAssistant(mode, m.clarify.body);
      return { ...m, text: built.text, rows: built.rows, clarify: undefined };
    }));

  const clear = () => { setThread([]); setText(''); };

  const fileRow = (r: Row) => {
    const p = proj(r.projectId);
    addScheduledTask({
      title: r.title, description: r.description?.trim() || undefined,
      projectId: r.projectId, clientId: p?.clientId,
      date: r.dateKey || todayKey(), deadline: r.deadline, priority: r.priority,
      kind: 'design', source: 'paste', status: 'todo',
    });
  };
  const patchRows = (msgId: string, fn: (rows: Row[]) => Row[]) =>
    setThread((t) => t.map((m) => (m.id === msgId && m.rows ? { ...m, rows: fn(m.rows) } : m)));

  const approve = (msgId: string, r: Row) => {
    fileRow(r);
    patchRows(msgId, (rows) => rows.map((x) => (x.id === r.id ? { ...x, state: 'approved', reallocating: false } : x)));
  };
  const approveAll = (msgId: string) => {
    const m = thread.find((x) => x.id === msgId);
    m?.rows?.filter((r) => r.state === 'pending').forEach(fileRow);
    patchRows(msgId, (rows) => rows.map((x) => (x.state === 'pending' ? { ...x, state: 'approved', reallocating: false } : x)));
  };
  const setProject = (msgId: string, id: string, projectId: string) =>
    patchRows(msgId, (rows) => rows.map((r) => (r.id === id ? { ...r, projectId, reallocating: false } : r)));
  const cyclePriority = (msgId: string, id: string, cur: TaskPriority) =>
    patchRows(msgId, (rows) => rows.map((r) => {
      if (r.id !== id) return r;
      const i = PRIO_CYCLE.indexOf(cur);
      return { ...r, priority: PRIO_CYCLE[(i + 1) % PRIO_CYCLE.length] };
    }));
  const updateTitle = (msgId: string, id: string, title: string) =>
    patchRows(msgId, (rows) => rows.map((r) => (r.id === id ? { ...r, title } : r)));
  const toggleRealloc = (msgId: string, id: string) =>
    patchRows(msgId, (rows) => rows.map((r) => (r.id === id ? { ...r, reallocating: !r.reallocating } : r)));
  const dismiss = (msgId: string, id: string) =>
    patchRows(msgId, (rows) => rows.filter((r) => r.id !== id));

  const renderCard = (msgId: string, r: Row) => {
    const p = proj(r.projectId);
    if (r.state === 'approved') {
      return (
        <div key={r.id} className="wk-tf-card ok">
          <div className="wk-tf-okrow"><Check /><span>{r.title}</span></div>
          <div className="wk-tf-okmeta">{p?.name || 'No project'}{r.dateKey ? ` · ${dateLabel(r.dateKey)}` : ''}</div>
        </div>
      );
    }
    return (
      <div key={r.id} className="wk-tf-card">
        <button className="wk-tf-dismiss" onClick={() => dismiss(msgId, r.id)} aria-label="Dismiss">×</button>
        <input className="wk-tf-title-in" value={r.title} onChange={(e) => updateTitle(msgId, r.id, e.target.value)} aria-label="Task title" />
        {r.original && <div className="wk-tf-orig">{r.original}</div>}
        {r.description && <div className="wk-tf-desc">{r.description}</div>}
        <div className="wk-tf-divider" />
        <div className="wk-tf-foot">
          <button className="wk-tf-fitem" onClick={() => toggleRealloc(msgId, r.id)} title="Change project">
            <FolderIc /><span>{p?.name || 'No project'}</span>
          </button>
          <button className="wk-tf-fitem prio" onClick={() => cyclePriority(msgId, r.id, r.priority)} title="Change urgency">
            <Signal level={PRIO_LEVEL[r.priority]} /><b>{PRIO_LABEL[r.priority]}</b>
          </button>
          {r.dateKey && (
            <span className="wk-tf-fitem date"><CalIcon />{r.deadline ? 'by ' : ''}{dateLabel(r.dateKey)}</span>
          )}
          <button className="wk-tf-approve" onClick={() => approve(msgId, r)}>Approve</button>
        </div>
        {r.reallocating && (
          <div className="wk-tf-opts">
            {projects.map((op) => (
              <button key={op.id} className={`wk-tf-opt ${op.id === r.projectId ? 'sel' : ''}`} onClick={() => setProject(msgId, r.id, op.id)}>
                <i style={{ background: op.color }} />{op.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`wk-chat ${chatOpen ? 'on' : ''}`}>
      <div className="wk-cp-in">
        <div className="wk-tf-h">
          <span className="wk-tf-title"><span className="wk-tf-dot" />Traffic</span>
          {thread.length > 0 && <button className="wk-tf-new" onClick={clear}>New</button>}
          <button className="wk-tf-x" onClick={toggleChat} aria-label="Close">×</button>
        </div>

        <div className="wk-tf-thread" ref={scrollRef}>
          {thread.length === 0 && (
            <div className="wk-tf-empty">
              <div className="wk-tf-hero">
                <div className="wk-tf-hero-mark"><ArrowUp /></div>
                <div className="wk-tf-hero-t">Tell me what to add</div>
                <div className="wk-tf-hero-p">
                  Type a command and paste — <b>“Create a task: …”</b> for one, or
                  <b> “Create these tasks and spread across the week: …”</b> for several. I’ll translate it,
                  file it under a project, and schedule it. If it’s unclear, I’ll ask. You confirm before anything lands.
                </div>
              </div>
            </div>
          )}

          {thread.map((m) => (m.role === 'user' ? (
            <div key={m.id} className="wk-tf-umsg"><div className="wk-tf-ubub">{m.text}</div></div>
          ) : (
            <div key={m.id} className="wk-tf-amsg">
              {m.text && <div className="wk-tf-aintro">{m.text}</div>}
              {m.clarify && (
                <div className="wk-tf-clarify">
                  <button className="wk-tf-cbtn" onClick={() => resolveClarify(m.id, 'one')}>One task</button>
                  <button className="wk-tf-cbtn" onClick={() => resolveClarify(m.id, 'several')}>Several</button>
                </div>
              )}
              {m.rows?.map((r) => renderCard(m.id, r))}
              {m.rows && m.rows.some((r) => r.state === 'pending') && (
                <button className="wk-tf-all" onClick={() => approveAll(m.id)}>
                  <Check /> Approve all {m.rows.filter((r) => r.state === 'pending').length}
                </button>
              )}
            </div>
          )))}
        </div>

        <div className="wk-tf-composer">
          <textarea
            className="wk-tf-ta"
            placeholder="e.g. “Create a task: …” or “Create these tasks and spread across the week: …”"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
          />
          <button className="wk-tf-send" onClick={send} disabled={!text.trim()} aria-label="Send"><ArrowUp /></button>
        </div>
      </div>
    </aside>
  );
}
