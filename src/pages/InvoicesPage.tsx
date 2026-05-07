import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../store';
import { CreateInvoiceModal } from '../components/CreateInvoiceModal';
import { formatLongDateKey, formatMoney, formatMonthLong, parseMonthKey } from '../utils';
import type { Invoice } from '../types';

interface Props {
  onOpenInvoice: (id: string) => void;
}

export function InvoicesPage({ onOpenInvoice }: Props) {
  const invoices = useStore((s) => s.invoices);
  const clients = useStore((s) => s.clients);
  const settings = useStore((s) => s.settings);

  const [creating, setCreating] = useState(false);

  const sorted = useMemo(
    () => [...invoices].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [invoices]
  );

  const totalOf = (inv: Invoice) => {
    const subtotal = inv.lineItems.reduce((acc, li) => acc + li.quantity * li.unitPrice, 0);
    const tax = subtotal * (inv.taxRate || 0) / 100;
    return subtotal + tax;
  };

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '(deleted)';
  const clientColor = (id: string) => clients.find((c) => c.id === id)?.color ?? '#bbb';

  return (
    <div className="page">
      <div className="topbar">
        <h1>Invoices</h1>
        <div className="topbar-right">
          <button className="btn btn-dark" onClick={() => setCreating(true)}>
            <Plus size={14} /> New invoice
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="table">
          <div className="empty">
            <strong>No invoices yet</strong>
            Create one from a monthly report, or click <em>New invoice</em> above.
          </div>
        </div>
      ) : (
        <div className="table">
          <div className="table-head cols-invoices">
            <div>Number</div>
            <div>Client</div>
            <div>Period</div>
            <div>Issued</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Amount</div>
            <div></div>
          </div>
          {sorted.map((inv) => (
            <button
              key={inv.id}
              className="table-row cols-invoices"
              onClick={() => onOpenInvoice(inv.id)}
              style={{ textAlign: 'left', width: '100%', background: 'transparent' }}
            >
              <div className="mono" style={{ fontWeight: 600 }}>{inv.number}</div>
              <div className="project-name">
                <span className="dot" style={{ background: clientColor(inv.clientId) }} />
                <div style={{ fontWeight: 500 }}>{clientName(inv.clientId)}</div>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                {inv.monthKey ? formatMonthLong(parseMonthKey(inv.monthKey)) : '—'}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>{formatLongDateKey(inv.issueDate)}</div>
              <div>
                <span className={`status-pill ${inv.status === 'final' ? 'status-active' : 'status-archived'}`}>
                  {inv.status === 'final' ? 'Final' : 'Draft'}
                </span>
              </div>
              <div className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                {formatMoney(totalOf(inv), inv.currencySymbol || settings.currencySymbol)}
              </div>
              <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>›</div>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <CreateInvoiceModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            onOpenInvoice(id);
          }}
        />
      )}
    </div>
  );
}
