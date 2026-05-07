import { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Printer, Trash2, Lock, Unlock } from 'lucide-react';
import { useStore } from '../store';
import type { Invoice, InvoiceLineItem } from '../types';
import { formatDDMMYYYY, formatMoney, uid } from '../utils';

interface Props {
  invoiceId: string;
  onBack: () => void;
}

export function InvoicePage({ invoiceId, onBack }: Props) {
  const invoice = useStore((s) => s.invoices.find((i) => i.id === invoiceId));
  const updateInvoice = useStore((s) => s.updateInvoice);
  const finalizeInvoice = useStore((s) => s.finalizeInvoice);
  const reopenInvoice = useStore((s) => s.reopenInvoice);
  const deleteInvoice = useStore((s) => s.deleteInvoice);
  const clients = useStore((s) => s.clients);

  if (!invoice) {
    return (
      <div className="page">
        <div className="topbar no-print">
          <div className="row" style={{ gap: 12 }}>
            <button className="iconbtn" onClick={onBack}><ChevronLeft size={14} /></button>
            <h1>Invoice not found</h1>
          </div>
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === invoice.clientId);
  const isDraft = invoice.status === 'draft';
  const symbol = invoice.currencySymbol || '$';

  const subtotal = useMemo(
    () => invoice.lineItems.reduce((acc, li) => acc + li.quantity * li.unitPrice, 0),
    [invoice.lineItems]
  );
  const tax = subtotal * (invoice.taxRate || 0) / 100;
  const total = subtotal + tax;

  const onPatch = (patch: Partial<Invoice>) => updateInvoice(invoice.id, patch);

  const onItemChange = (idx: number, patch: Partial<InvoiceLineItem>) => {
    const next = invoice.lineItems.map((li, i) => (i === idx ? { ...li, ...patch } : li));
    onPatch({ lineItems: next });
  };
  const onItemRemove = (idx: number) => {
    onPatch({ lineItems: invoice.lineItems.filter((_, i) => i !== idx) });
  };
  const onItemAdd = () => {
    onPatch({
      lineItems: [
        ...invoice.lineItems,
        { id: uid(), description: '', quantity: 1, unitPrice: 0 },
      ],
    });
  };

  const onFinalize = () => {
    if (invoice.lineItems.length === 0) {
      alert('Add at least one line item before finalizing.');
      return;
    }
    if (confirm(`Finalize invoice ${invoice.number}? You can reopen it for edits if needed.`)) {
      finalizeInvoice(invoice.id);
    }
  };
  const onReopen = () => reopenInvoice(invoice.id);
  const onDelete = () => {
    if (confirm(`Delete invoice ${invoice.number}? This cannot be undone.`)) {
      deleteInvoice(invoice.id);
      onBack();
    }
  };

  const totalDisplay = `${formatMoney(total, symbol)} USD`;

  return (
    <div className="page invoice-page">
      <div className="topbar no-print">
        <div className="row" style={{ gap: 12 }}>
          <button className="iconbtn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={14} />
          </button>
          <h1>
            Invoice {invoice.number}
            <span style={{ marginLeft: 12 }}>
              <span className={`status-pill ${invoice.status === 'final' ? 'status-active' : 'status-archived'}`}>
                {invoice.status === 'final' ? 'Final' : 'Draft'}
              </span>
            </span>
          </h1>
        </div>
        <div className="topbar-right">
          {isDraft ? (
            <>
              <button className="btn btn-danger-ghost" onClick={onDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn" onClick={onFinalize}>
                <Lock size={14} /> Finalize
              </button>
              <button className="btn btn-dark" onClick={() => window.print()}>
                <Printer size={14} /> Download PDF
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={onReopen}>
                <Unlock size={14} /> Reopen
              </button>
              <button className="btn btn-dark" onClick={() => window.print()}>
                <Printer size={14} /> Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---------- Invoice document (matches Figma 2:89) ---------- */}
      <div className="invoice-doc">
        <header className="inv-top">
          <EditableInline
            className="inv-from-name"
            value={invoice.billFrom.name || ''}
            placeholder="Your name"
            disabled={!isDraft}
            onChange={(v) => onPatch({ billFrom: { ...invoice.billFrom, name: v } })}
          />
          <div className="inv-meta-block">
            <div className="inv-title">INVOICE</div>
            <div className="inv-meta">
              <div className="inv-meta-row">
                <span>Invoice Number:&nbsp;</span>
                <EditableInline
                  value={invoice.number}
                  disabled={!isDraft}
                  onChange={(v) => onPatch({ number: v })}
                />
              </div>
              <div className="inv-meta-row">
                <span>Issue Date:&nbsp;</span>
                <EditableDate
                  value={invoice.issueDate}
                  disabled={!isDraft}
                  onChange={(v) => onPatch({ issueDate: v })}
                />
              </div>
              <div className="inv-meta-row">
                <span>Due Date:&nbsp;</span>
                <EditableDate
                  value={invoice.dueDate}
                  disabled={!isDraft}
                  onChange={(v) => onPatch({ dueDate: v })}
                />
              </div>
            </div>
          </div>
        </header>

        <section className="inv-parties">
          <div>
            <div className="inv-section-label">From</div>
            <EditableInline
              className="inv-party-line"
              value={invoice.billFrom.name || ''}
              placeholder="Your name"
              disabled={!isDraft}
              onChange={(v) => onPatch({ billFrom: { ...invoice.billFrom, name: v } })}
            />
            <EditableArea
              className="inv-party-block"
              value={invoice.billFrom.address || ''}
              placeholder={'Street\nCity, Postcode\nCountry'}
              disabled={!isDraft}
              onChange={(v) => onPatch({ billFrom: { ...invoice.billFrom, address: v } })}
            />
            {(isDraft || invoice.billFrom.email) && (
              <div className="inv-party-line inv-party-spacer">
                <span>Email:&nbsp;</span>
                <EditableInline
                  value={invoice.billFrom.email || ''}
                  placeholder="you@example.com"
                  disabled={!isDraft}
                  onChange={(v) => onPatch({ billFrom: { ...invoice.billFrom, email: v } })}
                />
              </div>
            )}
          </div>
          <div>
            <div className="inv-section-label">Bill To</div>
            <EditableInline
              className="inv-party-line"
              value={invoice.billTo.companyName || ''}
              placeholder={client?.name || 'Company name'}
              disabled={!isDraft}
              onChange={(v) => onPatch({ billTo: { ...invoice.billTo, companyName: v } })}
            />
            {(isDraft || invoice.billTo.contactName) && (
              <div className="inv-party-line">
                <span>Client Contact Name:&nbsp;</span>
                <EditableInline
                  value={invoice.billTo.contactName || ''}
                  placeholder="Contact name"
                  disabled={!isDraft}
                  onChange={(v) => onPatch({ billTo: { ...invoice.billTo, contactName: v } })}
                />
              </div>
            )}
            <EditableArea
              className="inv-party-block"
              value={invoice.billTo.address || ''}
              placeholder={'Address line 1\nAddress line 2'}
              disabled={!isDraft}
              onChange={(v) => onPatch({ billTo: { ...invoice.billTo, address: v } })}
            />
            {(isDraft || invoice.billTo.email) && (
              <div className="inv-party-line">
                <span>Email:&nbsp;</span>
                <EditableInline
                  value={invoice.billTo.email || ''}
                  placeholder=""
                  disabled={!isDraft}
                  onChange={(v) => onPatch({ billTo: { ...invoice.billTo, email: v } })}
                />
              </div>
            )}
          </div>
        </section>

        <section className="inv-items">
          <div className="inv-items-head">
            <div>Description</div>
            <div className="ralign">Quantity</div>
            <div className="ralign">Unit Price</div>
            <div className="ralign">Total</div>
            <div className="no-print" />
          </div>
          {invoice.lineItems.length === 0 && (
            <div className="empty" style={{ padding: '24px 0' }}>
              No line items yet. Add one below.
            </div>
          )}
          {invoice.lineItems.map((li, idx) => (
            <div key={li.id} className="inv-items-row">
              <EditableInline
                className="inv-li-desc"
                value={li.description}
                placeholder="Description"
                disabled={!isDraft}
                onChange={(v) => onItemChange(idx, { description: v })}
              />
              <EditableNumber
                className="ralign"
                value={li.quantity}
                disabled={!isDraft}
                onChange={(v) => onItemChange(idx, { quantity: v })}
              />
              <EditableMoney
                className="ralign"
                value={li.unitPrice}
                disabled={!isDraft}
                symbol={symbol}
                onChange={(v) => onItemChange(idx, { unitPrice: v })}
                short
              />
              <div className="ralign">
                {formatMoney(li.quantity * li.unitPrice, symbol)}
              </div>
              <div className="no-print inv-li-actions">
                {isDraft && (
                  <button
                    className="iconbtn-ghost"
                    onClick={() => onItemRemove(idx)}
                    aria-label="Remove line item"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {isDraft && (
            <button className="btn no-print" onClick={onItemAdd} style={{ marginTop: 12 }}>
              <Plus size={14} /> Add line item
            </button>
          )}
        </section>

        <section className="inv-totals">
          <div className="inv-totals-panel">
            <div className="inv-totals-row">
              <span>Subtotal:</span>
              <span>{formatMoney(subtotal, symbol)}</span>
            </div>
            <div className="inv-totals-row">
              <span>
                Tax{isDraft ? (
                  <>
                    {' '}(
                    <input
                      className="hrs-input inv-tax-input"
                      value={String(invoice.taxRate || 0)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!isNaN(n) && n >= 0) onPatch({ taxRate: n });
                      }}
                      inputMode="decimal"
                    />%):
                  </>
                ) : (
                  invoice.taxRate ? <> ({invoice.taxRate}%):</> : ':'
                )}
              </span>
              <span>{tax > 0 ? formatMoney(tax, symbol) : `${symbol}0`}</span>
            </div>
            <div className="inv-totals-row inv-totals-final">
              <span>Total:</span>
              <span>{totalDisplay}</span>
            </div>
          </div>
        </section>

        <section className="inv-payment">
          <div className="inv-section-label">Payment Details</div>
          <div className="inv-payment-list">
            <PaymentLine label="Bank Name" value={invoice.payment.bankName || ''} disabled={!isDraft}
              onChange={(v) => onPatch({ payment: { ...invoice.payment, bankName: v } })} />
            <PaymentLine label="Account Name" value={invoice.payment.accountName || ''} disabled={!isDraft}
              onChange={(v) => onPatch({ payment: { ...invoice.payment, accountName: v } })} />
            <PaymentLine label="Account Number" value={invoice.payment.accountNumber || ''} disabled={!isDraft}
              onChange={(v) => onPatch({ payment: { ...invoice.payment, accountNumber: v } })} />
            <PaymentLine label="BSB" value={invoice.payment.bsb || ''} disabled={!isDraft}
              onChange={(v) => onPatch({ payment: { ...invoice.payment, bsb: v } })} />
            {(isDraft || invoice.payment.bankAddress) && (
              <PaymentLine label="Bank Address" value={invoice.payment.bankAddress || ''} disabled={!isDraft}
                onChange={(v) => onPatch({ payment: { ...invoice.payment, bankAddress: v } })} />
            )}
            {(isDraft || invoice.payment.swift) && (
              <PaymentLine label="SWIFT" value={invoice.payment.swift || ''} disabled={!isDraft}
                onChange={(v) => onPatch({ payment: { ...invoice.payment, swift: v } })} />
            )}
          </div>
        </section>

        <section className="inv-terms">
          <div className="inv-terms-line">
            <span>Payment Terms:&nbsp;</span>
            <EditableInline
              value={invoice.terms || ''}
              placeholder="Payment due within 7 days."
              disabled={!isDraft}
              onChange={(v) => onPatch({ terms: v })}
            />
          </div>
        </section>

        <footer className="inv-thanks">
          <p>Thank you for your business.</p>
        </footer>
      </div>

      {invoice.status === 'final' && (
        <div className="no-print" style={{
          marginTop: 16, padding: '10px 12px', borderRadius: 6,
          background: '#ecfdf5', color: '#065f46', fontSize: 13,
        }}>
          This invoice is finalized. Click <strong>Reopen</strong> if you need to make further edits.
        </div>
      )}
    </div>
  );
}

/* ---------------- editable primitives ---------------- */

/** Inline input that hides its chrome until hover/focus, so the doc reads as plain text. */
function EditableInline({
  value, onChange, placeholder, disabled, className,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; className?: string;
}) {
  if (disabled) {
    return <span className={className}>{value || placeholder || ''}</span>;
  }
  return (
    <input
      className={`inv-input ${className || ''}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function EditableArea({
  value, onChange, placeholder, disabled, className,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; className?: string;
}) {
  if (disabled) {
    return value
      ? <div className={className} style={{ whiteSpace: 'pre-line' }}>{value}</div>
      : null;
  }
  return (
    <textarea
      className={`inv-input inv-textarea ${className || ''}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
    />
  );
}

function EditableNumber({
  value, onChange, disabled, className,
}: {
  value: number; onChange: (v: number) => void; disabled?: boolean; className?: string;
}) {
  const [text, setText] = useState<string>(String(value));
  if (disabled) {
    return <span className={className}>{value}</span>;
  }
  return (
    <input
      className={`inv-input ${className || ''}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (!isNaN(n) && n >= 0) onChange(n);
      }}
      onBlur={() => setText(String(value))}
      inputMode="decimal"
    />
  );
}

function EditableMoney({
  value, onChange, disabled, symbol, className, short,
}: {
  value: number; onChange: (v: number) => void; disabled?: boolean;
  symbol: string; className?: string; short?: boolean;
}) {
  const [text, setText] = useState<string>(String(value));
  if (disabled) {
    return (
      <span className={className}>
        {short ? `${symbol}${value}` : formatMoney(value, symbol)}
      </span>
    );
  }
  return (
    <input
      className={`inv-input ${className || ''}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (!isNaN(n) && n >= 0) onChange(n);
      }}
      onBlur={() => setText(String(value))}
      inputMode="decimal"
    />
  );
}

function EditableDate({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  if (disabled) {
    return <span>{formatDDMMYYYY(value)}</span>;
  }
  return (
    <input
      type="date"
      className="inv-input inv-date-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function PaymentLine({
  label, value, onChange, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="inv-payment-line">
      <span>{label}:&nbsp;</span>
      <EditableInline value={value} disabled={disabled} onChange={onChange} />
    </div>
  );
}
