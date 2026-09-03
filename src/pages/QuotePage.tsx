import { useMemo } from 'react';
import { ChevronLeft, Plus, Printer, Trash2, ClipboardCopy } from 'lucide-react';
import { useStore } from '../store';
import type { Quote, InvoiceLineItem, QuoteScopeItem } from '../types';
import { formatMoney, uid } from '../utils';
import { EditableInline, EditableArea, EditableNumber, EditableMoney, EditableDate, PaymentLine } from '../components/docFields';

interface Props {
  quoteId: string;
  onBack: () => void;
}

export function QuotePage({ quoteId, onBack }: Props) {
  const quote = useStore((s) => s.quotes.find((q) => q.id === quoteId));
  const updateQuote = useStore((s) => s.updateQuote);
  const deleteQuote = useStore((s) => s.deleteQuote);
  const clients = useStore((s) => s.clients);
  const invoices = useStore((s) => s.invoices);

  const subtotal = useMemo(
    () => (quote?.lineItems ?? []).reduce((acc, li) => acc + li.quantity * li.unitPrice, 0),
    [quote]
  );

  if (!quote) {
    return (
      <div className="page">
        <div className="topbar no-print">
          <div className="row" style={{ gap: 12 }}>
            <button className="iconbtn" onClick={onBack}><ChevronLeft size={14} /></button>
            <h1>Quote not found</h1>
          </div>
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === quote.clientId);
  const symbol = quote.currencySymbol || '$';
  const tax = subtotal * (quote.taxRate || 0) / 100;
  const total = subtotal + tax;
  const totalHours = quote.lineItems.reduce((a, li) => a + li.quantity, 0);

  const onPatch = (patch: Partial<Quote>) => updateQuote(quote.id, patch);

  // --- pricing lines ---
  const onItemChange = (idx: number, patch: Partial<InvoiceLineItem>) =>
    onPatch({ lineItems: quote.lineItems.map((li, i) => (i === idx ? { ...li, ...patch } : li)) });
  const onItemRemove = (idx: number) =>
    onPatch({ lineItems: quote.lineItems.filter((_, i) => i !== idx) });
  const onItemAdd = () =>
    onPatch({ lineItems: [...quote.lineItems, { id: uid(), description: '', quantity: 0, unitPrice: 0 }] });

  // --- scope items ---
  const onScopeChange = (idx: number, patch: Partial<QuoteScopeItem>) =>
    onPatch({ scope: quote.scope.map((sc, i) => (i === idx ? { ...sc, ...patch } : sc)) });
  const onScopeRemove = (idx: number) =>
    onPatch({ scope: quote.scope.filter((_, i) => i !== idx) });
  const onScopeAdd = () =>
    onPatch({ scope: [...quote.scope, { id: uid(), title: '' }] });

  const onDelete = () => {
    if (confirm(`Delete quote ${quote.number}? This cannot be undone.`)) {
      deleteQuote(quote.id);
      onBack();
    }
  };

  // Copy From / Bill-To / Payment from the latest invoice (this client's if any,
  // otherwise the most recent invoice — your From/Payment are the same on all of
  // them). Reads your own stored data; nothing is hardcoded.
  const onFillFromInvoice = () => {
    const byNewest = (a: { createdAt: string }, b: { createdAt: string }) => (a.createdAt < b.createdAt ? 1 : -1);
    const forClient = invoices.filter((i) => i.clientId === quote.clientId).slice().sort(byNewest);
    const src = forClient[0] || invoices.slice().sort(byNewest)[0];
    if (!src) {
      alert('No invoice to copy from yet. Create an invoice first, or fill Settings → Invoicing.');
      return;
    }
    onPatch({
      billFrom: { ...src.billFrom },
      payment: { ...src.payment },
      // Bill-To is client-specific: prefer this client's invoice, else the client's saved billing.
      billTo: forClient[0] ? { ...forClient[0].billTo } : { ...(client?.billing ?? quote.billTo) },
    });
  };

  return (
    <div className="page invoice-page">
      <div className="topbar no-print">
        <div className="row" style={{ gap: 12 }}>
          <button className="iconbtn" onClick={onBack} aria-label="Back"><ChevronLeft size={14} /></button>
          <h1>Quote {quote.number}</h1>
        </div>
        <div className="topbar-right">
          <button className="btn btn-danger-ghost" onClick={onDelete}><Trash2 size={14} /> Delete</button>
          <button className="btn" onClick={onFillFromInvoice} title="Copy your From, Bill-To and Payment details from the latest invoice">
            <ClipboardCopy size={14} /> Fill from last invoice
          </button>
          <button className="btn btn-dark" onClick={() => window.print()}><Printer size={14} /> Download PDF</button>
        </div>
      </div>

      {/* ---------- Quote document (same chrome as the invoice) ---------- */}
      <div className="invoice-doc">
        <header className="inv-top">
          <EditableInline
            className="inv-from-name"
            value={quote.billFrom.name || ''}
            placeholder="Your name"
            onChange={(v) => onPatch({ billFrom: { ...quote.billFrom, name: v } })}
          />
          <div className="inv-meta-block">
            <div className="inv-title">QUOTE</div>
            <div className="inv-meta">
              <div className="inv-meta-row">
                <span>Quote Number:&nbsp;</span>
                <EditableInline value={quote.number} onChange={(v) => onPatch({ number: v })} />
              </div>
              <div className="inv-meta-row">
                <span>Issue Date:&nbsp;</span>
                <EditableDate value={quote.issueDate} onChange={(v) => onPatch({ issueDate: v })} />
              </div>
              <div className="inv-meta-row">
                <span>Valid Until:&nbsp;</span>
                <EditableDate value={quote.validUntil} onChange={(v) => onPatch({ validUntil: v })} />
              </div>
            </div>
          </div>
        </header>

        <section className="inv-parties">
          <div>
            <div className="inv-section-label">From</div>
            <EditableInline
              className="inv-party-line"
              value={quote.billFrom.name || ''}
              placeholder="Your name"
              onChange={(v) => onPatch({ billFrom: { ...quote.billFrom, name: v } })}
            />
            <EditableArea
              className="inv-party-block"
              value={quote.billFrom.address || ''}
              placeholder={'Street\nCity, Postcode\nCountry'}
              onChange={(v) => onPatch({ billFrom: { ...quote.billFrom, address: v } })}
            />
            <div className="inv-party-line inv-party-spacer">
              <span>Email:&nbsp;</span>
              <EditableInline
                value={quote.billFrom.email || ''}
                placeholder="you@example.com"
                onChange={(v) => onPatch({ billFrom: { ...quote.billFrom, email: v } })}
              />
            </div>
          </div>
          <div>
            <div className="inv-section-label">Prepared For</div>
            <EditableInline
              className="inv-party-line"
              value={quote.billTo.companyName || ''}
              placeholder={client?.name || 'Company name'}
              onChange={(v) => onPatch({ billTo: { ...quote.billTo, companyName: v } })}
            />
            <div className="inv-party-line">
              <span>Client Contact Name:&nbsp;</span>
              <EditableInline
                value={quote.billTo.contactName || ''}
                placeholder="Contact name"
                onChange={(v) => onPatch({ billTo: { ...quote.billTo, contactName: v } })}
              />
            </div>
            <EditableArea
              className="inv-party-block"
              value={quote.billTo.address || ''}
              placeholder={'Address line 1\nAddress line 2'}
              onChange={(v) => onPatch({ billTo: { ...quote.billTo, address: v } })}
            />
            <div className="inv-party-line">
              <span>Email:&nbsp;</span>
              <EditableInline
                value={quote.billTo.email || ''}
                onChange={(v) => onPatch({ billTo: { ...quote.billTo, email: v } })}
              />
            </div>
          </div>
        </section>

        {/* intro line */}
        <section className="quo-intro">
          <EditableArea
            value={quote.intro || ''}
            placeholder="One-line summary of what this quote covers…"
            rows={2}
            onChange={(v) => onPatch({ intro: v })}
          />
        </section>

        {/* scope of work */}
        <section className="quo-scope">
          <div className="inv-section-label">Scope of Work</div>
          <ol className="quo-scope-list">
            {quote.scope.map((sc, idx) => (
              <li key={sc.id} className="quo-scope-item">
                <span className="quo-scope-num">{idx + 1}.</span>
                <div className="quo-scope-body">
                  <EditableInline
                    className="quo-scope-title"
                    value={sc.title}
                    placeholder="Scope item"
                    onChange={(v) => onScopeChange(idx, { title: v })}
                  />
                  <EditableArea
                    className="quo-scope-detail"
                    value={sc.detail || ''}
                    placeholder="Optional detail…"
                    rows={1}
                    onChange={(v) => onScopeChange(idx, { detail: v })}
                  />
                </div>
                <button className="iconbtn-ghost no-print quo-scope-x" onClick={() => onScopeRemove(idx)} aria-label="Remove scope item">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ol>
          <button className="btn no-print" onClick={onScopeAdd} style={{ marginTop: 10 }}>
            <Plus size={14} /> Add scope item
          </button>
        </section>

        {/* estimate table (hours × rate) */}
        <section className="inv-items">
          <div className="inv-items-head">
            <div>Description</div>
            <div className="ralign">Hours</div>
            <div className="ralign">Rate / hr</div>
            <div className="ralign">Total</div>
            <div className="no-print" />
          </div>
          {quote.lineItems.map((li, idx) => (
            <div key={li.id} className="inv-items-row">
              <EditableInline
                className="inv-li-desc"
                value={li.description}
                placeholder="Description"
                onChange={(v) => onItemChange(idx, { description: v })}
              />
              <EditableNumber className="ralign" value={li.quantity} onChange={(v) => onItemChange(idx, { quantity: v })} />
              <EditableMoney className="ralign" value={li.unitPrice} symbol={symbol} short onChange={(v) => onItemChange(idx, { unitPrice: v })} />
              <div className="ralign">{formatMoney(li.quantity * li.unitPrice, symbol)}</div>
              <div className="no-print inv-li-actions">
                <button className="iconbtn-ghost" onClick={() => onItemRemove(idx)} aria-label="Remove line"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <button className="btn no-print" onClick={onItemAdd} style={{ marginTop: 12 }}>
            <Plus size={14} /> Add line
          </button>
        </section>

        <section className="inv-totals">
          <div className="inv-totals-panel">
            <div className="inv-totals-row">
              <span>Estimated hours:</span>
              <span>{totalHours}</span>
            </div>
            <div className="inv-totals-row">
              <span>Subtotal:</span>
              <span>{formatMoney(subtotal, symbol)}</span>
            </div>
            {quote.taxRate ? (
              <div className="inv-totals-row">
                <span>Tax ({quote.taxRate}%):</span>
                <span>{formatMoney(tax, symbol)}</span>
              </div>
            ) : null}
            <div className="inv-totals-row inv-totals-final">
              <span>Estimated Total:</span>
              <span>{`${formatMoney(total, symbol)} USD`}</span>
            </div>
          </div>
        </section>

        <section className="inv-payment">
          <div className="inv-section-label">Payment Details</div>
          <div className="inv-payment-list">
            <PaymentLine label="Bank Name" value={quote.payment.bankName || ''} onChange={(v) => onPatch({ payment: { ...quote.payment, bankName: v } })} />
            <PaymentLine label="Account Name" value={quote.payment.accountName || ''} onChange={(v) => onPatch({ payment: { ...quote.payment, accountName: v } })} />
            <PaymentLine label="Account Number" value={quote.payment.accountNumber || ''} onChange={(v) => onPatch({ payment: { ...quote.payment, accountNumber: v } })} />
            <PaymentLine label="BSB" value={quote.payment.bsb || ''} onChange={(v) => onPatch({ payment: { ...quote.payment, bsb: v } })} />
            <PaymentLine label="Bank Address" value={quote.payment.bankAddress || ''} onChange={(v) => onPatch({ payment: { ...quote.payment, bankAddress: v } })} />
            <PaymentLine label="SWIFT" value={quote.payment.swift || ''} onChange={(v) => onPatch({ payment: { ...quote.payment, swift: v } })} />
          </div>
        </section>

        <section className="inv-terms">
          <div className="inv-terms-line">
            <span>Terms:&nbsp;</span>
            <EditableInline
              value={quote.terms || ''}
              placeholder="This is an estimate; final billing is based on hours tracked."
              onChange={(v) => onPatch({ terms: v })}
            />
          </div>
        </section>

        <footer className="inv-thanks">
          <p>Thank you — looking forward to the month ahead.</p>
        </footer>
      </div>
    </div>
  );
}
