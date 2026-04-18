import { useState } from 'react';
import { Modal } from './Modal';
import { useStore, DEFAULT_PROJECT_COLORS } from '../store';
import type { Project } from '../types';
import { formatMoney } from '../utils';

interface Props {
  project?: Project | null;
  /** Pre-select a client when creating a new project (from a Client detail page). */
  defaultClientId?: string;
  onClose: () => void;
}

export function ProjectModal({ project, defaultClientId, onClose }: Props) {
  const clients = useStore((s) => s.clients);
  const addProject = useStore((s) => s.addProject);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const settings = useStore((s) => s.settings);

  const isEdit = !!project;
  const [name, setName] = useState(project?.name || '');
  const [clientId, setClientId] = useState(
    project?.clientId || defaultClientId || clients[0]?.id || ''
  );
  const [color, setColor] = useState(project?.color || DEFAULT_PROJECT_COLORS[0]);
  const [status, setStatus] = useState<Project['status']>(project?.status || 'active');
  const [hourlyRate, setHourlyRate] = useState<string>(
    project?.hourlyRate != null ? String(project.hourlyRate) : ''
  );
  const [error, setError] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);
  const effectiveRatePreview = (() => {
    if (hourlyRate.trim()) {
      const n = Number(hourlyRate);
      if (!isNaN(n) && n > 0) return n;
    }
    return selectedClient?.hourlyRate ?? 0;
  })();

  const parseRate = (): number | undefined => {
    if (!hourlyRate.trim()) return undefined;
    const n = Number(hourlyRate);
    if (isNaN(n) || n < 0) return undefined;
    return n;
  };

  const onSave = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!clientId) { setError('Pick a client'); return; }
    if (hourlyRate.trim() && (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)) {
      setError('Rate must be a positive number or blank'); return;
    }
    const rate = parseRate();
    if (isEdit && project) {
      updateProject(project.id, {
        name: name.trim(),
        clientId,
        color,
        status,
        hourlyRate: rate,
      });
    } else {
      addProject({
        name: name.trim(),
        clientId,
        color,
        status,
        hourlyRate: rate,
      });
    }
    onClose();
  };

  const onDelete = () => {
    if (!project) return;
    if (confirm(`Delete "${project.name}"? All its time entries will also be deleted.`)) {
      deleteProject(project.id);
      onClose();
    }
  };

  const footer = (
    <>
      {isEdit && (
        <button className="btn btn-danger-ghost" onClick={onDelete} style={{ marginRight: 'auto' }}>
          Delete
        </button>
      )}
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-dark" onClick={onSave}>{isEdit ? 'Save' : 'Create'}</button>
    </>
  );

  if (clients.length === 0) {
    return (
      <Modal
        title="Add a client first"
        onClose={onClose}
        footer={<button className="btn btn-dark" onClick={onClose}>OK</button>}
      >
        <p style={{ color: 'var(--text-muted)' }}>
          Every project belongs to a client. Create a client from the <strong>Clients</strong> page
          first, then come back here to add projects to it.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title={isEdit ? 'Edit project' : 'New project'}
      onClose={onClose}
      footer={footer}
    >
      <div className="field">
        <label>Client</label>
        <select
          className="select"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.hourlyRate ? ` · ${formatMoney(c.hourlyRate, settings.currencySymbol)}/hr` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Project name</label>
        <input
          className="input"
          placeholder="e.g. Website redesign"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          autoFocus
        />
      </div>
      <div className="modal-row">
        <div className="field">
          <label>Color</label>
          <div className="swatches">
            {DEFAULT_PROJECT_COLORS.map((c) => (
              <button
                key={c}
                className={`swatch ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label>
            Rate override (optional)
          </label>
          <input
            className="input mono"
            placeholder={selectedClient?.hourlyRate ? String(selectedClient.hourlyRate) : 'e.g. 100'}
            value={hourlyRate}
            onChange={(e) => { setHourlyRate(e.target.value); setError(null); }}
            inputMode="decimal"
          />
          <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
            {hourlyRate.trim()
              ? `Overrides client default`
              : selectedClient?.hourlyRate
                ? `Inherits ${formatMoney(selectedClient.hourlyRate, settings.currencySymbol)}/hr from ${selectedClient.name}`
                : `No default rate on ${selectedClient?.name ?? 'this client'}`}
          </span>
        </div>
      </div>
      {isEdit && (
        <div className="field">
          <label>Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as Project['status'])}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      )}
      {effectiveRatePreview > 0 && (
        <div style={{
          padding: '8px 12px', borderRadius: 6,
          background: 'var(--primary-soft, #E8F2ED)',
          color: 'var(--accent)',
          fontSize: 13, fontWeight: 500,
        }}>
          Effective rate: {formatMoney(effectiveRatePreview, settings.currencySymbol)}/hr
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
    </Modal>
  );
}
