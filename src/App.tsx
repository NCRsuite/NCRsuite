import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './contexts/AuthContext';
import { useOrganization } from './contexts/OrganizationContext';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { LoginPage } from './pages/LoginPage';
import { ModulePage } from './pages/ModulePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SettingsPage } from './pages/SettingsPage';
import { ServicesPage } from './pages/ServicesPage';
import { StaffPage } from './pages/StaffPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { PublicBookingPage } from './pages/PublicBookingPage';
import { PublicBookingManagePage } from './pages/PublicBookingManagePage';
import { TeamAccessPage } from './pages/TeamAccessPage';
import { InvitationPage } from './pages/InvitationPage';
import { CommercialBrandingPage } from './pages/CommercialBrandingPage';

function LoadingScreen() {
  return <div className="loading-screen"><img src="/brand/ncr-suite-icon.png" alt="" /><span>Chargement de NCR Suite…</span></div>;
}

function ProtectedArea() {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: organizationLoading } = useOrganization();

  if (authLoading || organizationLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (!organization) return <Navigate to="/configuration" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/configuration" element={<OnboardingPage />} />
      <Route path="/reserver/:slug" element={<PublicBookingPage />} />
      <Route path="/reservation/:token" element={<PublicBookingManagePage />} />
      <Route path="/invitation/:token" element={<InvitationPage />} />
      <Route element={<ProtectedArea />}>
        <Route index element={<DashboardPage />} />
        <Route path="rendez-vous" element={<AppointmentsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="prestations" element={<ServicesPage />} />
        <Route path="equipe" element={<StaffPage />} />
        <Route path="acces-equipe" element={<TeamAccessPage />} />
        <Route path="personnalisation" element={<CommercialBrandingPage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="*" element={<ModulePage />} />
      </Route>
    </Routes>
  );
}
