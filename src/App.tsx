import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ModuleAccessGuard } from './components/ModuleAccessGuard';
import { SecurityFeatureGate } from './components/SecurityFeatureGate';
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
import { TrainingEvaluationsPage } from './pages/TrainingEvaluationsPage';
import { TrainingSitesPage } from './pages/TrainingSitesPage';
import { PublicTrainingSatisfactionPage } from './pages/PublicTrainingSatisfactionPage';
import { SecurityClientsPage } from './pages/SecurityClientsPage';
import { SecurityAgentsPage } from './pages/SecurityAgentsPage';
import { SecurityAgentDetailPage } from './pages/SecurityAgentDetailPage';
import { SecuritySitesPage } from './pages/SecuritySitesPage';
import { SecurityPlanningPage } from './pages/SecurityPlanningPage';
import { SecurityBillingPage } from './pages/SecurityBillingPage';
import { SecurityPatrolsPage } from './pages/SecurityPatrolsPage';
import { SecurityLogbookPage } from './pages/SecurityLogbookPage';
import { SecurityInstructionsPage } from './pages/SecurityInstructionsPage';
import { SecurityAgentPortalPage } from './pages/SecurityAgentPortalPage';
import { SecurityGeolocationPage } from './pages/SecurityGeolocationPage';
import { SecurityPtiPage } from './pages/SecurityPtiPage';
import { SecuritySupervisionPage } from './pages/SecuritySupervisionPage';
import { SecurityShiftDossiersPage } from './pages/SecurityShiftDossiersPage';
import { SecurityQuotesPage } from './pages/SecurityQuotesPage';
import { NotificationsPage } from './pages/NotificationsPage';

import { CleaningClientsPage } from './pages/CleaningClientsPage';
import { CleaningSitesPage } from './pages/CleaningSitesPage';
import { CleaningAgentsPage } from './pages/CleaningAgentsPage';
import { CleaningPlanningPage } from './pages/CleaningPlanningPage';
import { CleaningAgentPortalPage } from './pages/CleaningAgentPortalPage';
import { CleaningInterventionsPage } from './pages/CleaningInterventionsPage';
import { CleaningReportsPage } from './pages/CleaningReportsPage';
import { CleaningAnomaliesPage } from './pages/CleaningAnomaliesPage';
import { CleaningQualityPage } from './pages/CleaningQualityPage';
import { CleaningStockPage } from './pages/CleaningStockPage';
import { CleaningBillingPage } from './pages/CleaningBillingPage';
import { CleaningProtocolsPage } from './pages/CleaningProtocolsPage';
import { CleaningProfitabilityPage } from './pages/CleaningProfitabilityPage';
import { CleaningFeatureGate } from './components/CleaningFeatureGate';
import { organizationCanAccessPath } from './config/moduleAccess';
import { RestaurantEmployeesPage } from './pages/RestaurantEmployeesPage';
import { RestaurantPlanningPage } from './pages/RestaurantPlanningPage';
import { RestaurantEmployeePortalPage } from './pages/RestaurantEmployeePortalPage';
import { RestaurantMenuPage } from './pages/RestaurantMenuPage';
import { RestaurantReservationsPage } from './pages/RestaurantReservationsPage';
import { RestaurantOrdersPage } from './pages/RestaurantOrdersPage';
import { RestaurantKitchenPage } from './pages/RestaurantKitchenPage';
import { RestaurantFloorPlanPage } from './pages/RestaurantFloorPlanPage';
import { RestaurantQrMenuPage } from './pages/RestaurantQrMenuPage';
import { RestaurantFoodSafetyPage } from './pages/RestaurantFoodSafetyPage';
import { RestaurantStockPage } from './pages/RestaurantStockPage';
import { PublicRestaurantMenuPage } from './pages/PublicRestaurantMenuPage';
import { PublicRestaurantBookingPage } from './pages/PublicRestaurantBookingPage';
import { RestaurantFeatureGate } from './components/RestaurantFeatureGate';



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
  return <ModuleAccessGuard moduleKey="security_billing"><SecurityBillingPage /></ModuleAccessGuard>;
}

function FieldTerrainArea() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'nettoyage') {
    return <CleaningFeatureGate feature="cleaning_agent_portal" requiredPlan="Essentielle" description="Donnez aux agents un espace terrain avec planning, consignes, pointage et preuves photo."><CleaningAgentPortalPage /></CleaningFeatureGate>;
  }
  if (organization?.business_type === 'restauration') {
    return <RestaurantFeatureGate feature="restaurant_employee_portal" requiredPlan="Essentielle" description="Donnez aux employés un espace personnel avec planning, réservations, carte et outils d’hygiène."><RestaurantEmployeePortalPage /></RestaurantFeatureGate>;
  }
  return <ModuleAccessGuard moduleKey="security_agent_portal"><SecurityAgentPortalPage /></ModuleAccessGuard>;
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
      <Route path="/evaluation/:token" element={<PublicTrainingSatisfactionPage />} />
      <Route path="/r/:slug/menu" element={<PublicRestaurantMenuPage />} />
      <Route path="/r/:slug/reserver" element={<PublicRestaurantBookingPage />} />
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

        <Route path="interventions" element={<CleaningOnlyArea><ModuleAccessGuard moduleKey="cleaning_interventions"><CleaningInterventionsPage /></ModuleAccessGuard></CleaningOnlyArea>} />
        <Route path="protocoles" element={<CleaningOnlyArea><CleaningProtocolsPage /></CleaningOnlyArea>} />
        <Route path="rentabilite" element={<CleaningOnlyArea><CleaningFeatureGate feature="cleaning_profitability" requiredPlan="Professionnelle" description="Calculez la marge de chaque chantier à partir du chiffre prévu, du coût horaire réel et des consommables utilisés."><CleaningProfitabilityPage /></CleaningFeatureGate></CleaningOnlyArea>} />
        <Route path="rapports" element={<CleaningOnlyArea><CleaningFeatureGate feature="cleaning_visit_reports" requiredPlan="Essentielle" description="Créez des fiches de passage horodatées, illustrées et exportables en PDF."><CleaningReportsPage /></CleaningFeatureGate></CleaningOnlyArea>} />
        <Route path="anomalies" element={<CleaningOnlyArea><CleaningFeatureGate feature="cleaning_anomalies" requiredPlan="Professionnelle" description="Suivez les écarts terrain et les actions correctives jusqu’à leur résolution."><CleaningAnomaliesPage /></CleaningFeatureGate></CleaningOnlyArea>} />
        <Route path="qualite" element={<CleaningOnlyArea><CleaningFeatureGate feature="cleaning_quality_control" requiredPlan="Professionnelle" description="Contrôlez la qualité des prestations avec une grille de notation et un historique."><CleaningQualityPage /></CleaningFeatureGate></CleaningOnlyArea>} />
        <Route path="stocks" element={<StockArea />} />

        <Route path="carte" element={<RestaurantOnlyArea><ModuleAccessGuard moduleKey="restaurant_menu"><RestaurantMenuPage /></ModuleAccessGuard></RestaurantOnlyArea>} />
        <Route path="reservations" element={<RestaurantOnlyArea><ModuleAccessGuard moduleKey="restaurant_reservations"><RestaurantReservationsPage /></ModuleAccessGuard></RestaurantOnlyArea>} />
        <Route path="commandes" element={<RestaurantOnlyArea><ModuleAccessGuard moduleKey="restaurant_ordering"><RestaurantOrdersPage /></ModuleAccessGuard></RestaurantOnlyArea>} />
        <Route path="cuisine" element={<RestaurantOnlyArea><RestaurantFeatureGate feature="restaurant_kitchen_display" requiredPlan="Essentielle" description="Envoyez les commandes vers un écran Cuisine et suivez leur préparation en temps réel."><RestaurantKitchenPage /></RestaurantFeatureGate></RestaurantOnlyArea>} />
        <Route path="salle" element={<RestaurantOnlyArea><RestaurantFeatureGate feature="restaurant_floor_plan" requiredPlan="Essentielle" description="Créez les zones et tables utilisées pendant le service."><RestaurantFloorPlanPage /></RestaurantFeatureGate></RestaurantOnlyArea>} />
        <Route path="menu-qr" element={<RestaurantOnlyArea><RestaurantFeatureGate feature="restaurant_multilingual_qr_menu" requiredPlan="Essentielle" description="Diffusez votre menu en français, anglais, espagnol et italien via QR code."><RestaurantQrMenuPage /></RestaurantFeatureGate></RestaurantOnlyArea>} />
        <Route path="hygiene" element={<RestaurantOnlyArea><RestaurantFeatureGate feature="restaurant_temperatures" requiredPlan="Essentielle" description="Tracez les températures et les checklists HACCP du restaurant."><RestaurantFoodSafetyPage /></RestaurantFeatureGate></RestaurantOnlyArea>} />
        <Route path="rendez-vous" element={<ModuleAccessGuard moduleKey="appointments"><AppointmentsPage /></ModuleAccessGuard>} />
        <Route path="clients" element={<ClientsArea />} />
        <Route path="prestations" element={<ModuleAccessGuard moduleKey="services"><ServicesPage /></ModuleAccessGuard>} />
        <Route path="equipe" element={<StaffArea />} />
        <Route path="acces-equipe" element={<TeamAccessArea />} />
        <Route path="personnalisation" element={<BrandingArea />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="abonnement" element={<SubscriptionPage />} />
        <Route path="offre-metier" element={<MetierWorkspacePage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="*" element={<ModulePage />} />
      </Route>
    </Routes>
  );
}
