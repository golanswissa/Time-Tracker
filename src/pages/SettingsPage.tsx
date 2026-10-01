import { useRef, useState } from 'react';
import { useStore } from '../store';
import type { RetainerSettings } from '../types';

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const updateInvoicingSettings = useStore((s) => s.updateInvoicingSettings);
  const exportAll = useStore((s) => s.exportAll);
  const importAll = useStore((s) => s.importAll);
  const clearAll = useStore((s) => s.clearAll);
  const clients = useStore((s) => s.clients);
  const runMonthlyBillingIfDue = useStore((s) => s.runMonthlyBillingIfDue);

  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const ret: RetainerSettings = settings.retainer ?? {
    enabled: false, dayOfMonth: 29, monthlyCap: 18000, monthlyTarget: 18350,
    tier1Hours: 100, tier1Rate: 100, tier2Rate: 80,
  };
  const setRet = (patch: Partial<RetainerSettings>) =>
    updateSettings({ retainer: { ...ret, ...patch } });

  const handleRunNow = () => {
    const r = runMonthlyBillingIfDue(true);
    if (!r) {
      setMsg({ kind: 'err', text: 'Nothing to run — check the retainer client is set.' });
      return;
    }
    const made = [
      r.createdInvoice ? `invoice for ${r.invoiceMonth}` : null,
      r.createdQuote ? `quote for ${r.quoteMonth}` : null,
    ].filter(Boolean).join(' and ');
    setMsg({
      kind: 'ok',
      text: made
        ? `Drafted the ${made}. Find them under Invoices and Reports → client → Quotes.`
        : `Already done — the ${r.invoiceMonth} invoice and ${r.quoteMonth} quote both exist.`,
    });
  };

  const handleExport = () => {
    const data = exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const result = importAll(text);
    if (result.ok) {
      setMsg({ kind: 'ok', text: 'Imported successfully.' });
    } else {
      setMsg({ kind: 'err', text: `Import failed: ${result.error}` });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClear = () => {
    if (confirm('Delete all projects, tasks, entries, and settings? This cannot be undone.')) {
      clearAll();
      setMsg({ kind: 'ok', text: 'All data cleared.' });
    }
  };

  const inv = settings.invoicing;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Settings</h1>
      </div>

      <div className="settings-section">
        <h2>Preferences</h2>
        <p className="desc">Control how dates and durations are displayed.</p>
        <div className="settings-row">
          <div>
            <div className="label">Week starts on</div>
            <div className="sub">First day of the week in grids and date strips.</div>
          </div>
          <div className="seg">
            <button className={settings.weekStart === 'mon' ? 'active' : ''} onClick={() => updateSettings({ weekStart: 'mon' })}>Monday</button>
            <button className={settings.weekStart === 'sun' ? 'active' : ''} onClick={() => updateSettings({ weekStart: 'sun' })}>Sunday</button>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Time format</div>
            <div className="sub">H:MM (1:30) or decimal (1.5)</div>
          </div>
          <div className="seg">
            <button className={settings.timeFormat === 'hhmm' ? 'active' : ''} onClick={() => updateSettings({ timeFormat: 'hhmm' })}>H:MM</button>
            <button className={settings.timeFormat === 'decimal' ? 'active' : ''} onClick={() => updateSettings({ timeFormat: 'decimal' })}>Decimal</button>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Appearance</div>
            <div className="sub">Auto follows the clock (night 5pm–6am). Day / Night force it on.</div>
          </div>
          <div className="seg">
            <button className={(settings.themeMode ?? 'auto') === 'auto' ? 'active' : ''} onClick={() => updateSettings({ themeMode: 'auto' })}>Auto</button>
            <button className={settings.themeMode === 'day' ? 'active' : ''} onClick={() => updateSettings({ themeMode: 'day' })}>Day</button>
            <button className={settings.themeMode === 'night' ? 'active' : ''} onClick={() => updateSettings({ themeMode: 'night' })}>Night</button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Invoicing</h2>
        <p className="desc">Used as defaults whenever you generate an invoice. Each invoice snapshots these at creation.</p>

        <div className="stack" style={{ gap: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: 8 }}>
            From (your details)
          </div>
          <div className="modal-row">
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                placeholder="e.g. Maya Solomon Swissa"
                value={inv.from.name || ''}
                onChange={(e) => updateInvoicingSettings({ from: { name: e.target.value } })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                placeholder="you@example.com"
                value={inv.from.email || ''}
                onChange={(e) => updateInvoicingSettings({ from: { email: e.target.value } })}
              />
            </div>
          </div>
          <div className="field">
            <label>Address</label>
            <textarea
              className="textarea"
              placeholder={'Street\nCity, Postcode\nCountry'}
              value={inv.from.address || ''}
              onChange={(e) => updateInvoicingSettings({ from: { address: e.target.value } })}
            />
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: 8 }}>
            Payment details
          </div>
          <div className="modal-row">
            <div className="field">
              <label>Bank name</label>
              <input
                className="input"
                value={inv.payment.bankName || ''}
                onChange={(e) => updateInvoicingSettings({ payment: { bankName: e.target.value } })}
              />
            </div>
            <div className="field">
              <label>Account name</label>
              <input
                className="input"
                value={inv.payment.accountName || ''}
                onChange={(e) => updateInvoicingSettings({ payment: { accountName: e.target.value } })}
              />
            </div>
          </div>
          <div className="modal-row">
            <div className="field">
              <label>Account number</label>
              <input
                className="input mono"
                value={inv.payment.accountNumber || ''}
                onChange={(e) => updateInvoicingSettings({ payment: { accountNumber: e.target.value } })}
              />
            </div>
            <div className="field">
              <label>BSB / Routing</label>
              <input
                className="input mono"
                value={inv.payment.bsb || ''}
                onChange={(e) => updateInvoicingSettings({ payment: { bsb: e.target.value } })}
              />
            </div>
          </div>
          <div className="modal-row">
            <div className="field">
              <label>SWIFT</label>
              <input
                className="input mono"
                value={inv.payment.swift || ''}
                onChange={(e) => updateInvoicingSettings({ payment: { swift: e.target.value } })}
              />
            </div>
            <div className="field">
              <label>Bank address</label>
              <input
                className="input"
                value={inv.payment.bankAddress || ''}
                onChange={(e) => updateInvoicingSettings({ payment: { bankAddress: e.target.value } })}
              />
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: 8 }}>
            Defaults
          </div>
          <div className="modal-row">
            <div className="field">
              <label>Number prefix</label>
              <input
                className="input"
                placeholder="INV-"
                value={inv.numberPrefix}
                onChange={(e) => updateInvoicingSettings({ numberPrefix: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Next number</label>
              <input
                className="input mono"
                value={String(inv.nextNumber)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!isNaN(n) && n >= 1) updateInvoicingSettings({ nextNumber: Math.floor(n) });
                }}
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="modal-row">
            <div className="field">
              <label>Default due (days)</label>
              <input
                className="input mono"
                value={String(inv.defaultDueDays)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!isNaN(n) && n >= 0) updateInvoicingSettings({ defaultDueDays: Math.floor(n) });
                }}
                inputMode="numeric"
              />
            </div>
            <div className="field">
              <label>Default tax rate (%)</label>
              <input
                className="input mono"
                value={String(inv.defaultTaxRate)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!isNaN(n) && n >= 0) updateInvoicingSettings({ defaultTaxRate: n });
                }}
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="field">
            <label>Payment terms</label>
            <input
              className="input"
              placeholder="Payment due within 7 days."
              value={inv.terms || ''}
              onChange={(e) => updateInvoicingSettings({ terms: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Recurring billing</h2>
        <p className="desc">
          On the chosen day each month the app drafts the invoice for the month that&apos;s ending and the
          quote securing the next one. Both arrive as drafts — nothing is ever sent automatically.
        </p>
        <div className="settings-row">
          <div>
            <div className="label">Automatic monthly run</div>
            <div className="sub">
              {ret.enabled
                ? ret.lastRunMonth
                  ? `On — last run covered ${ret.lastRunMonth}.`
                  : 'On — will run on the next due day.'
                : 'Off — switch on and pick the retainer client.'}
            </div>
          </div>
          <div className="seg">
            <button className={ret.enabled ? 'active' : ''} onClick={() => setRet({ enabled: true })}>On</button>
            <button className={!ret.enabled ? 'active' : ''} onClick={() => setRet({ enabled: false })}>Off</button>
          </div>
        </div>

        <div className="modal-row">
          <div className="field">
            <label>Retainer client</label>
            <select
              className="select"
              value={ret.clientId || ''}
              onChange={(e) => setRet({ clientId: e.target.value || undefined })}
            >
              <option value="">Choose a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Run on day of month</label>
            <input
              className="input mono"
              value={String(ret.dayOfMonth)}
              inputMode="numeric"
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!isNaN(n) && n >= 1 && n <= 31) setRet({ dayOfMonth: Math.floor(n) });
              }}
            />
          </div>
        </div>

        <div className="modal-row">
          <div className="field">
            <label>Agreed monthly cap</label>
            <input
              className="input mono"
              value={String(ret.monthlyCap)}
              inputMode="decimal"
              onChange={(e) => { const n = Number(e.target.value); if (!isNaN(n) && n >= 0) setRet({ monthlyCap: n }); }}
            />
            <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
              The ceiling agreed with the client.
            </span>
          </div>
          <div className="field">
            <label>Invoice target</label>
            <input
              className="input mono"
              value={String(ret.monthlyTarget ?? ret.monthlyCap)}
              inputMode="decimal"
              onChange={(e) => { const n = Number(e.target.value); if (!isNaN(n) && n >= 0) setRet({ monthlyTarget: n }); }}
            />
            <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
              What invoices aim for — a little above the cap so totals don&apos;t read as artificially round.
            </span>
          </div>
        </div>

        <div className="modal-row">
          <div className="field">
            <label>First-tier hours</label>
            <input
              className="input mono"
              value={String(ret.tier1Hours)}
              inputMode="decimal"
              onChange={(e) => { const n = Number(e.target.value); if (!isNaN(n) && n >= 0) setRet({ tier1Hours: n }); }}
            />
          </div>
          <div className="field">
            <label>First-tier rate / hr</label>
            <input
              className="input mono"
              value={String(ret.tier1Rate)}
              inputMode="decimal"
              onChange={(e) => { const n = Number(e.target.value); if (!isNaN(n) && n >= 0) setRet({ tier1Rate: n }); }}
            />
          </div>
        </div>

        <div className="modal-row">
          <div className="field">
            <label>Rate after that / hr</label>
            <input
              className="input mono"
              value={String(ret.tier2Rate)}
              inputMode="decimal"
              onChange={(e) => { const n = Number(e.target.value); if (!isNaN(n) && n >= 0) setRet({ tier2Rate: n }); }}
            />
          </div>
          <div className="field" />
        </div>

        <div className="settings-row">
          <div>
            <div className="label">Run now</div>
            <div className="sub">Draft this cycle&apos;s invoice and quote immediately, without waiting for the day.</div>
          </div>
          <button className="btn" onClick={handleRunNow} disabled={!ret.enabled || !ret.clientId}>
            Run now
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2>Data</h2>
        <p className="desc">Everything is stored locally in your browser. Back it up regularly.</p>
        <div className="settings-row">
          <div>
            <div className="label">Export all data</div>
            <div className="sub">Downloads a JSON backup of clients, projects, entries, invoices, and settings.</div>
          </div>
          <button className="btn" onClick={handleExport}>Export JSON</button>
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Import data</div>
            <div className="sub">Replaces all current data with the contents of the JSON file.</div>
          </div>
          <>
            <button className="btn" onClick={handleImport}>Import JSON</button>
            <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFile} />
          </>
        </div>
        <div className="settings-row">
          <div>
            <div className="label" style={{ color: 'var(--danger)' }}>Clear all data</div>
            <div className="sub">Deletes everything and resets to a clean slate.</div>
          </div>
          <button className="btn btn-danger-ghost" onClick={handleClear}>Clear all</button>
        </div>
        {msg && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 6,
              fontSize: 13,
              background: msg.kind === 'ok' ? '#ecfdf5' : '#fef2f2',
              color: msg.kind === 'ok' ? '#065f46' : '#991b1b',
            }}
          >
            {msg.text}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>Keyboard</h2>
        <p className="desc">Available shortcuts.</p>
        <div className="settings-row">
          <div><div className="label">Go to Time</div></div>
          <div><span className="kbd">G</span> then <span className="kbd">T</span></div>
        </div>
        <div className="settings-row">
          <div><div className="label">Go to Reports</div></div>
          <div><span className="kbd">G</span> then <span className="kbd">R</span></div>
        </div>
        <div className="settings-row">
          <div><div className="label">Go to Invoices</div></div>
          <div><span className="kbd">G</span> then <span className="kbd">I</span></div>
        </div>
        <div className="settings-row">
          <div><div className="label">Go to Projects</div></div>
          <div><span className="kbd">G</span> then <span className="kbd">P</span></div>
        </div>
        <div className="settings-row">
          <div><div className="label">New entry</div></div>
          <div><span className="kbd">N</span></div>
        </div>
      </div>
    </div>
  );
}
