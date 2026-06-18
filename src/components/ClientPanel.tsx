import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_PROJECT_COLORS, useStore } from '../store';
import type { Client, ClientBilling } from '../types';
import { IconTrash } from './icons';

interface Props {
  client: Client | null; // null = new
  open: boolean;
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

export function ClientPanel({ client, open, onClose }: Props) {
  const addClient = useStore((s) => s.addClient);
  const updateClient = useStore((s) => s.updateClient);
  const deleteClient = useStore((s) => s.deleteClient);
  const projects = useStore((s) => s.projects);

  const isEdit = !!client;
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_PROJECT_COLORS[0]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [billingOpen, setBillingOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const b = client?.billing;
    setName(client?.name || '');
    setColor(client?.color || DEFAULT_PROJECT_COLORS[0]);
    setHourlyRate(client?.hourlyRate != null ? String(client.hourlyRate) : '');
    setNotes(client?.notes || '');
    setCompanyName(b?.companyName || '');
    setContactName(b?.contactName || '');
    setBillingEmail(b?.email || '');
    setBillingAddress(b?.address || '');
    setBillingOpen(!!b && Object.values(b).some((v) => v && String(v).trim()));
    if (!client) setTimeout(() => nameRef.current?.focus(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    if (!billing.companyName && !billing.contactName && !billing.email && !billing.address) return undefined;
    return billing;
  };

  const onSave = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (hourlyRate.trim() && (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)) { setError('Rate must be a positive number or blank'); return; }
    const fields = { name: name.trim(), color, hourlyRate: parseRate(), notes: notes.trim() || undefined, billing: buildBilling() };
    if (isEdit && client) updateClient(client.id, fields);
    else addClient(fields);
    onClose();
  };

  const onDelete = () => {
    if (!client) return;
    const count = projects.filter((p) => p.clientId === client.id).length;
    const warn = count > 0
      ? `Delete "${client.name}"? This will also delete ${count} project${count === 1 ? '' : 's'} and all related time entries.`
      : `Delete "${client.name}"?`;
    if (confirm(warn)) { deleteClient(client.id, 'cascade'); onClose(); }
  };

  return (
    <>
      <div className={`wk-ov ${open ? 'on' : ''}`} onClick={onClose} />
      <aside className={`wk-panel ${open ? 'on' : ''}`} aria-hidden={!open}>
        <div className="wk-ptop">
          <button className="wk-px" onClick={onClose} aria-label="Close">×</button>
        </div>

        <AutoTextarea inputRef={nameRef} className="wk-ptitle" value={name} placeholder="Client name"
          singleLine onChange={(v) => { setName(v); setError(null); }} />

        <div className="wk-grid2">
          <label className="wk-fld"><span>Color</span>
            <div className="swatches" style={{ paddingTop: 4 }}>
              {DEFAULT_PROJECT_COLORS.map((c) => (
                <button key={c} type="button" className={`swatch ${color === c ? 'active' : ''}`}
                  style={{ background: c }} onClick={() => setColor(c)} aria-label={`Color ${c}`} />
              ))}
            </div>
          </label>
          <label className="wk-fld"><span>Default rate / hr</span>
            <input className="mono" value={hourlyRate} placeholder="e.g. 120" inputMode="decimal"
              onChange={(e) => { setHourlyRate(e.target.value); setError(null); }} />
          </label>
        </div>

        <div className="wk-fld full">
          <button type="button" className="wk-billtoggle" onClick={() => setBillingOpen((v) => !v)}>
            <span>Bill to (used on invoices)</span>
            <span className="muted">{billingOpen ? 'Hide' : 'Show'}</span>
          </button>
          {billingOpen && (
            <div className="stack" style={{ gap: 12, marginTop: 4 }}>
              <div className="wk-grid2">
                <label className="wk-fld"><span>Company</span>
                  <input value={companyName} placeholder="e.g. Taboola.com Ltd." onChange={(e) => setCompanyName(e.target.value)} /></label>
                <label className="wk-fld"><span>Contact name</span>
                  <input value={contactName} placeholder="e.g. Or Gotlib" onChange={(e) => setContactName(e.target.value)} /></label>
              </div>
              <label className="wk-fld full"><span>Email</span>
                <input value={billingEmail} placeholder="e.g. or@taboola.com" onChange={(e) => setBillingEmail(e.target.value)} /></label>
              <label className="wk-fld full"><span>Address</span>
                <textarea value={billingAddress} placeholder={'Atrium Tower\n2 Jabotinsky Street\nRamat Gan 5250501'} onChange={(e) => setBillingAddress(e.target.value)} /></label>
            </div>
          )}
        </div>

        <label className="wk-fld full"><span>Notes</span>
          <textarea value={notes} placeholder="Contract details, anything you want to remember…" onChange={(e) => setNotes(e.target.value)} />
        </label>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

        <div className="wk-pfoot">
          {isEdit && <button className="wk-del" title="Delete" onClick={onDelete}><IconTrash /></button>}
          <button className="wk-save" onClick={onSave}>{isEdit ? 'Save' : 'Create'}</button>
        </div>
      </aside>
    </>
  );
}
