import { useState } from 'react';
import { Modal } from './Modal';
import { DEFAULT_PROJECT_COLORS, useStore } from '../store';
import type { Client, ClientBilling } from '../types';

interface Props {
  client?: Client | null;
  onClose: () => void;
}

export function ClientModal({ client, onClose }: Props) {
  const addClient = useStore((s) => s.addClient);
  const updateClient = useStore((s) => s.updateClient);
  const deleteClient = useStore((s) => s.deleteClient);
  const projects = useStore((s) => s.projects);

  const isEdit = !!client;
  const [name, setName] = useState(client?.name || '');
  const [color, setColor] = useState(client?.color || DEFAULT_PROJECT_COLORS[0]);
  const [hourlyRate, setHourlyRate] = useState<string>(
    client?.hourlyRate != null ? String(client.hourlyRate) : ''
  );
  const [notes, setNotes] = useState(client?.notes || '');

  const [billingOpen, setBillingOpen] = useState<boolean>(
    !!client?.billing && Object.values(client.billing).some((v) => v && String(v).trim())
  );
  const [companyName, setCompanyName] = useState(client?.billing?.companyName || '');
  const [contactName, setContactName] = useState(client?.billing?.contactName || '');
  const [billingEmail, setBillingEmail] = useState(client?.billing?.email || '');
  const [billingAddress, setBillingAddress] = useState(client?.billing?.address || '');

  const [error, setError] = useState<string | null>(null);

  const parseRate = (): number | undefined => {
    if (!hourlyRate.trim()) return undefined;
    const n = Number(hourlyRate);
    if (isNaN(n) || n < 0) return undefined;
    return n;
  };

  const buildBilling = (): ClientBilling | undefined => {
    const billing: ClientBilling = {
      companyName: companyName.trim() || undefined,
      contactName: contactName.trim() || undefined,
      email: billingEmail.trim() || undefined,
      address: billingAddress.trim() || undefined,
    };
    if (!billing.companyName && !billing.contactName && !billing.email && !billing.address) {
      return undefined;
    }
    return billing;
  };

  const onSave = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (hourlyRate.trim() && (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)) {
      setError('Rate must be a positive number or blank'); return;
    }
    const rate = parseRate();
    const billing = buildBilling();
    if (isEdit && client) {
      updateClient(client.id, {
        name: name.trim(),
        color,
        hourlyRate: rate,
        notes: notes.trim() || undefined,
        billing,
      });
    } else {
      addClient({
        name: name.trim(),
        color,
        hourlyRate: rate,
        notes: notes.trim() || undefined,
        billing,
      });
    }
    onClose();
  };

  const onDelete = () => {
    if (!client) return;
    const projectCount = projects.filter((p) => p.clientId === client.id).length;
    const warn = projectCount > 0
      ? `Delete "${client.name}"? This will also delete ${projectCount} project${projectCount === 1 ? '' : 's'} and all related time entries.`
      : `Delete "${client.name}"?`;
    if (confirm(warn)) {
      deleteClient(client.id, 'cascade');
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

  return (
    <Modal title={isEdit ? 'Edit client' : 'New client'} onClose={onClose} footer={footer}>
      <div className="field">
        <label>Name</label>
        <input
          className="input"
          placeholder="e.g. Acme Co."
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
          <label>Default hourly rate (optional)</label>
          <input
            className="input mono"
            placeholder="e.g. 120"
            value={hourlyRate}
            onChange={(e) => { setHourlyRate(e.target.value); setError(null); }}
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="field">
        <button
          type="button"
          onClick={() => setBillingOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', textAlign: 'left',
            color: 'var(--text)', fontSize: 13, fontWeight: 500,
          }}
        >
          <span>Bill to (used on invoices)</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {billingOpen ? 'Hide' : 'Show'}
          </span>
        </button>
        {billingOpen && (
          <div className="stack" style={{ gap: 10 }}>
            <div className="modal-row">
              <div className="field">
                <label>Company</label>
                <input
                  className="input"
                  placeholder="e.g. Taboola.com Ltd."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Contact name</label>
                <input
                  className="input"
                  placeholder="e.g. Or Gotlib"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                placeholder="e.g. or@taboola.com"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Address</label>
              <textarea
                className="textarea"
                placeholder={'Atrium Tower\n2 Jabotinsky Street\nRamat Gan 5250501'}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="field">
        <label>Notes (optional)</label>
        <textarea
          className="textarea"
          placeholder="Contract details, anything you want to remember…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
    </Modal>
  );
}
