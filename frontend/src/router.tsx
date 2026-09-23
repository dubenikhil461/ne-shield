import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import RiskPage from './pages/RiskPage';
import SensorsPage from './pages/SensorsPage';
import ImpactPage from './pages/ImpactPage';
import FieldReportsPage from './pages/FieldReportsPage';
import AlertsPage from './pages/AlertsPage';
import SystemPage from './pages/SystemPage';
import NotFoundPage from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'risk', element: <RiskPage /> },
      { path: 'sensors', element: <SensorsPage /> },
      { path: 'impact', element: <ImpactPage /> },
      { path: 'field-reports', element: <FieldReportsPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'system', element: <SystemPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
