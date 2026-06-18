import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { Project } from '../types';
import { PillSelect } from './PillSelect';
import { IconTrash } from './icons';

interface Props {
  /** The project being edited; null = creating a new one. */
  project: Project | null;
  open: boolean;
  /** Pre-select a client when creating (from a Client detail page). */
  defaultClientId?: string;
  onClose: () => void;
}

/** Textarea that grows to fit its content. */
function AutoTextarea({ value, onChange, placeholder, className, inputRef, singleLine }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  className?: string; inputRef?: React.RefObject<HTMLTextAreaElement>; singleLine?: boolean;
}) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? innerRef;
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, ref]);
  return (
    <textarea ref={ref} className={className} value={value} placeholder={placeholder} rows={1}
      onKeyDown={singleLine ? (e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } } : undefined}
      onChange={(e) => onChange(e.target.value)} />
  );
}

const STATUS_OPTS = [
  { value: 'active', label: 'Active', icon: <span className="wk-pill-sw" style={{ background: '#0f7a45' }} /> },
  { value: 'archived', label: 'Archived', icon: <span className="wk-pill-sw" style={{ background: '#9aa4b3' }} /> },
];

export function ProjectPanel({ project, open, defaultClientId, onClose }: Props) {
  const clients = useStore((s) => s.clients);
  const addProject = useStore((s) => s.addProject);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState<Project['status']>('active');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLTextAreaElement>(null);

  const isEdit = !!project;

  // Populate on open (keep content through the slide-out close).
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (project) {
      setName(project.name); setClientId(project.clientId);
      setStatus(project.status); setDescription(project.description || '');
      setImage(project.image || '');
    } else {
      setName(''); setClientId(defaultClientId || clients[0]?.id || '');
      setStatus('active'); setDescription(''); setImage('');
      setTimeout(() => nameRef.current?.focus(), 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSave = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!clientId) { setError('Pick a client'); return; }
    const fields = {
      name: name.trim(), clientId, status,
      description: description.trim() || undefined,
      image: image.trim() || undefined,
    };
    if (isEdit && project) updateProject(project.id, fields);
    else addProject({ ...fields, color: '#161616' }); // color is legacy/unused (avatar is the sun/moon)
    onClose();
  };

  const onDelete = () => {
    if (!project) return;
    if (confirm(`Delete "${project.name}"? All its time entries will also be deleted.`)) {
      deleteProject(project.id);
      onClose();
    }
  };

  const noClients = clients.length === 0;

  return (
    <>
      <div className={`wk-ov ${open ? 'on' : ''}`} onClick={onClose} />
      <aside className={`wk-panel ${open ? 'on' : ''}`} aria-hidden={!open}>
        <div className="wk-ptop">
          <button className="wk-px" onClick={onClose} aria-label="Close">×</button>
        </div>

        {noClients ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
            Every project belongs to a client. Create a client from the <strong>Clients</strong> page first, then come back to add projects to it.
          </p>
        ) : (
          <>
            <AutoTextarea inputRef={nameRef} className="wk-ptitle" value={name} placeholder="Project name"
              singleLine onChange={(v) => { setName(v); setError(null); }} />

            <AutoTextarea className="wk-pdesc" value={description} placeholder="Add description…"
              onChange={(v) => setDescription(v)} />

            <div className="wk-pills">
              <PillSelect value={clientId}
                options={clients.map((c) => ({ value: c.id, label: c.name, icon: <span className="wk-pill-sw" style={{ background: c.color }} /> }))}
                onChange={(v) => setClientId(v)} />
              <PillSelect value={status}
                options={STATUS_OPTS}
                onChange={(v) => setStatus(v as Project['status'])} />
            </div>

            <label className="wk-fld full wk-notes-fld"><span>Cover image URL</span>
              <input className="wk-cover-in" value={image} placeholder="Leave blank for the sun / moon avatar"
                onChange={(e) => setImage(e.target.value)} />
            </label>

            {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

            <div className="wk-pfoot">
              {isEdit && <button className="wk-del" title="Delete" onClick={onDelete}><IconTrash /></button>}
              <button className="wk-save" onClick={onSave}>{isEdit ? 'Save' : 'Create'}</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
