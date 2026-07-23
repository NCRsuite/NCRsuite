import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ModuleAccessGuard } from './components/ModuleAccessGuard';
import { SecurityFeatureGate } from './components/SecurityFeatureGate';
import { useAuth } from './contexts/AuthContext';
import { useOrganization } from './contexts/OrganizationContext';
import { usePlatformAdmin } from './contexts/PlatformAdminContext';

import { CleaningFeatureGate } from './components/CleaningFeatureGate';
import { organizationCanAccessPath } from './config/moduleAccess';
import { RestaurantFeatureGate } from './components/RestaurantFeatureGate';



const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ClientsPage = lazy(() => import('./pages/ClientsPage').then((module) => ({ default: module.ClientsPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const ModulePage = lazy(() => import('./pages/ModulePage').then((module) => ({ default: module.ModulePage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const ServicesPage = lazy(() => import('./pages/ServicesPage').then((module) => ({ default: module.ServicesPage })));
const StaffPage = lazy(() => import('./pages/StaffPage').then((module) => ({ default: module.StaffPage })));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage').then((module) => ({ default: module.AppointmentsPage })));
const PublicBookingPage = lazy(() => import('./pages/PublicBookingPage').then((module) => ({ default: module.PublicBookingPage })));
const PublicBookingManagePage = lazy(() => import('./pages/PublicBookingManagePage').then((module) => ({ default: module.PublicBookingManagePage })));
const TeamAccessPage = lazy(() => import('./pages/TeamAccessPage').then((module) => ({ default: module.TeamAccessPage })));
const InvitationPage = lazy(() => import('./pages/InvitationPage').then((module) => ({ default: module.InvitationPage })));
const CommercialBrandingPage = lazy(() => import('./pages/CommercialBrandingPage').then((module) => ({ default: module.CommercialBrandingPage })));
const PlatformAdminPage = lazy(() => import('./pages/PlatformAdminPage').then((module) => ({ default: module.PlatformAdminPage })));
const OrganizationAccessPage = lazy(() => import('./pages/OrganizationAccessPage').then((module) => ({ default: module.OrganizationAccessPage })));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage').then((module) => ({ default: module.SubscriptionPage })));
const MetierWorkspacePage = lazy(() => import('./pages/MetierWorkspacePage').then((module) => ({ default: module.MetierWorkspacePage })));
const TrainingProgramsPage = lazy(() => import('./pages/TrainingProgramsPage').then((module) => ({ default: module.TrainingProgramsPage })));
const TrainingTraineesPage = lazy(() => import('./pages/TrainingTraineesPage').then((module) => ({ default: module.TrainingTraineesPage })));
const TrainingTrainersPage = lazy(() => import('./pages/TrainingTrainersPage').then((module) => ({ default: module.TrainingTrainersPage })));
const TrainingSessionsPage = lazy(() => import('./pages/TrainingSessionsPage').then((module) => ({ default: module.TrainingSessionsPage })));
const TrainingDocumentsPage = lazy(() => import('./pages/TrainingDocumentsPage').then((module) => ({ default: module.TrainingDocumentsPage })));
const TrainingAttendancePage = lazy(() => import('./pages/TrainingAttendancePage').then((module) => ({ default: module.TrainingAttendancePage })));
const TrainingEvaluationsPage = lazy(() => import('./pages/TrainingEvaluationsPage').then((module) => ({ default: module.TrainingEvaluationsPage })));
const TrainingSitesPage = lazy(() => import('./pages/TrainingSitesPage').then((module) => ({ default: module.TrainingSitesPage })));
const TrainingCommercialPage = lazy(() => import('./pages/TrainingCommercialPage').then((module) => ({ default: module.TrainingCommercialPage })));
const PublicTrainingSatisfactionPage = lazy(() => import('./pages/PublicTrainingSatisfactionPage').then((module) => ({ default: module.PublicTrainingSatisfactionPage })));
const SecurityClientsPage = lazy(() => import('./pages/SecurityClientsPage').then((module) => ({ default: module.SecurityClientsPage })));
const SecurityAgentsPage = lazy(() => import('./pages/SecurityAgentsPage').then((module) => ({ default: module.SecurityAgentsPage })));
const SecurityAgentDetailPage = lazy(() => import('./pages/SecurityAgentDetailPage').then((module) => ({ default: module.SecurityAgentDetailPage })));
const SecuritySitesPage = lazy(() => import('./pages/SecuritySitesPage').then((module) => ({ default: module.SecuritySitesPage })));
const SecurityPlanningPage = lazy(() => import('./pages/SecurityPlanningPage').then((module) => ({ default: module.SecurityPlanningPage })));
const SecurityBillingPage = lazy(() => import('./pages/SecurityBillingPage').then((module) => ({ default: module.SecurityBillingPage })));
const SecurityPatrolsPage = lazy(() => import('./pages/SecurityPatrolsPage').then((module) => ({ default: module.SecurityPatrolsPage })));
const SecurityLogbookPage = lazy(() => import('./pages/SecurityLogbookPage').then((module) => ({ default: module.SecurityLogbookPage })));
const SecurityInstructionsPage = lazy(() => import('./pages/SecurityInstructionsPage').then((module) => ({ default: module.SecurityInstructionsPage })));
const SecurityAgentPortalPage = lazy(() => import('./pages/SecurityAgentPortalPage').then((module) => ({ default: module.SecurityAgentPortalPage })));
const SecurityGeolocationPage = lazy(() => import('./pages/SecurityGeolocationPage').then((module) => ({ default: module.SecurityGeolocationPage })));
const SecurityPtiPage = lazy(() => import('./pages/SecurityPtiPage').then((module) => ({ default: module.SecurityPtiPage })));
const SecuritySupervisionPage = lazy(() => import('./pages/SecuritySupervisionPage').then((module) => ({ default: module.SecuritySupervisionPage })));
const SecurityShiftDossiersPage = lazy(() => import('./pages/SecurityShiftDossiersPage').then((module) => ({ default: module.SecurityShiftDossiersPage })));
const SecurityClientPortalAdminPage = lazy(() => import('./pages/SecurityClientPortalAdminPage').then((module) => ({ default: module.SecurityClientPortalAdminPage })));
const SecurityClientPortalInvitationPage = lazy(() => import('./pages/SecurityClientPortalInvitationPage').then((module) => ({ default: module.SecurityClientPortalInvitationPage })));
const SecurityClientPortalPage = lazy(() => import('./pages/SecurityClientPortalPage').then((module) => ({ default: module.SecurityClientPortalPage })));
const SecurityQuotesPage = lazy(() => import('./pages/SecurityQuotesPage').then((module) => ({ default: module.SecurityQuotesPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then((module) => ({ default: module.SupportPage })));
const SaasLaunchCenterPage = lazy(() => import('./pages/SaasLaunchCenterPage').then((module) => ({ default: module.SaasLaunchCenterPage })));
const CleaningClientsPage = lazy(() => import('./pages/CleaningClientsPage').then((module) => ({ default: module.CleaningClientsPage })));
const CleaningSitesPage = lazy(() => import('./pages/CleaningSitesPage').then((module) => ({ default: module.CleaningSitesPage })));
const CleaningAgentsPage = lazy(() => import('./pages/CleaningAgentsPage').then((module) => ({ default: module.CleaningAgentsPage })));
const CleaningPlanningPage = lazy(() => import('./pages/CleaningPlanningPage').then((module) => ({ default: module.CleaningPlanningPage })));
const CleaningAgentPortalPage = lazy(() => import('./pages/CleaningAgentPortalPage').then((module) => ({ default: module.CleaningAgentPortalPage })));
const CleaningInterventionsPage = lazy(() => import('./pages/CleaningInterventionsPage').then((module) => ({ default: module.CleaningInterventionsPage })));
const CleaningReportsPage = lazy(() => import('./pages/CleaningReportsPage').then((module) => ({ default: module.CleaningReportsPage })));
const CleaningAnomaliesPage = lazy(() => import('./pages/CleaningAnomaliesPage').then((module) => ({ default: module.CleaningAnomaliesPage })));
const CleaningQualityPage = lazy(() => import('./pages/CleaningQualityPage').then((module) => ({ default: module.CleaningQualityPage })));
const CleaningStockPage = lazy(() => import('./pages/CleaningStockPage').then((module) => ({ default: module.CleaningStockPage })));
const CleaningBillingPage = lazy(() => import('./pages/CleaningBillingPage').then((module) => ({ default: module.CleaningBillingPage })));
const CleaningProtocolsPage = lazy(() => import('./pages/CleaningProtocolsPage').then((module) => ({ default: module.CleaningProtocolsPage })));
const CleaningProfitabilityPage = lazy(() => import('./pages/CleaningProfitabilityPage').then((module) => ({ default: module.CleaningProfitabilityPage })));
const CleaningClientPortalAdminPage = lazy(() => import('./pages/CleaningClientPortalAdminPage').then((module) => ({ default: module.CleaningClientPortalAdminPage })));
const CleaningClientPortalInvitationPage = lazy(() => import('./pages/CleaningClientPortalInvitationPage').then((module) => ({ default: module.CleaningClientPortalInvitationPage })));
const CleaningClientPortalPage = lazy(() => import('./pages/CleaningClientPortalPage').then((module) => ({ default: module.CleaningClientPortalPage })));
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage').then((module) => ({ default: module.LoyaltyPage })));
const CoiffureClientPortalInvitationPage = lazy(() => import('./pages/CoiffureClientPortalInvitationPage').then((module) => ({ default: module.CoiffureClientPortalInvitationPage })));
const CoiffureClientPortalPage = lazy(() => import('./pages/CoiffureClientPortalPage').then((module) => ({ default: module.CoiffureClientPortalPage })));
const RestaurantEmployeesPage = lazy(() => import('./pages/RestaurantEmployeesPage').then((module) => ({ default: module.RestaurantEmployeesPage })));
const RestaurantPlanningPage = lazy(() => import('./pages/RestaurantPlanningPage').then((module) => ({ default: module.RestaurantPlanningPage })));
const RestaurantEmployeePortalPage = lazy(() => import('./pages/RestaurantEmployeePortalPage').then((module) => ({ default: module.RestaurantEmployeePortalPage })));
const RestaurantMenuPage = lazy(() => import('./pages/RestaurantMenuPage').then((module) => ({ default: module.RestaurantMenuPage })));
const RestaurantRecipesPage = lazy(() => import('./pages/RestaurantRecipesPage').then((module) => ({ default: module.RestaurantRecipesPage })));
const RestaurantReservationsPage = lazy(() => import('./pages/RestaurantReservationsPage').then((module) => ({ default: module.RestaurantReservationsPage })));
const RestaurantOrdersPage = lazy(() => import('./pages/RestaurantOrdersPage').then((module) => ({ default: module.RestaurantOrdersPage })));
const RestaurantKitchenPage = lazy(() => import('./pages/RestaurantKitchenPage').then((module) => ({ default: module.RestaurantKitchenPage })));
const RestaurantFloorPlanPage = lazy(() => import('./pages/RestaurantFloorPlanPage').then((module) => ({ default: module.RestaurantFloorPlanPage })));
const RestaurantQrMenuPage = lazy(() => import('./pages/RestaurantQrMenuPage').then((module) => ({ default: module.RestaurantQrMenuPage })));
const RestaurantFoodSafetyPage = lazy(() => import('./pages/RestaurantFoodSafetyPage').then((module) => ({ default: module.RestaurantFoodSafetyPage })));
const RestaurantStockPage = lazy(() => import('./pages/RestaurantStockPage').then((module) => ({ default: module.RestaurantStockPage })));
const PublicRestaurantMenuPage = lazy(() => import('./pages/PublicRestaurantMenuPage').then((module) => ({ default: module.PublicRestaurantMenuPage })));
const PublicRestaurantBookingPage = lazy(() => import('./pages/PublicRestaurantBookingPage').then((module) => ({ default: module.PublicRestaurantBookingPage })));

function DocumentsArea() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'formation') return <TrainingDocumentsPage />;
  return <ModulePage />;
}

function ClientsArea() {
  const { organization } = useOrganization();
  const moduleKey = organization?.business_type === 'securite' ? 'security_clients' : organization?.business_type === 'nettoyage' ? 'cleaning_clients' : 'clients';
  return <ModuleAccessGuard moduleKey={moduleKey}>{organization?.business_type === 'securite' ? <SecurityClientsPage /> : organization?.business_type === 'nettoyage' ? <CleaningClientsPage /> : <ClientsPage />}</ModuleAccessGuard>;
}

function PlanningArea() {
  const { organization } = useOrganization();
  const moduleKey = organization?.business_type === 'securite' ? 'security_planning' : organization?.business_type === 'nettoyage' ? 'cleaning_planning' : organization?.business_type === 'restauration' ? 'restaurant_staff_planning' : 'planning';
  return <ModuleAccessGuard moduleKey={moduleKey}>{organization?.business_type === 'securite' ? <SecurityPlanningPage /> : organization?.business_type === 'nettoyage' ? <CleaningPlanningPage /> : organization?.business_type === 'restauration' ? <RestaurantPlanningPage /> : <ModulePage />}</ModuleAccessGuard>;
}

function AgentsArea() {
  const { organization } = useOrganization();
  const moduleKey = organization?.business_type === 'securite' ? 'security_agents' : organization?.business_type === 'nettoyage' ? 'cleaning_agents' : 'agents';
  return <ModuleAccessGuard moduleKey={moduleKey}>{organization?.business_type === 'securite' ? <SecurityAgentsPage /> : organization?.business_type === 'nettoyage' ? <CleaningAgentsPage /> : <ModulePage />}</ModuleAccessGuard>;
}

function SitesArea() {
  const { organization } = useOrganization();
  const moduleKey = organization?.business_type === 'securite' ? 'security_sites' : organization?.business_type === 'nettoyage' ? 'cleaning_sites' : 'sites';
  return <ModuleAccessGuard moduleKey={moduleKey}>{organization?.business_type === 'securite' ? <SecuritySitesPage /> : organization?.business_type === 'nettoyage' ? <CleaningSitesPage /> : <ModulePage />}</ModuleAccessGuard>;
}


function BrandingArea() {
  const { organization } = useOrganization();
  const moduleKey = organization?.business_type === 'securite' ? 'security_document_branding' : 'commercial_branding';
  if (organization?.business_type === 'restauration') return <RestaurantFeatureGate feature="commercial_branding" requiredPlan="Essentielle" description="Personnalisez le menu public, les documents et les communications du restaurant."><CommercialBrandingPage /></RestaurantFeatureGate>;
  return <ModuleAccessGuard moduleKey={moduleKey}><CommercialBrandingPage /></ModuleAccessGuard>;
}


function TeamAccessArea() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'securite') {
    return <SecurityFeatureGate feature="team_access" requiredPlan="Essentielle" description="Connectez les agents à leur planning, leurs rondes et leur main courante. L’offre Professionnelle ajoute le rôle Chef de poste."><TeamAccessPage /></SecurityFeatureGate>;
  }
  if (organization?.business_type === 'nettoyage') {
    return <CleaningFeatureGate feature="team_access" requiredPlan="Essentielle" description="Connectez les agents à leur planning, leur pointage, leurs consignes et leurs rapports. L’offre Professionnelle ajoute le rôle Chef d’équipe."><TeamAccessPage /></CleaningFeatureGate>;
  }
  if (organization?.business_type === 'restauration') {
    return <RestaurantFeatureGate feature="team_access" requiredPlan="Essentielle" description="Connectez jusqu’à 10 employés à leur planning, aux réservations, à la carte et aux outils d’hygiène. L’offre Professionnelle ajoute le rôle Manager."><TeamAccessPage /></RestaurantFeatureGate>;
  }
  return <ModuleAccessGuard moduleKey="team_access"><TeamAccessPage /></ModuleAccessGuard>;
}




function ClientPortalAdminArea() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'securite') {
    return <SecurityFeatureGate feature="security_client_portal" requiredPlan="Professionnelle" description="Ouvrez à chaque donneur d’ordre un espace sécurisé pour consulter ses missions, rapports, rondes, documents et messages."><SecurityClientPortalAdminPage /></SecurityFeatureGate>;
  }
  if (organization?.business_type === 'nettoyage') {
    return <CleaningFeatureGate feature="cleaning_client_portal" requiredPlan="Métier" description="Ouvrez à chaque client un espace sécurisé pour suivre ses interventions, rapports, anomalies, contrôles qualité, documents et messages."><CleaningClientPortalAdminPage /></CleaningFeatureGate>;
  }
  return <Navigate to="/" replace />;
}

function CleaningOnlyArea({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
  if (organization?.business_type !== 'nettoyage') return <Navigate to="/" replace />;
  return <>{children}</>;
}


function RestaurantOnlyArea({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
  if (organization?.business_type !== 'restauration') return <Navigate to="/" replace />;
  return <>{children}</>;
}


function CleaningOrSecurityBilling() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'nettoyage') return <ModuleAccessGuard moduleKey="cleaning_billing"><CleaningBillingPage /></ModuleAccessGuard>;
  if (organization?.business_type === 'securite') return <ModuleAccessGuard moduleKey="security_billing"><SecurityBillingPage /></ModuleAccessGuard>;
  return <Navigate to="/" replace />;
}

function FieldTerrainArea() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'nettoyage') {
    return <CleaningFeatureGate feature="cleaning_agent_portal" requiredPlan="Essentielle" description="Donnez aux agents un espace terrain avec planning, consignes, pointage et preuves photo."><CleaningAgentPortalPage /></CleaningFeatureGate>;
  }
  if (organization?.business_type === 'restauration') {
    return <RestaurantFeatureGate feature="restaurant_employee_portal" requiredPlan="Essentielle" description="Donnez aux employés un espace personnel avec planning, réservations, carte et outils d’hygiène."><RestaurantEmployeePortalPage /></RestaurantFeatureGate>;
  }
  if (organization?.business_type === 'securite') {
    return <SecurityFeatureGate feature="security_agent_portal" requiredPlan="Essentielle" description="Donnez aux agents un accès sécurisé à leur planning, leurs missions et leurs outils terrain. Ce module peut aussi être activé à la carte."><SecurityAgentPortalPage /></SecurityFeatureGate>;
  }
  return <Navigate to="/" replace />;
}


function StaffArea() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'restauration') return <ModuleAccessGuard moduleKey="restaurant_staff"><RestaurantEmployeesPage /></ModuleAccessGuard>;
  return <ModuleAccessGuard moduleKey="staff"><StaffPage /></ModuleAccessGuard>;
}

function StockArea() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'nettoyage') return <CleaningOnlyArea><CleaningFeatureGate feature="cleaning_stock" requiredPlan="Professionnelle" description="Pilotez les produits, consommables, coûts et seuils de réapprovisionnement."><CleaningStockPage /></CleaningFeatureGate></CleaningOnlyArea>;
  if (organization?.business_type === 'restauration') return <ModuleAccessGuard moduleKey="restaurant_stock"><RestaurantStockPage /></ModuleAccessGuard>;
  return <Navigate to="/" replace />;
}

function LoadingScreen() {
  return <div className="loading-screen"><img src="/brand/ncr-suite-icon.png" alt="" /><span>Chargement de NCR Suite…</span></div>;
}

function ProtectedArea() {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: organizationLoading, supportSession } = useOrganization();
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();
  const location = useLocation();

  if (authLoading || adminLoading || organizationLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/connexion" replace />;

  // Un compte plateforme ne pénètre dans un espace entreprise que pendant une session d’assistance autorisée.
  if (isAdmin && !supportSession) return <Navigate to="/administration-ncr" replace />;

  if (!organization) return <Navigate to={isAdmin ? '/administration-ncr' : '/configuration'} replace />;
  if (supportSession && ['/abonnement','/acces-equipe','/parametres','/offre-metier','/personnalisation'].includes(location.pathname)) return <Navigate to="/" replace />;
  if (organization.status === 'closed') return <OrganizationAccessPage />;
  if (organization.status === 'suspended' && location.pathname !== '/abonnement') return <OrganizationAccessPage />;
  if (!organizationCanAccessPath(organization, location.pathname)) return <Navigate to="/" replace />;
  return <AppShell />;
}


function SaasLaunchCenterArea() {
  const { organization } = useOrganization();
  if (!organization || !['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer')) return <Navigate to="/" replace />;
  return <SaasLaunchCenterPage />;
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
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/configuration" element={<OnboardingArea />} />
      <Route path="/reserver/:slug" element={<PublicBookingPage />} />
      <Route path="/reservation/:token" element={<PublicBookingManagePage />} />
      <Route path="/invitation/:token" element={<InvitationPage />} />
      <Route path="/evaluation/:token" element={<PublicTrainingSatisfactionPage />} />
      <Route path="/r/:slug/menu" element={<PublicRestaurantMenuPage />} />
      <Route path="/r/:slug/reserver" element={<PublicRestaurantBookingPage />} />
      <Route path="/client-securite/invitation/:token" element={<SecurityClientPortalInvitationPage />} />
      <Route path="/espace-client-securite" element={<SecurityClientPortalPage />} />
      <Route path="/client-nettoyage/invitation/:token" element={<CleaningClientPortalInvitationPage />} />
      <Route path="/espace-client-nettoyage" element={<CleaningClientPortalPage />} />
      <Route path="/client-coiffure/invitation/:token" element={<CoiffureClientPortalInvitationPage />} />
      <Route path="/espace-client-coiffure" element={<CoiffureClientPortalPage />} />
      <Route path="/administration-ncr" element={<PlatformAdminArea />} />
      <Route element={<ProtectedArea />}>
        <Route index element={<DashboardPage />} />
        <Route path="formations" element={<ModuleAccessGuard moduleKey="training_programs"><TrainingProgramsPage /></ModuleAccessGuard>} />
        <Route path="stagiaires" element={<ModuleAccessGuard moduleKey="trainees"><TrainingTraineesPage /></ModuleAccessGuard>} />
        <Route path="formateurs" element={<ModuleAccessGuard moduleKey="trainers"><TrainingTrainersPage /></ModuleAccessGuard>} />
        <Route path="sessions" element={<ModuleAccessGuard moduleKey="sessions"><TrainingSessionsPage /></ModuleAccessGuard>} />
        <Route path="documents" element={<ModuleAccessGuard moduleKey="documents"><DocumentsArea /></ModuleAccessGuard>} />
        <Route path="attestations" element={<ModuleAccessGuard moduleKey="certificates"><TrainingDocumentsPage /></ModuleAccessGuard>} />
        <Route path="emargements" element={<ModuleAccessGuard moduleKey="attendance"><TrainingAttendancePage /></ModuleAccessGuard>} />
        <Route path="evaluations" element={<ModuleAccessGuard moduleKey="evaluations"><TrainingEvaluationsPage /></ModuleAccessGuard>} />
        <Route path="etablissements" element={<ModuleAccessGuard moduleKey="sites"><TrainingSitesPage /></ModuleAccessGuard>} />
        <Route path="commercial" element={<ModuleAccessGuard moduleKey="training_commercial"><TrainingCommercialPage /></ModuleAccessGuard>} />
        <Route path="terrain" element={<FieldTerrainArea />} />
        <Route path="planning" element={<PlanningArea />} />
        <Route path="agents" element={<AgentsArea />} />
        <Route path="agents/:agentId" element={<ModuleAccessGuard moduleKey="security_agents"><SecurityAgentDetailPage /></ModuleAccessGuard>} />
        <Route path="sites" element={<SitesArea />} />
        <Route path="facturation" element={<CleaningOrSecurityBilling />} />
        <Route path="devis" element={<ModuleAccessGuard moduleKey="security_quotes"><SecurityQuotesPage /></ModuleAccessGuard>} />
        <Route path="rondes" element={<SecurityFeatureGate feature="security_qr_patrols" requiredPlan="Essentielle" description="Créez les points de passage, imprimez leurs QR codes et contrôlez chaque ronde depuis l’espace agent."><SecurityPatrolsPage /></SecurityFeatureGate>} />
        <Route path="main-courante" element={<SecurityFeatureGate feature="security_smart_logbook" requiredPlan="Essentielle" description="Chaque vacation dispose de sa main courante structurée et de son PDF dédié."><SecurityLogbookPage /></SecurityFeatureGate>} />
        <Route path="consignes" element={<SecurityFeatureGate feature="security_site_instructions" requiredPlan="Essentielle" description="Diffusez les consignes et alertes propres à chaque site et suivez leur lecture par les agents."><SecurityInstructionsPage /></SecurityFeatureGate>} />
        <Route path="geolocalisation" element={<SecurityFeatureGate feature="security_geolocation" requiredPlan="Professionnelle" description="Visualisez la dernière position transmise par les agents pendant leurs vacations."><SecurityGeolocationPage /></SecurityFeatureGate>} />
        <Route path="pti" element={<SecurityFeatureGate feature="security_pti_sos" requiredPlan="Professionnelle" description="Activez la protection du travailleur isolé, les confirmations périodiques et le bouton SOS."><SecurityPtiPage /></SecurityFeatureGate>} />
        <Route path="supervision" element={<SecurityFeatureGate feature="security_realtime_supervision" requiredPlan="Professionnelle" description="Regroupez vacations en cours, positions GPS, PTI et urgences sur un écran de supervision."><SecuritySupervisionPage /></SecurityFeatureGate>} />
        <Route path="dossiers-vacations" element={<ModuleAccessGuard moduleKey="security_planning"><SecurityShiftDossiersPage /></ModuleAccessGuard>} />
        <Route path="portail-clients" element={<ClientPortalAdminArea />} />

        <Route path="interventions" element={<CleaningOnlyArea><ModuleAccessGuard moduleKey="cleaning_interventions"><CleaningInterventionsPage /></ModuleAccessGuard></CleaningOnlyArea>} />
        <Route path="protocoles" element={<CleaningOnlyArea><CleaningProtocolsPage /></CleaningOnlyArea>} />
        <Route path="rentabilite" element={<CleaningOnlyArea><CleaningFeatureGate feature="cleaning_profitability" requiredPlan="Professionnelle" description="Calculez la marge de chaque chantier à partir du chiffre prévu, du coût horaire réel et des consommables utilisés."><CleaningProfitabilityPage /></CleaningFeatureGate></CleaningOnlyArea>} />
        <Route path="rapports" element={<CleaningOnlyArea><CleaningFeatureGate feature="cleaning_visit_reports" requiredPlan="Essentielle" description="Créez des fiches de passage horodatées, illustrées et exportables en PDF."><CleaningReportsPage /></CleaningFeatureGate></CleaningOnlyArea>} />
        <Route path="anomalies" element={<CleaningOnlyArea><CleaningFeatureGate feature="cleaning_anomalies" requiredPlan="Professionnelle" description="Suivez les écarts terrain et les actions correctives jusqu’à leur résolution."><CleaningAnomaliesPage /></CleaningFeatureGate></CleaningOnlyArea>} />
        <Route path="qualite" element={<CleaningOnlyArea><CleaningFeatureGate feature="cleaning_quality_control" requiredPlan="Professionnelle" description="Contrôlez la qualité des prestations avec une grille de notation et un historique."><CleaningQualityPage /></CleaningFeatureGate></CleaningOnlyArea>} />
        <Route path="stocks" element={<StockArea />} />

        <Route path="carte" element={<RestaurantOnlyArea><ModuleAccessGuard moduleKey="restaurant_menu"><RestaurantMenuPage /></ModuleAccessGuard></RestaurantOnlyArea>} />
        <Route path="recettes" element={<RestaurantOnlyArea><ModuleAccessGuard moduleKey="restaurant_recipes"><RestaurantRecipesPage /></ModuleAccessGuard></RestaurantOnlyArea>} />
        <Route path="reservations" element={<RestaurantOnlyArea><ModuleAccessGuard moduleKey="restaurant_reservations"><RestaurantReservationsPage /></ModuleAccessGuard></RestaurantOnlyArea>} />
        <Route path="commandes" element={<RestaurantOnlyArea><ModuleAccessGuard moduleKey="restaurant_ordering"><RestaurantOrdersPage /></ModuleAccessGuard></RestaurantOnlyArea>} />
        <Route path="cuisine" element={<RestaurantOnlyArea><RestaurantFeatureGate feature="restaurant_kitchen_display" requiredPlan="Essentielle" description="Envoyez les commandes vers un écran Cuisine et suivez leur préparation en temps réel."><RestaurantKitchenPage /></RestaurantFeatureGate></RestaurantOnlyArea>} />
        <Route path="salle" element={<RestaurantOnlyArea><RestaurantFeatureGate feature="restaurant_floor_plan" requiredPlan="Essentielle" description="Créez les zones et tables utilisées pendant le service."><RestaurantFloorPlanPage /></RestaurantFeatureGate></RestaurantOnlyArea>} />
        <Route path="menu-qr" element={<RestaurantOnlyArea><RestaurantFeatureGate feature="restaurant_multilingual_qr_menu" requiredPlan="Essentielle" description="Diffusez votre menu en français, anglais, espagnol et italien via QR code."><RestaurantQrMenuPage /></RestaurantFeatureGate></RestaurantOnlyArea>} />
        <Route path="hygiene" element={<RestaurantOnlyArea><RestaurantFeatureGate feature="restaurant_temperatures" requiredPlan="Essentielle" description="Tracez les températures et les checklists HACCP du restaurant."><RestaurantFoodSafetyPage /></RestaurantFeatureGate></RestaurantOnlyArea>} />
        <Route path="rendez-vous" element={<ModuleAccessGuard moduleKey="appointments"><AppointmentsPage /></ModuleAccessGuard>} />
        <Route path="clients" element={<ClientsArea />} />
        <Route path="prestations" element={<ModuleAccessGuard moduleKey="services"><ServicesPage /></ModuleAccessGuard>} />
        <Route path="fidelite" element={<LoyaltyPage />} />
        <Route path="equipe" element={<StaffArea />} />
        <Route path="acces-equipe" element={<TeamAccessArea />} />
        <Route path="personnalisation" element={<BrandingArea />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="assistance" element={<SupportPage />} />
        <Route path="demarrage" element={<SaasLaunchCenterArea />} />
        <Route path="abonnement" element={<SubscriptionPage />} />
        <Route path="offre-metier" element={<MetierWorkspacePage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="*" element={<ModulePage />} />
      </Route>
      </Routes>
    </Suspense>
  );
}