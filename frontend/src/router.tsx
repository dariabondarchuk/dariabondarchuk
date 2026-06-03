import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import ProtectedApp from './components/ProtectedApp';
import LoginPage from './pages/LoginPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyPage from './pages/CompanyPage';
import AnketyPage from './pages/AnketyPage';
import RknPage from './pages/RknPage';
import JournalPage from './pages/JournalPage';
import MonitorPage from './pages/MonitorPage';
import DocumentsPage from './pages/DocumentsPage';
import SettingsPage from './pages/SettingsPage';
import ProcessRegistryPage from './pages/ProcessRegistryPage';
import ProcessesPage from './pages/ProcessesPage';
import CorporateProcessesPage from './pages/CorporateProcessesPage';
import PublicSurveyPage from './pages/PublicSurveyPage';
import PublicAnketaPage from './pages/PublicAnketaPage';

function LegacyAnketyRedirect() {
  const { companyId } = useParams();
  return <Navigate to={`/companies/${companyId}`} replace />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/survey/:token', element: <PublicSurveyPage /> },
  { path: '/anketa/:token', element: <PublicAnketaPage /> },
  {
    path: '/',
    element: <ProtectedApp />,
    children: [
      { index: true, element: <Navigate to="/companies" replace /> },
      { path: 'companies', element: <CompaniesPage /> },
      { path: 'companies/:companyId', element: <CompanyPage /> },
      { path: 'ankety', element: <AnketyPage /> },
      { path: 'ankety/:companyId', element: <LegacyAnketyRedirect /> },
      { path: 'processes/:companyId', element: <ProcessesPage /> },
      { path: 'processes', element: <ProcessesPage /> },
      { path: 'corporate-processes', element: <CorporateProcessesPage /> },
      { path: 'process-registry', element: <ProcessRegistryPage /> },
      { path: 'registry', element: <Navigate to="/process-registry" replace /> },
      { path: 'rkn', element: <RknPage /> },
      { path: 'journal', element: <JournalPage /> },
      { path: 'monitor', element: <MonitorPage /> },
      { path: 'docs', element: <DocumentsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
