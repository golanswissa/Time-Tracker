import { useRef, useState } from 'react';
import { useStore } from '../store';

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const updateInvoicingSettings = useStore((s) => s.updateInvoicingSettings);
  const exportAll = useStore((s) => s.exportAll);
  const importAll = useStore((s) => s.importAll);
  const clearAll = useStore((s) => s.clearAll);

  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

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
