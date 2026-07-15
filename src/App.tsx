import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ModuleAccessGuard } from './components/ModuleAccessGuard';
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
import { SubscriptionPage } from './pages/SubscriptionPage';
import { MetierWorkspacePage } from './pages/MetierWorkspacePage';
import { TrainingProgramsPage } from './pages/TrainingProgramsPage';
import { TrainingTraineesPage } from './pages/TrainingTraineesPage';
import { TrainingTrainersPage } from './pages/TrainingTrainersPage';
import { TrainingSessionsPage } from './pages/TrainingSessionsPage';
import { TrainingDocumentsPage } from './pages/TrainingDocumentsPage';
import { TrainingAttendancePage } from './pages/TrainingAttendancePage';
import { organizationCanAccessPath } from './config/moduleAccess';


function DocumentsArea() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'formation') return <TrainingDocumentsPage />;
  return <ModulePage />;
}

function LoadingScreen() {
  return <div className="loading-screen"><img src="/brand/ncr-suite-icon.png" alt="" /><span>Chargement de NCR Suite…</span></div>;
}

function ProtectedArea() {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: organizationLoading } = useOrganization();
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();
  const location = useLocation();

  if (authLoading || adminLoading || organizationLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/connexion" replace />;

  // Un compte plateforme ne pénètre jamais dans un espace entreprise.
  if (isAdmin) return <Navigate to="/administration-ncr" replace />;

  if (!organization) return <Navigate to="/configuration" replace />;
  if (organization.status === 'closed') return <OrganizationAccessPage />;
  if (organization.status === 'suspended' && location.pathname !== '/abonnement') return <OrganizationAccessPage />;
  if (!organizationCanAccessPath(organization, location.pathname)) return <Navigate to="/" replace />;
  return <AppShell />;
}

function OnboardingArea() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();

  if (authLoading || adminLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (isAdmin) return <Navigate to="/administration-ncr" replace />;
  return <OnboardingPage />;
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
      <Route path="/configuration" element={<OnboardingArea />} />
      <Route path="/reserver/:slug" element={<PublicBookingPage />} />
      <Route path="/reservation/:token" element={<PublicBookingManagePage />} />
      <Route path="/invitation/:token" element={<InvitationPage />} />
      <Route path="/administration-ncr" element={<PlatformAdminArea />} />
      <Route element={<ProtectedArea />}>
        <Route index element={<DashboardPage />} />
        <Route path="formations" element={<ModuleAccessGuard moduleKey="training_programs"><TrainingProgramsPage /></ModuleAccessGuard>} />
        <Route path="stagiaires" element={<ModuleAccessGuard moduleKey="trainees"><TrainingTraineesPage /></ModuleAccessGuard>} />
        <Route path="formateurs" element={<ModuleAccessGuard moduleKey="trainers"><TrainingTrainersPage /></ModuleAccessGuard>} />
        <Route path="sessions" element={<ModuleAccessGuard moduleKey="sessions"><TrainingSessionsPage /></ModuleAccessGuard>} />
        <Route path="documents" element={<ModuleAccessGuard moduleKey="documents"><DocumentsArea /></ModuleAccessGuard>} />
        <Route path="emargements" element={<ModuleAccessGuard moduleKey="attendance"><TrainingAttendancePage /></ModuleAccessGuard>} />
        <Route path="rendez-vous" element={<ModuleAccessGuard moduleKey="appointments"><AppointmentsPage /></ModuleAccessGuard>} />
        <Route path="clients" element={<ModuleAccessGuard moduleKey="clients"><ClientsPage /></ModuleAccessGuard>} />
        <Route path="prestations" element={<ModuleAccessGuard moduleKey="services"><ServicesPage /></ModuleAccessGuard>} />
        <Route path="equipe" element={<ModuleAccessGuard moduleKey="staff"><StaffPage /></ModuleAccessGuard>} />
        <Route path="acces-equipe" element={<ModuleAccessGuard moduleKey="team_access"><TeamAccessPage /></ModuleAccessGuard>} />
        <Route path="personnalisation" element={<ModuleAccessGuard moduleKey="commercial_branding"><CommercialBrandingPage /></ModuleAccessGuard>} />
        <Route path="abonnement" element={<SubscriptionPage />} />
        <Route path="offre-metier" element={<MetierWorkspacePage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="*" element={<ModulePage />} />
      </Route>
    </Routes>
  );
}
