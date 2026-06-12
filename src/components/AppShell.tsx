import type { ReactNode } from 'react';
import type { Route } from '../types';
import { useUI } from '../ui';
import { ChatRail } from './ChatRail';
import { TaskPanel } from './TaskPanel';
import {
  IconHam, IconPlus, IconLines,
  NavToday, NavClients, NavProjects, NavReports, NavInvoices, NavCategories, NavSettings,
} from './icons';

const NAV: { id: Route; label: string; Icon: () => JSX.Element }[] = [
  { id: 'today', label: 'Today', Icon: NavToday },
  { id: 'clients', label: 'Clients', Icon: NavClients },
  { id: 'projects', label: 'Projects', Icon: NavProjects },
  { id: 'reports', label: 'Reports', Icon: NavReports },
  { id: 'invoices', label: 'Invoices', Icon: NavInvoices },
  { id: 'tasks', label: 'Categories', Icon: NavCategories },
];

interface Props {
  route: Route;
  onNavigate: (r: Route) => void;
  children: ReactNode;
}

export function AppShell({ route, onNavigate, children }: Props) {
  const navOpen = useUI((s) => s.navOpen);
  const toggleNav = useUI((s) => s.toggleNav);
  const toggleChat = useUI((s) => s.toggleChat);
  const openCreate = useUI((s) => s.openCreate);

  return (
    <div className="wk-app">
      {/* left nav — cuts into the layout */}
      <aside className={`wk-sidenav ${navOpen ? 'on' : ''}`}>
        <div className="wk-sn-in">
          <div className="wk-brand"><span className="mk">T</span> Tracker</div>
          <div className="wk-nav">
            {NAV.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`wk-nav-item ${route === id ? 'active' : ''}`}
                onClick={() => onNavigate(id)}
              >
                <Icon /> {label}
              </button>
            ))}
          </div>
          <div className="wk-sn-sp" />
          <div className="wk-nav">
            <button
              className={`wk-nav-item ${route === 'settings' ? 'active' : ''}`}
              onClick={() => onNavigate('settings')}
            >
              <NavSettings /> Settings
            </button>
          </div>
        </div>
      </aside>

      {/* center */}
      <div className="wk-main">
        <div className="wk-top">
          <button className="wk-ham" onClick={toggleNav} aria-label="Menu"><IconHam /></button>
          <div className="wk-tr">
            <button className="wk-rb wk-add" onClick={() => openCreate()} title="New task"><IconPlus /></button>
            <button className="wk-rb wk-exp" onClick={toggleChat} title="Assistant"><IconLines /></button>
          </div>
        </div>
        {children}
      </div>

      {/* right assistant — cuts into the layout */}
      <ChatRail />

      {/* create/edit overlay */}
      <TaskPanel />
    </div>
  );
}
