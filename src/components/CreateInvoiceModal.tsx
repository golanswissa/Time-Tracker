import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useStore } from '../store';
import { entrySeconds, formatDuration, formatMonthLong, monthKeyFromDateKey, parseMonthKey } from '../utils';

interface Props {
  defaultClientId?: string | null;
  defaultMonthKey?: string | null;
  onClose: () => void;
  onCreated: (invoiceId: string) => void;
}

export function CreateInvoiceModal({ defaultClientId, defaultMonthKey, onClose, onCreated }: Props) {
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const entries = useStore((s) => s.entries);
  const invoices = useStore((s) => s.invoices);
  const settings = useStore((s) => s.settings);
  const generateInvoiceFromMonth = useStore((s) => s.generateInvoiceFromMonth);

  const [clientId, setClientId] = useState<string>(defaultClientId || clients[0]?.id || '');
  const [monthKey, setMonthKey] = useState<string>(defaultMonthKey || '');
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(() => {
    if (!clientId) return [] as { key: string; label: string; seconds: number }[];
    const projectIds = new Set(projects.filter((p) => p.clientId === clientId).map((p) => p.id));
    const map = new Map<string, { key: string; label: string; seconds: number }>();
    for (const e of entries) {
      if (!projectIds.has(e.projectId)) continue;
      const mk = monthKeyFromDateKey(e.date);
      if (!map.has(mk)) {
        map.set(mk, { key: mk, label: formatMonthLong(parseMonthKey(mk)), seconds: 0 });
      }
      map.get(mk)!.seconds += entrySeconds(e);
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [clientId, projects, entries]);

  const existingForCombo = useMemo(() => {
    if (!clientId || !monthKey) return null;
    return invoices.find((inv) => inv.clientId === clientId && inv.monthKey === monthKey) || null;
  }, [invoices, clientId, monthKey]);

  const onCreate = () => {
    if (!clientId) { setError('Pick a client'); return; }
    if (!monthKey) { setError('Pick a month'); return; }
    try {
      const inv = generateInvoiceFromMonth(clientId, monthKey);
      onCreated(inv.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const footer = (
    <>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-dark" onClick={onCreate}>Create draft</button>
    </>
  );

  return (
    <Modal
      title="New invoice"
      description="Generate a draft invoice from a client's monthly time entries. You can edit before finalizing."
      onClose={onClose}
      footer={footer}
    >
      <div className="field">
        <label>Client</label>
        <select
          className="select"
          value={clientId}
          onChange={(e) => { setClientId(e.target.value); setMonthKey(''); setError(null); }}
        >
          <option value="">— Select a client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Month</label>
        {clientId && months.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            No tracked time for this client yet.
          </div>
        ) : (
          <select
            className="select"
            value={monthKey}
            onChange={(e) => { setMonthKey(e.target.value); setError(null); }}
            disabled={!clientId}
          >
            <option value="">— Select a month —</option>
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} · {formatDuration(m.seconds, settings.timeFormat)}
              </option>
            ))}
          </select>
        )}
      </div>

      {existingForCombo && (
        <div style={{
          padding: '10px 12px', borderRadius: 6,
          background: '#fffbeb', color: '#92400e',
          fontSize: 13,
        }}>
          An invoice <strong>{existingForCombo.number}</strong> already exists for this month.
          Creating another will produce a duplicate.
        </div>
      )}

      {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
    </Modal>
  );
}
