import { useEffect, useState } from 'react';
import { TopNav } from './components/TopNav';
import { TimerPage } from './pages/TimerPage';
import { ClientsPage } from './pages/ClientsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TasksPage } from './pages/TasksPage';
import { SettingsPage } from './pages/SettingsPage';
import type { Route } from './types';
import { seedIfEmpty } from './store';

const ALL_ROUTES: Route[] = ['timer', 'clients', 'reports', 'projects', 'tasks', 'settings'];

const routeFromHash = (): Route => {
  const hash = window.location.hash.replace('#/', '');
  return (ALL_ROUTES as string[]).includes(hash) ? (hash as Route) : 'timer';
};

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  /** When navigating "View reports" from a client, we pass the clientId through. */
  const [reportsInitialClient, setReportsInitialClient] = useState<string | null>(null);

  useEffect(() => { seedIfEmpty(); }, []);
  useEffect(() => { window.location.hash = `#/${route}`; }, [route]);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // "G then X" shortcuts (ignored while typing)
  useEffect(() => {
    let lastG = 0;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) return;
      if (e.key === 'g' || e.key === 'G') { lastG = Date.now(); return; }
      const within = Date.now() - lastG < 1200;
      if (!within) return;
      const map: Record<string, Route> = {
        t: 'timer',
        c: 'clients',
        r: 'reports',
        p: 'projects',
        k: 'tasks',
        s: 'settings',
      };
      const r = map[e.key.toLowerCase()];
      if (r) { setRoute(r); lastG = 0; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const gotoReports = (clientId: string) => {
    setReportsInitialClient(clientId);
    setRoute('reports');
  };

  return (
    <>
      <TopNav route={route} onNavigate={(r) => { setReportsInitialClient(null); setRoute(r); }} />
      {route === 'timer' && <TimerPage />}
      {route === 'clients' && <ClientsPage onOpenReport={gotoReports} />}
      {route === 'reports' && (
        <ReportsPage
          initialClientId={reportsInitialClient}
          onConsumedInitial={() => setReportsInitialClient(null)}
        />
      )}
      {route === 'projects' && <ProjectsPage />}
      {route === 'tasks' && <TasksPage />}
      {route === 'settings' && <SettingsPage />}
    </>
  );
}
