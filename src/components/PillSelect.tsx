import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface PillOption { value: string; label: string; icon?: ReactNode }

/** Compact property pill — shows the current value's icon + label, opens a menu
 *  to change it. Shared by the task panel and the project panel. */
export function PillSelect({ value, options, onChange }: {
  value: string; options: PillOption[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const sel = options.find((o) => o.value === value) || options[0];
  return (
    <div className="wk-pill-wrap" ref={ref}>
      <button type="button" className={`wk-pill ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)}>
        {sel?.icon && <span className="wk-pill-ic">{sel.icon}</span>}
        <span>{sel?.label ?? '—'}</span>
      </button>
      {open && (
        <div className="wk-pill-menu">
          {options.map((o) => (
            <button key={o.value || '_'} type="button" className={`wk-pill-opt ${o.value === value ? 'on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.icon && <span className="wk-pill-ic">{o.icon}</span>}
              <span className="wk-pill-lbl">{o.label}</span>
              {o.value === value && (
                <svg className="ck" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
