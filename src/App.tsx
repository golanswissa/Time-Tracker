import { useEffect, useState } from 'react';
import { TopNav } from './components/TopNav';
import { TimerPage } from './pages/TimerPage';
import { ClientsPage } from './pages/ClientsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TasksPage } from './pages/TasksPage';
import { SettingsPage } from './pages/SettingsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoicePage } from './pages/InvoicePage';
import type { Route } from './types';
import { seedIfEmpty } from './store';

const ALL_ROUTES: Route[] = ['timer', 'clients', 'reports', 'projects', 'tasks', 'invoices', 'settings'];

const parseHash = (): { route: Route; param?: string } => {
  const raw = window.location.hash.replace(/^#\//, '');
  const [head, ...rest] = raw.split('/');
  if ((ALL_ROUTES as string[]).includes(head)) {
    return { route: head as Route, param: rest.join('/') || undefined };
  }
  return { route: 'timer' };
};

export default function App() {
  const initial = parseHash();
  const [route, setRoute] = useState<Route>(initial.route);
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(
    initial.route === 'invoices' && initial.param ? initial.param : null
  );
  const [reportsInitialClient, setReportsInitialClient] = useState<string | null>(null);

  useEffect(() => { seedIfEmpty(); }, []);

  useEffect(() => {
    if (route === 'invoices' && openInvoiceId) {
      window.location.hash = `#/invoices/${openInvoiceId}`;
    } else {
      window.location.hash = `#/${route}`;
    }
  }, [route, openInvoiceId]);

  useEffect(() => {
    const onHash = () => {
      const next = parseHash();
      setRoute(next.route);
      if (next.route === 'invoices') {
        setOpenInvoiceId(next.param || null);
      } else {
        setOpenInvoiceId(null);
      }
    };
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
        i: 'invoices',
        k: 'tasks',
        s: 'settings',
      };
      const r = map[e.key.toLowerCase()];
      if (r) {
        if (r === 'invoices') setOpenInvoiceId(null);
        setRoute(r);
        lastG = 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const gotoReports = (clientId: string) => {
    setReportsInitialClient(clientId);
    setRoute('reports');
  };

  const openInvoice = (id: string) => {
    setOpenInvoiceId(id);
    setRoute('invoices');
  };

  return (
    <>
      <TopNav route={route} onNavigate={(r) => {
        setReportsInitialClient(null);
        if (r === 'invoices') setOpenInvoiceId(null);
        setRoute(r);
      }} />
      {route === 'timer' && <TimerPage />}
      {route === 'clients' && <ClientsPage onOpenReport={gotoReports} />}
      {route === 'reports' && (
        <ReportsPage
          initialClientId={reportsInitialClient}
          onConsumedInitial={() => setReportsInitialClient(null)}
          onOpenInvoice={openInvoice}
        />
      )}
      {route === 'projects' && <ProjectsPage />}
      {route === 'tasks' && <TasksPage />}
      {route === 'invoices' && (
        openInvoiceId
          ? <InvoicePage invoiceId={openInvoiceId} onBack={() => setOpenInvoiceId(null)} />
          : <InvoicesPage onOpenInvoice={openInvoice} />
      )}
      {route === 'settings' && <SettingsPage />}
    </>
  );
}
