import { useRef, useState } from 'react';
import { useStore } from '../store';

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
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
    // reset input so the same file can be re-chosen
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClear = () => {
    if (confirm('Delete all projects, tasks, entries, and settings? This cannot be undone.')) {
      clearAll();
      setMsg({ kind: 'ok', text: 'All data cleared.' });
    }
  };

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
        <h2>Data</h2>
        <p className="desc">Everything is stored locally in your browser. Back it up regularly.</p>
        <div className="settings-row">
          <div>
            <div className="label">Export all data</div>
            <div className="sub">Downloads a JSON backup of projects, tasks, entries, and settings.</div>
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
          <div>
            <div className="label">Go to Time</div>
          </div>
          <div><span className="kbd">G</span> then <span className="kbd">T</span></div>
        </div>
        <div className="settings-row">
          <div><div className="label">Go to Week</div></div>
          <div><span className="kbd">G</span> then <span className="kbd">W</span></div>
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
