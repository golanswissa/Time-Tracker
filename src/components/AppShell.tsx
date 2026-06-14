import type { ReactNode } from 'react';
import type { Route } from '../types';
import { useUI } from '../ui';
import { ChatRail } from './ChatRail';
import { TaskPanel } from './TaskPanel';
import {
  IconHam, IconPlus, IconLines,
  NavToday, NavClients, NavProjects, NavReports, NavInvoices, NavCategories, NavSettings,
} from './icons';

type NavItem = { id: Route; label: string; Icon: () => JSX.Element };
const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Track',
    items: [
      { id: 'today', label: 'Today', Icon: NavToday },
      { id: 'projects', label: 'Projects', Icon: NavProjects },
      { id: 'clients', label: 'Clients', Icon: NavClients },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'reports', label: 'Reports', Icon: NavReports },
      { id: 'invoices', label: 'Invoices', Icon: NavInvoices },
      { id: 'tasks', label: 'Categories', Icon: NavCategories },
    ],
  },
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
  const dayDate = useUI((s) => s.dayDate);

  return (
    <div className="wk-app">
      {/* left nav — cuts into the layout */}
      <aside className={`wk-sidenav ${navOpen ? 'on' : ''}`}>
        <div className="wk-sn-in">
          <div className="wk-brand"><span className="wk-brand-mk">T</span><span className="wk-brand-tx">Tracker</span></div>
          {SECTIONS.map((sec) => (
            <div key={sec.label} className="wk-navgroup">
              <div className="wk-navlabel">{sec.label}</div>
              <div className="wk-nav">
                {sec.items.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className={`wk-nav-item ${route === id ? 'active' : ''}`}
                    onClick={() => onNavigate(id)}
                  >
                    <span className="wk-nav-ic"><Icon /></span>
                    <span className="wk-nav-lb">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="wk-sn-sp" />
          <div className="wk-navdiv" />
          <div className="wk-nav">
            <button
              className={`wk-nav-item ${route === 'settings' ? 'active' : ''}`}
              onClick={() => onNavigate('settings')}
            >
              <span className="wk-nav-ic"><NavSettings /></span>
              <span className="wk-nav-lb">Settings</span>
            </button>
          </div>
        </div>
      </aside>

      {/* center */}
      <div className="wk-main">
        <div className="wk-top">
          <button className="wk-ham" onClick={toggleNav} aria-label="Menu"><IconHam /></button>
          <div className="wk-tr">
            <button className="wk-rb wk-add" onClick={() => openCreate(route === 'today' ? { date: dayDate } : undefined)} title="New task"><IconPlus /></button>
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
