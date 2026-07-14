import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './contexts/AuthContext';
import { useOrganization } from './contexts/OrganizationContext';
import { usePlatformAdmin } from './contexts/PlatformAdminContext';
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
import { PlatformAdminPage } from './pages/PlatformAdminPage';
import { OrganizationAccessPage } from './pages/OrganizationAccessPage';

function LoadingScreen() {
  return <div className="loading-screen"><img src="/brand/ncr-suite-icon.png" alt="" /><span>Chargement de NCR Suite…</span></div>;
}

function ProtectedArea() {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: organizationLoading } = useOrganization();

  if (authLoading || organizationLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (!organization) return <Navigate to="/configuration" replace />;
  if (['suspended', 'closed'].includes(organization.status)) return <OrganizationAccessPage />;
  return <AppShell />;
}

function PlatformAdminArea() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();

  if (authLoading || adminLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <PlatformAdminPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/configuration" element={<OnboardingPage />} />
      <Route path="/reserver/:slug" element={<PublicBookingPage />} />
      <Route path="/reservation/:token" element={<PublicBookingManagePage />} />
      <Route path="/invitation/:token" element={<InvitationPage />} />
      <Route path="/administration-ncr" element={<PlatformAdminArea />} />
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
