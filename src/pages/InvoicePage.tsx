import { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Printer, Trash2, Lock, Unlock } from 'lucide-react';
import { useStore } from '../store';
import type { Invoice, InvoiceLineItem } from '../types';
import { formatLongDateKey, formatMoney, uid } from '../utils';

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

      {/* ---------- Invoice document ---------- */}
      <div className="invoice-doc">
        <header className="invoice-header">
          <div className="invoice-header-left">
            <EditableText
              className="invoice-from-name"
              value={invoice.billFrom.name || ''}
              placeholder="Your name"
              disabled={!isDraft}
              onChange={(v) => onPatch({ billFrom: { ...invoice.billFrom, name: v } })}
            />
          </div>
          <div className="invoice-header-right">
            <div className="invoice-title">INVOICE</div>
            <div className="invoice-meta">
              <div><span className="meta-label">Invoice Number:</span>
                <EditableText
                  className="meta-value"
                  value={invoice.number}
                  disabled={!isDraft}
                  onChange={(v) => onPatch({ number: v })}
                />
              </div>
              <div><span className="meta-label">Issue Date:</span>
                <EditableDate
                  value={invoice.issueDate}
                  disabled={!isDraft}
                  onChange={(v) => onPatch({ issueDate: v })}
                />
              </div>
              <div><span className="meta-label">Due Date:</span>
                <EditableDate
                  value={invoice.dueDate}
                  disabled={!isDraft}
                  onChange={(v) => onPatch({ dueDate: v })}
                />
              </div>
            </div>
          </div>
        </header>

        <section className="invoice-parties">
          <div>
            <div className="invoice-section-label">From</div>
            <EditableText
              className="party-name"
              value={invoice.billFrom.name || ''}
              placeholder="Your name"
              disabled={!isDraft}
              onChange={(v) => onPatch({ billFrom: { ...invoice.billFrom, name: v } })}
            />
            <EditableArea
              className="party-address"
              value={invoice.billFrom.address || ''}
              placeholder={'Street\nCity, Postcode\nCountry'}
              disabled={!isDraft}
              onChange={(v) => onPatch({ billFrom: { ...invoice.billFrom, address: v } })}
            />
            <EditableText
              className="party-email"
              value={invoice.billFrom.email ? `Email: ${invoice.billFrom.email}` : ''}
              placeholder="Email: you@example.com"
              disabled={!isDraft}
              onChange={(v) => onPatch({
                billFrom: { ...invoice.billFrom, email: v.replace(/^Email:\s*/i, '').trim() },
              })}
            />
          </div>
          <div>
            <div className="invoice-section-label">Bill To</div>
            <EditableText
              className="party-name"
              value={invoice.billTo.companyName || ''}
              placeholder={client?.name || 'Company name'}
              disabled={!isDraft}
              onChange={(v) => onPatch({ billTo: { ...invoice.billTo, companyName: v } })}
            />
            <EditableText
              className="party-address"
              value={invoice.billTo.contactName ? `Client Contact Name: ${invoice.billTo.contactName}` : ''}
              placeholder="Client Contact Name: …"
              disabled={!isDraft}
              onChange={(v) => onPatch({
                billTo: { ...invoice.billTo, contactName: v.replace(/^Client Contact Name:\s*/i, '').trim() },
              })}
            />
            <EditableArea
              className="party-address"
              value={invoice.billTo.address || ''}
              placeholder={'Address line 1\nAddress line 2'}
              disabled={!isDraft}
              onChange={(v) => onPatch({ billTo: { ...invoice.billTo, address: v } })}
            />
            {invoice.billTo.email && (
              <EditableText
                className="party-email"
                value={`Email: ${invoice.billTo.email}`}
                disabled={!isDraft}
                onChange={(v) => onPatch({
                  billTo: { ...invoice.billTo, email: v.replace(/^Email:\s*/i, '').trim() },
                })}
              />
            )}
          </div>
        </section>

        <section className="invoice-items">
          <div className="items-head">
            <div>Description</div>
            <div style={{ textAlign: 'right' }}>Quantity</div>
            <div style={{ textAlign: 'right' }}>Unit Price</div>
            <div style={{ textAlign: 'right' }}>Total</div>
            <div className="no-print" />
          </div>
          {invoice.lineItems.length === 0 && (
            <div className="empty" style={{ padding: '24px 0' }}>
              No line items yet. Add one below.
            </div>
          )}
          {invoice.lineItems.map((li, idx) => (
            <div key={li.id} className="items-row">
              <EditableText
                className="li-desc"
                value={li.description}
                placeholder="Description"
                disabled={!isDraft}
                onChange={(v) => onItemChange(idx, { description: v })}
              />
              <EditableNumber
                className="li-num"
                value={li.quantity}
                disabled={!isDraft}
                onChange={(v) => onItemChange(idx, { quantity: v })}
                placeholder="0"
              />
              <EditableMoney
                className="li-num"
                value={li.unitPrice}
                disabled={!isDraft}
                symbol={symbol}
                onChange={(v) => onItemChange(idx, { unitPrice: v })}
              />
              <div className="li-num mono" style={{ fontWeight: 500 }}>
                {formatMoney(li.quantity * li.unitPrice, symbol)}
              </div>
              <div className="no-print" style={{ textAlign: 'right' }}>
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

        <section className="invoice-totals">
          <div className="totals-row">
            <div>Subtotal:</div>
            <div className="mono">{formatMoney(subtotal, symbol)}</div>
          </div>
          <div className="totals-row">
            <div>
              Tax{isDraft ? (
                <>
                  {' '}(
                  <input
                    className="hrs-input"
                    style={{ width: 56, textAlign: 'right' }}
                    value={String(invoice.taxRate || 0)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!isNaN(n) && n >= 0) onPatch({ taxRate: n });
                    }}
                    inputMode="decimal"
                  />%):
                </>
              ) : (
                <> ({invoice.taxRate || 0}%):</>
              )}
            </div>
            <div className="mono">{formatMoney(tax, symbol)}</div>
          </div>
          <div className="totals-row total-final">
            <div>Total:</div>
            <div className="mono">{formatMoney(total, symbol)}</div>
          </div>
        </section>

        <section className="invoice-payment">
          <div className="invoice-section-label">Payment Details</div>
          <PaymentRow label="Bank Name" value={invoice.payment.bankName || ''} disabled={!isDraft}
            onChange={(v) => onPatch({ payment: { ...invoice.payment, bankName: v } })} />
          <PaymentRow label="Account Name" value={invoice.payment.accountName || ''} disabled={!isDraft}
            onChange={(v) => onPatch({ payment: { ...invoice.payment, accountName: v } })} />
          <PaymentRow label="Account Number" value={invoice.payment.accountNumber || ''} disabled={!isDraft} mono
            onChange={(v) => onPatch({ payment: { ...invoice.payment, accountNumber: v } })} />
          <PaymentRow label="BSB" value={invoice.payment.bsb || ''} disabled={!isDraft} mono
            onChange={(v) => onPatch({ payment: { ...invoice.payment, bsb: v } })} />
          <PaymentRow label="SWIFT" value={invoice.payment.swift || ''} disabled={!isDraft} mono
            onChange={(v) => onPatch({ payment: { ...invoice.payment, swift: v } })} />
          <PaymentRow label="Bank Address" value={invoice.payment.bankAddress || ''} disabled={!isDraft}
            onChange={(v) => onPatch({ payment: { ...invoice.payment, bankAddress: v } })} />
        </section>

        <section className="invoice-terms">
          <EditableText
            className="invoice-terms-line"
            value={invoice.terms ? `Payment Terms: ${invoice.terms}` : ''}
            placeholder="Payment Terms: Payment due within 7 days."
            disabled={!isDraft}
            onChange={(v) => onPatch({ terms: v.replace(/^Payment Terms:\s*/i, '').trim() })}
          />
          <div className="invoice-thanks">Thank you for your business.</div>
        </section>
      </div>

      {invoice.status === 'final' && (
        <div className="no-print" style={{
          marginTop: 16, padding: '10px 12px', borderRadius: 6,
          background: '#ecfdf5', color: '#065f46', fontSize: 13,
        }}>
          This invoice is finalized. Click <strong>Reopen</strong> if you need to make further edits.
        </div>
      )}

      {/* Date display string used by print, not editable */}
      <span className="print-only" aria-hidden style={{ display: 'none' }}>
        {formatLongDateKey(invoice.issueDate)} · {formatLongDateKey(invoice.dueDate)}
      </span>
    </div>
  );
}

/* ---------------- editable primitives ---------------- */

function EditableText({
  value, onChange, placeholder, disabled, className,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; className?: string;
}) {
  if (disabled) {
    return <div className={className}>{value || placeholder || ''}</div>;
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
    return <div className={className} style={{ whiteSpace: 'pre-line' }}>{value || ''}</div>;
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
  value, onChange, placeholder, disabled, className,
}: {
  value: number; onChange: (v: number) => void; placeholder?: string;
  disabled?: boolean; className?: string;
}) {
  const [text, setText] = useState<string>(String(value));
  if (disabled) {
    return <div className={`mono ${className || ''}`}>{value}</div>;
  }
  return (
    <input
      className={`inv-input mono ${className || ''}`}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (!isNaN(n) && n >= 0) onChange(n);
      }}
      onBlur={() => setText(String(value))}
      inputMode="decimal"
      style={{ textAlign: 'right' }}
    />
  );
}

function EditableMoney({
  value, onChange, disabled, symbol, className,
}: {
  value: number; onChange: (v: number) => void; disabled?: boolean;
  symbol: string; className?: string;
}) {
  const [text, setText] = useState<string>(String(value));
  if (disabled) {
    return <div className={`mono ${className || ''}`}>{formatMoney(value, symbol)}</div>;
  }
  return (
    <div className={className} style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
      <span style={{
        position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
        color: 'var(--text-muted)', fontSize: 13,
      }}>{symbol}</span>
      <input
        className="inv-input mono"
        style={{ paddingLeft: 22, textAlign: 'right' }}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (!isNaN(n) && n >= 0) onChange(n);
        }}
        onBlur={() => setText(String(value))}
        inputMode="decimal"
      />
    </div>
  );
}

function EditableDate({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  if (disabled) {
    return <span className="meta-value">{formatLongDateKey(value)}</span>;
  }
  return (
    <input
      type="date"
      className="inv-input mono"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: 150 }}
    />
  );
}

function PaymentRow({
  label, value, onChange, disabled, mono,
}: {
  label: string; value: string; onChange: (v: string) => void;
  disabled?: boolean; mono?: boolean;
}) {
  return (
    <div className="payment-row">
      <span className="payment-label">{label}:</span>
      <EditableText
        className={`payment-value ${mono ? 'mono' : ''}`}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
