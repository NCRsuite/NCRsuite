import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ClientPortalConfigurationGuard } from './components/ClientPortalLanding';
import { ClientPortalInstallGuide } from './components/ClientPortalInstallGuide';
import { ConnectivityStatus } from './components/ConnectivityStatus';
import { EnterpriseOnboardingGuard } from './components/EnterpriseOnboardingGuard';
import { MetierRuntimeBranding } from './components/MetierRuntimeBranding';
import { RuntimeMonitor } from './components/RuntimeMonitor';
import { NCR_UI_2026_DATA_ATTRIBUTE, NCR_UI_2026_ENABLED } from './config/ui2026';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { PlatformAdminProvider } from './contexts/PlatformAdminContext';
import './ncrUi2026.css';
import './ncrUi2026Pages.css';
import './ncrUi2026TrainingDashboard.css';
import './ncrUi2026TrainingOperations.css';
import './ncrUi2026TrainingSpacing.css';
import './ncrUi2026TrainingWorkflowStepper.css';
import './ncrUi2026TrainingSessions.css';
import './ncrUi2026TrainingSessionsSummary.css';
import './ncrUi2026TrainingMobileFixes.css';
import './ncrUi2026TrainingMobilePolish.css';
import './ncrUi2026TrainingPersonalWork.css';
import './ncrUi2026TrainingCommercialBilling.css';
import './ncrUi2026TrainingPeopleQuality.css';
import './ncrUi2026TrainingGovernance.css';
import './trainingDossierContrastFix.css';
import './ncrUi2026TrainingGovernancePolish.css';
import './ncrUi2026TrainingDashboardMotion.css';
import './ncrUi2026TrainingDashboardInteractive.css';
import './ncrUi2026TrainingDashboardSmart.css';
import './ncrUi2026TrainingDashboardSmartPolish.css';
import './ncrUi2026TrainingDashboardClock.css';
import './ncrUi2026TrainingSettings.css';
import './ncrUi2026TrainingVisualFixes.css';
import './ncrUi2026TrainingSidebarPolish.css';
import './ncrUi2026BusinessAssistanceContrast.css';
import './ncrUi2026WorkspaceSwitcherPolish.css';
import './ncrUi2026WorkspaceContextPolish.css';
import './ncrUi2026WorkspaceContextMicroPolish.css';
import './ncrUi2026ClientPortalBranding.css';

document.documentElement.setAttribute(NCR_UI_2026_DATA_ATTRIBUTE, NCR_UI_2026_ENABLED ? 'true' : 'false');

function announceServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
  window.dispatchEvent(new CustomEvent('ncr:sw-update', { detail: { registration } }));
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) announceServiceWorkerUpdate(registration);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            announceServiceWorkerUpdate(registration);
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }).catch((error) => console.error('Service Worker NCR Suite indisponible.', error));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClientPortalInstallGuide />
        <PlatformAdminProvider>
          <OrganizationProvider>
            <MetierRuntimeBranding />
            <RuntimeMonitor />
            <ConnectivityStatus />
            <ClientPortalConfigurationGuard>
              <EnterpriseOnboardingGuard>
                <AppErrorBoundary>
                  <App />
                </AppErrorBoundary>
              </EnterpriseOnboardingGuard>
            </ClientPortalConfigurationGuard>
          </OrganizationProvider>
        </PlatformAdminProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
