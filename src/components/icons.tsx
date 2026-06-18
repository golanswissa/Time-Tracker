/** Small inline icon set for the Phase-1 interface. */
type P = { size?: number };

const S = ({ size = 18, d }: P & { d: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

export const IconHam = () => <svg viewBox="0 0 24 24" width={21} height={21} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>;
export const IconPlus = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
);
export const IconLines = () => (
  <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 9h14"/><path d="M5 15h14"/></svg>
);
export const IconCal = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>
);
export const IconPlay = () => <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
export const IconPause = () => <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>;
export const IconPlayS = () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"><path d="M7 4l13 8-13 8z"/></svg>;
export const IconPauseS = () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}><path d="M7 5v14M17 5v14"/></svg>;
export const IconPencil = () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
export const IconTrash = () => <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>;
// Material Symbols: timelapse (open tasks) + timer (tracked hours). Filled paths, currentColor so they theme.
export const IconTimelapse = ({ size = 16 }: { size?: number }) => <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor"><path d="M7.9987 11.9999C9.10981 11.9999 10.0543 11.611 10.832 10.8333C11.6098 10.0555 11.9987 9.11103 11.9987 7.99992C11.9987 6.88881 11.6098 5.94436 10.832 5.16659C10.0543 4.38881 9.10981 3.99992 7.9987 3.99992V7.99992L5.16536 10.8333C5.55425 11.1999 5.99048 11.4861 6.47403 11.6919C6.95714 11.8973 7.46536 11.9999 7.9987 11.9999ZM7.9987 14.6666C7.07648 14.6666 6.20981 14.4915 5.3987 14.1413C4.58759 13.7915 3.88203 13.3166 3.28203 12.7166C2.68203 12.1166 2.20714 11.411 1.85736 10.5999C1.50714 9.78881 1.33203 8.92214 1.33203 7.99992C1.33203 7.0777 1.50714 6.21103 1.85736 5.39992C2.20714 4.58881 2.68203 3.88325 3.28203 3.28325C3.88203 2.68325 4.58759 2.20814 5.3987 1.85792C6.20981 1.50814 7.07648 1.33325 7.9987 1.33325C8.92092 1.33325 9.78759 1.50814 10.5987 1.85792C11.4098 2.20814 12.1154 2.68325 12.7154 3.28325C13.3154 3.88325 13.7903 4.58881 14.14 5.39992C14.4903 6.21103 14.6654 7.0777 14.6654 7.99992C14.6654 8.92214 14.4903 9.78881 14.14 10.5999C13.7903 11.411 13.3154 12.1166 12.7154 12.7166C12.1154 13.3166 11.4098 13.7915 10.5987 14.1413C9.78759 14.4915 8.92092 14.6666 7.9987 14.6666ZM7.9987 13.3333C9.48759 13.3333 10.7487 12.8166 11.782 11.7833C12.8154 10.7499 13.332 9.48881 13.332 7.99992C13.332 6.51103 12.8154 5.24992 11.782 4.21659C10.7487 3.18325 9.48759 2.66659 7.9987 2.66659C6.50981 2.66659 5.2487 3.18325 4.21536 4.21659C3.18203 5.24992 2.66536 6.51103 2.66536 7.99992C2.66536 9.48881 3.18203 10.7499 4.21536 11.7833C5.2487 12.8166 6.50981 13.3333 7.9987 13.3333Z"/></svg>;
export const IconTimer = ({ size = 16 }: { size?: number }) => <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor"><path d="M6 2.00008V0.666748H10V2.00008H6ZM7.33333 9.33341H8.66667V5.33341H7.33333V9.33341ZM8 14.6667C7.17778 14.6667 6.40267 14.5085 5.67467 14.1921C4.94711 13.8752 4.31111 13.4445 3.76667 12.9001C3.22222 12.3556 2.79156 11.7196 2.47467 10.9921C2.15822 10.2641 2 9.48897 2 8.66675C2 7.84453 2.15822 7.06941 2.47467 6.34141C2.79156 5.61386 3.22222 4.97786 3.76667 4.43341C4.31111 3.88897 4.94711 3.45853 5.67467 3.14208C6.40267 2.82519 7.17778 2.66675 8 2.66675C8.68889 2.66675 9.35 2.77786 9.98333 3.00008C10.6167 3.2223 11.2111 3.54453 11.7667 3.96675L12.7 3.03341L13.6333 3.96675L12.7 4.90008C13.1222 5.45564 13.4444 6.05008 13.6667 6.68341C13.8889 7.31675 14 7.97786 14 8.66675C14 9.48897 13.8418 10.2641 13.5253 10.9921C13.2084 11.7196 12.7778 12.3556 12.2333 12.9001C11.6889 13.4445 11.0529 13.8752 10.3253 14.1921C9.59733 14.5085 8.82222 14.6667 8 14.6667ZM8 13.3334C9.28889 13.3334 10.3889 12.8779 11.3 11.9667C12.2111 11.0556 12.6667 9.95564 12.6667 8.66675C12.6667 7.37786 12.2111 6.27786 11.3 5.36675C10.3889 4.45564 9.28889 4.00008 8 4.00008C6.71111 4.00008 5.61111 4.45564 4.7 5.36675C3.78889 6.27786 3.33333 7.37786 3.33333 8.66675C3.33333 9.95564 3.78889 11.0556 4.7 11.9667C5.61111 12.8779 6.71111 13.3334 8 13.3334Z"/></svg>;

// ---- property pill icons (status / priority / kind) ----
export const IconStatus = ({ status, size = 15 }: { status: string; size?: number }) => {
  if (status === 'done') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="M7.8 12.3l2.6 2.6 5.4-5.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
  if (status === 'doing') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M12 12 L12 3.4 A8.6 8.6 0 0 1 12 20.6 Z" fill="currentColor" /></svg>
  );
  if (status === 'blocked') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeDasharray="2.7 2.7" /></svg>
  );
  return ( // todo
    <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>
  );
};

export const IconPriority = ({ level, size = 15 }: { level: string; size?: number }) => {
  const n = level === 'high' || level === 'asap' ? 3 : level === 'normal' ? 2 : 1;
  const bars = [{ x: 4, h: 7 }, { x: 10, h: 11 }, { x: 16, h: 15 }];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={20 - b.h} width="3.6" height={b.h} rx="1.2" fill="currentColor" opacity={i < n ? 1 : 0.25} />
      ))}
    </svg>
  );
};

export const IconKind = ({ kind, size = 14 }: { kind: string; size?: number }) => {
  const c = { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'print': return <svg {...c}><path d="M6.5 9V3.5h11V9" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14h10v6.5H7z" /></svg>;
    case 'meeting': return <svg {...c}><circle cx="9" cy="8.5" r="3" /><path d="M3.8 19a5.4 5.4 0 0 1 10.4 0" /><path d="M16 6a3 3 0 0 1 0 5" /><path d="M20.4 19a5 5 0 0 0-3.1-4.6" /></svg>;
    case 'email': return <svg {...c}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.6 7 8.4 5.6L20.4 7" /></svg>;
    case 'admin': return <svg {...c}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" /></svg>;
    default: return <svg {...c}><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>; // design
  }
};

// nav icons
export const NavToday = () => <S d="M3 10.5 12 3l9 7.5|M5 9.5V21h14V9.5|M9.5 21v-5h5v5" />;
export const NavClients = () => <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.4"/><path d="M20.5 20a5 5 0 0 0-3.5-4.7"/></svg>;
export const NavProjects = () => <S d="M3 6.5h6l2 2h10v11H3z" />;
export const NavReports = () => <S d="M4 20V10M10 20V4M16 20v-7M3.5 20.2h17" />;
export const NavInvoices = () => <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>;
export const NavCategories = () => <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12.5 12 21l-9-9V3h9z"/><circle cx="7" cy="7" r="1.2"/></svg>;
export const NavSettings = () => <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/></svg>;
