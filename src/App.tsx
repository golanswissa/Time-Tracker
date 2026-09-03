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
import { QuotePage } from './pages/QuotePage';
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
  // A quote is viewed under the reports route: #/reports/quote/<id>
  const quoteFromParam = (route: Route, param?: string) =>
    route === 'reports' && param?.startsWith('quote/') ? param.slice('quote/'.length) : null;
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(quoteFromParam(initial.route, initial.param));
  const [reportsInitialClient, setReportsInitialClient] = useState<string | null>(null);

  useEffect(() => { seedIfEmpty(); }, []);

  useEffect(() => {
    if (route === 'invoices' && openInvoiceId) {
      window.location.hash = `#/invoices/${openInvoiceId}`;
    } else if (route === 'reports' && openQuoteId) {
      window.location.hash = `#/reports/quote/${openQuoteId}`;
    } else {
      window.location.hash = `#/${route}`;
    }
  }, [route, openInvoiceId, openQuoteId]);

  useEffect(() => {
    const onHash = () => {
      const next = parseHash();
      setRoute(next.route);
      setOpenInvoiceId(next.route === 'invoices' ? next.param || null : null);
      setOpenQuoteId(quoteFromParam(next.route, next.param));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const gotoReports = (clientId: string) => { setReportsInitialClient(clientId); setRoute('reports'); };
  const openInvoice = (id: string) => { setOpenInvoiceId(id); setRoute('invoices'); };
  const openQuote = (id: string) => { setOpenQuoteId(id); setRoute('reports'); };

  const navigate = (r: Route) => {
    setReportsInitialClient(null);
    if (r === 'invoices') setOpenInvoiceId(null);
    setOpenQuoteId(null);
    setRoute(r);
  };

  // 'today' is the home; legacy 'timer'/'plan' hashes fall through to it too.
  const isDay = route === 'today' || route === 'timer' || route === 'plan';

  return (
    <AppShell route={isDay ? 'today' : route} onNavigate={navigate}>
      {isDay && <DayView />}
      {route === 'clients' && <ClientsPage onOpenReport={gotoReports} />}
      {route === 'reports' && (
        openQuoteId
          ? <QuotePage quoteId={openQuoteId} onBack={() => setOpenQuoteId(null)} />
          : <ReportsPage
              initialClientId={reportsInitialClient}
              onConsumedInitial={() => setReportsInitialClient(null)}
              onOpenInvoice={openInvoice}
              onOpenQuote={openQuote}
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
