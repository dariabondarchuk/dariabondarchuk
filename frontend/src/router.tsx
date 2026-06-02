import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedApp from './components/ProtectedApp';
import LoginPage from './pages/LoginPage';
import AnketyPage from './pages/AnketyPage';
import RegistryPage from './pages/RegistryPage';
import RknPage from './pages/RknPage';
import JournalPage from './pages/JournalPage';
import MonitorPage from './pages/MonitorPage';
import DocumentsPage from './pages/DocumentsPage';
import SettingsPage from './pages/SettingsPage';
import PublicSurveyPage from './pages/PublicSurveyPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/survey/:token', element: <PublicSurveyPage /> },
  {
    path: '/',
    element: <ProtectedApp />,
    children: [
      { index: true, element: <Navigate to="/ankety" replace /> },
      { path: 'ankety', element: <AnketyPage /> },
      { path: 'registry', element: <RegistryPage /> },
      { path: 'rkn', element: <RknPage /> },
      { path: 'journal', element: <JournalPage /> },
      { path: 'monitor', element: <MonitorPage /> },
      { path: 'docs', element: <DocumentsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
