import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ConnectivityStatus } from './components/ConnectivityStatus';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { PlatformAdminProvider } from './contexts/PlatformAdminContext';
import './styles.css';

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
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PlatformAdminProvider>
            <OrganizationProvider>
              <ConnectivityStatus />
              <App />
            </OrganizationProvider>
          </PlatformAdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
