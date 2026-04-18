import type { Route } from '../types';

const items: { id: Route; label: string }[] = [
  { id: 'timer', label: 'Time' },
  { id: 'clients', label: 'Clients' },
  { id: 'projects', label: 'Projects' },
  { id: 'reports', label: 'Reports' },
  { id: 'tasks', label: 'Tasks' },
];

interface Props {
  route: Route;
  onNavigate: (r: Route) => void;
}

export function TopNav({ route, onNavigate }: Props) {
  return (
    <nav className="topnav no-print">
      <div className="brand">
        <div className="brand-mark">T</div>
        <div>Tracker</div>
      </div>
      <div className="nav-items">
        {items.map((it) => (
          <button
            key={it.id}
            className={`nav-item ${route === it.id ? 'active' : ''}`}
            onClick={() => onNavigate(it.id)}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div className="nav-right">
        <button
          className={`nav-link ${route === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          Settings
        </button>
        <div className="avatar">G</div>
      </div>
    </nav>
  );
}
