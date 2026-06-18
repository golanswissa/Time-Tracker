import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { TaskStatus } from '../types';
import { STATUS_META, STATUS_ORDER } from '../planner';
import { IconStatus } from './icons';

// Status glyph that opens a flyout to change the status. Shared by the day-view
// cards and the project detail task list so the status UI is identical.
export function StatusPicker({ value, onPick, children }: {
  value: TaskStatus; onPick: (s: TaskStatus) => void; children: (open: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="wk-stp" ref={ref}>
      <button className="wk-stp-trig" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>{children(open)}</button>
      {open && (
        <div className="wk-stp-menu" onClick={(e) => e.stopPropagation()}>
          {STATUS_ORDER.map((s) => (
            <button key={s} className={`wk-stp-opt ${s === value ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onPick(s); setOpen(false); }}>
              <span className="wk-stp-ic" style={{ color: STATUS_META[s].c }}><IconStatus status={s} /></span>
              <span className="wk-stp-lb">{STATUS_META[s].label}</span>
              {s === value && (
                <svg className="wk-stp-ck" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
