import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { useStore, DEFAULT_PROJECT_COLORS } from '../store';
import type { Project, RateTier } from '../types';
import { formatMoney } from '../utils';

interface Props {
  project?: Project | null;
  /** Pre-select a client when creating a new project (from a Client detail page). */
  defaultClientId?: string;
  onClose: () => void;
}

interface TierRow {
  uptoHours: string; // empty string = "no cap" (last tier)
  rate: string;
}

const tiersToRows = (tiers: RateTier[] | undefined): TierRow[] => {
  if (!tiers || tiers.length === 0) return [];
  return tiers.map((t) => ({
    uptoHours: t.uptoHours == null ? '' : String(t.uptoHours),
    rate: String(t.rate),
  }));
};

const rowsToTiers = (rows: TierRow[]): { tiers?: RateTier[]; error?: string } => {
  const populated = rows.filter((r) => r.rate.trim() !== '' || r.uptoHours.trim() !== '');
  if (populated.length === 0) return { tiers: undefined };
  const tiers: RateTier[] = [];
  for (let i = 0; i < populated.length; i++) {
    const r = populated[i];
    const isLast = i === populated.length - 1;
    const rate = Number(r.rate);
    if (!r.rate.trim() || isNaN(rate) || rate < 0) {
      return { error: `Tier ${i + 1}: enter a valid rate.` };
    }
    if (isLast) {
      tiers.push({ rate });
    } else {
      const cap = Number(r.uptoHours);
      if (!r.uptoHours.trim() || isNaN(cap) || cap <= 0) {
        return { error: `Tier ${i + 1}: enter the cumulative hour cap.` };
      }
      const prevCap = i > 0 ? tiers[i - 1].uptoHours ?? 0 : 0;
      if (cap <= prevCap) {
        return { error: `Tier ${i + 1}: cap must be greater than ${prevCap}.` };
      }
      tiers.push({ uptoHours: cap, rate });
    }
  }
  return { tiers };
};

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
  const [tieredEnabled, setTieredEnabled] = useState<boolean>(
    !!project?.rateTiers && project.rateTiers.length > 0
  );
  const [tierRows, setTierRows] = useState<TierRow[]>(
    project?.rateTiers && project.rateTiers.length > 0
      ? tiersToRows(project.rateTiers)
      : [{ uptoHours: '100', rate: '100' }, { uptoHours: '', rate: '80' }]
  );
  const [error, setError] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);
  const effectiveRatePreview = (() => {
    if (tieredEnabled) return null;
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

  const updateTierRow = (idx: number, patch: Partial<TierRow>) => {
    setTierRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setError(null);
  };
  const addTierRow = () => {
    setTierRows((rows) => {
      // The new row becomes the new last (no cap). Old last gets a cap if missing.
      const next = rows.map((r, i) => (i === rows.length - 1 && !r.uptoHours ? { ...r, uptoHours: '' } : r));
      return [...next, { uptoHours: '', rate: '' }];
    });
  };
  const removeTierRow = (idx: number) => {
    setTierRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const onSave = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!clientId) { setError('Pick a client'); return; }
    if (!tieredEnabled && hourlyRate.trim() && (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)) {
      setError('Rate must be a positive number or blank'); return;
    }

    let nextTiers: RateTier[] | undefined = undefined;
    if (tieredEnabled) {
      const result = rowsToTiers(tierRows);
      if (result.error) { setError(result.error); return; }
      nextTiers = result.tiers;
    }

    const rate = tieredEnabled ? undefined : parseRate();
    if (isEdit && project) {
      updateProject(project.id, {
        name: name.trim(),
        clientId,
        color,
        status,
        hourlyRate: rate,
        rateTiers: tieredEnabled ? nextTiers : undefined,
      });
    } else {
      addProject({
        name: name.trim(),
        clientId,
        color,
        status,
        hourlyRate: rate,
        rateTiers: tieredEnabled ? nextTiers : undefined,
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
            disabled={tieredEnabled}
          />
          <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
            {tieredEnabled
              ? 'Disabled while tiered billing is on'
              : hourlyRate.trim()
                ? `Overrides client default`
                : selectedClient?.hourlyRate
                  ? `Inherits ${formatMoney(selectedClient.hourlyRate, settings.currencySymbol)}/hr from ${selectedClient.name}`
                  : `No default rate on ${selectedClient?.name ?? 'this client'}`}
          </span>
        </div>
      </div>

      <div className="field">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ marginBottom: 0 }}>Tiered billing</label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={tieredEnabled}
              onChange={(e) => { setTieredEnabled(e.target.checked); setError(null); }}
            />
            Use tiered rates
          </label>
        </div>
        {tieredEnabled && (
          <div className="tier-editor">
            <div className="tier-head">
              <div>Up to (cumulative hrs)</div>
              <div>Rate / hr</div>
              <div />
            </div>
            {tierRows.map((row, i) => {
              const isLast = i === tierRows.length - 1;
              return (
                <div key={i} className="tier-row">
                  <input
                    className="input mono"
                    placeholder={isLast ? 'no cap' : 'e.g. 100'}
                    value={row.uptoHours}
                    onChange={(e) => updateTierRow(i, { uptoHours: e.target.value })}
                    inputMode="decimal"
                    disabled={isLast}
                  />
                  <div className="rate-input-wrap" style={{ width: '100%' }}>
                    <span className="rate-prefix">{settings.currencySymbol}</span>
                    <input
                      className="input mono"
                      style={{ paddingLeft: 22 }}
                      placeholder="e.g. 100"
                      value={row.rate}
                      onChange={(e) => updateTierRow(i, { rate: e.target.value })}
                      inputMode="decimal"
                    />
                  </div>
                  <button
                    type="button"
                    className="iconbtn-ghost"
                    onClick={() => removeTierRow(i)}
                    disabled={tierRows.length <= 1}
                    aria-label="Remove tier"
                    title="Remove tier"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            <button type="button" className="btn" onClick={addTierRow} style={{ alignSelf: 'flex-start' }}>
              <Plus size={14} /> Add tier
            </button>
            <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
              The last tier covers all hours above the previous cap.
              Example: 100 hrs @ {settings.currencySymbol}100, then {settings.currencySymbol}80 above 100.
            </span>
          </div>
        )}
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
      {effectiveRatePreview != null && effectiveRatePreview > 0 && (
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
