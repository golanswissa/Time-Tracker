import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Route } from '../types';
import { useUI } from '../ui';
import { useStore } from '../store';
import { ChatRail } from './ChatRail';
import { TaskPanel } from './TaskPanel';
import { SunArc } from './SunArc';
import logoUrl from '../../logo.svg';
import {
  IconPlus, IconLines,
  NavToday, NavClients, NavProjects, NavReports, NavInvoices, NavCategories, NavSettings,
} from './icons';

type NavItem = { id: Route; label: string; Icon: () => JSX.Element };
// Flat menu (with a divider before Settings) for the hamburger dropdown.
const MENU: NavItem[] = [
  { id: 'today', label: 'Today', Icon: NavToday },
  { id: 'projects', label: 'Projects', Icon: NavProjects },
  { id: 'clients', label: 'Clients', Icon: NavClients },
  { id: 'reports', label: 'Reports', Icon: NavReports },
  { id: 'invoices', label: 'Invoices', Icon: NavInvoices },
  { id: 'tasks', label: 'Categories', Icon: NavCategories },
  { id: 'settings', label: 'Settings', Icon: NavSettings },
];

interface Props {
  route: Route;
  onNavigate: (r: Route) => void;
  children: ReactNode;
}

export function AppShell({ route, onNavigate, children }: Props) {
  const navOpen = useUI((s) => s.navOpen);
  const toggleNav = useUI((s) => s.toggleNav);
  const closeNav = useUI((s) => s.closeNav);
  const toggleChat = useUI((s) => s.toggleChat);
  const openCreate = useUI((s) => s.openCreate);
  const dayDate = useUI((s) => s.dayDate);

  // close the hamburger dropdown on outside click / Escape
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!navOpen) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeNav(); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNav(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onEsc); };
  }, [navOpen, closeNav]);

  // Auto night mode: dark from 5pm to 6am. Toggles a class on <html> so the
  // whole site re-themes; the sun-arc swaps its sun for a moon to match.
  const themeMode = useStore((s) => s.settings.themeMode) ?? 'auto';
  useEffect(() => {
    // Enforce the theme on every tick. 'day'/'night' override the clock;
    // 'auto' follows it (night from 5pm to 6am).
    const apply = () => {
      const h = new Date().getHours();
      const isNight = themeMode === 'night' ? true : themeMode === 'day' ? false : (h >= 17 || h < 6);
      document.documentElement.classList.toggle('dark', isNight);
    };
    apply();
    const id = setInterval(apply, 30000);
    return () => clearInterval(id);
  }, [themeMode]);

  return (
    <div className="wk-app">
      {/* ambient sky-dome background (day view only) */}
      {route === 'today' && <SunArc />}

      {/* center */}
      <div className="wk-main">
        <div className="wk-top">
          <div className="wk-tl">
            <img className="wk-logo" src={logoUrl} alt="Tracker" width={28} height={28} />
            <div className="wk-navmenu-wrap" ref={menuRef}>
              <button className={`wk-ham ${navOpen ? 'on' : ''}`} onClick={toggleNav} aria-label="Menu" aria-expanded={navOpen}>
                <span className="wk-ham-ico"><span /><span /></span>
              </button>
              {navOpen && (
                <div className="wk-navmenu" role="menu">
                  {MENU.map(({ id, label, Icon }, i) => (
                    <button
                      key={id}
                      role="menuitem"
                      className={`wk-navmenu-item ${route === id ? 'active' : ''} ${i === MENU.length - 1 ? 'last' : ''}`}
                      onClick={() => { onNavigate(id); closeNav(); }}
                    >
                      <span className="wk-navmenu-ic"><Icon /></span>
                      <span className="wk-navmenu-lb">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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
