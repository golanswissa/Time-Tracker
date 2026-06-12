import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { DayView } from './pages/DayView';
import { ClientsPage } from './pages/ClientsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProjectsView } from './pages/ProjectsView';
import { TasksPage } from './pages/TasksPage';
import { SettingsPage } from './pages/SettingsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoicePage } from './pages/InvoicePage';
import type { Route } from './types';
import { seedIfEmpty } from './store';

const ALL_ROUTES: Route[] = ['today', 'plan', 'timer', 'clients', 'reports', 'projects', 'tasks', 'invoices', 'settings'];

const parseHash = (): { route: Route; param?: string } => {
  const raw = window.location.hash.replace(/^#\//, '');
  const [head, ...rest] = raw.split('/');
  if ((ALL_ROUTES as string[]).includes(head)) {
    return { route: head as Route, param: rest.join('/') || undefined };
  }
  return { route: 'today' };
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
      setOpenInvoiceId(next.route === 'invoices' ? next.param || null : null);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const gotoReports = (clientId: string) => { setReportsInitialClient(clientId); setRoute('reports'); };
  const openInvoice = (id: string) => { setOpenInvoiceId(id); setRoute('invoices'); };

  const navigate = (r: Route) => {
    setReportsInitialClient(null);
    if (r === 'invoices') setOpenInvoiceId(null);
    setRoute(r);
  };

  // 'today' is the home; legacy 'timer'/'plan' hashes fall through to it too.
  const isDay = route === 'today' || route === 'timer' || route === 'plan';

  return (
    <AppShell route={isDay ? 'today' : route} onNavigate={navigate}>
      {isDay && <DayView />}
      {route === 'clients' && <ClientsPage onOpenReport={gotoReports} />}
      {route === 'reports' && (
        <ReportsPage
          initialClientId={reportsInitialClient}
          onConsumedInitial={() => setReportsInitialClient(null)}
          onOpenInvoice={openInvoice}
        />
      )}
      {route === 'projects' && <ProjectsView />}
      {route === 'tasks' && <TasksPage />}
      {route === 'invoices' && (
        openInvoiceId
          ? <InvoicePage invoiceId={openInvoiceId} onBack={() => setOpenInvoiceId(null)} />
          : <InvoicesPage onOpenInvoice={openInvoice} />
      )}
      {route === 'settings' && <SettingsPage />}
    </AppShell>
  );
}
