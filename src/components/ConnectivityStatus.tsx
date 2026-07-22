import { useEffect, useState } from 'react';

type UpdateDetail = { registration?: ServiceWorkerRegistration };

export function ConnectivityStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UpdateDetail>).detail;
      if (detail?.registration) setRegistration(detail.registration);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('ncr:sw-update', handleUpdate);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('ncr:sw-update', handleUpdate);
    };
  }, []);

  async function applyUpdate() {
    setReloading(true);
    const waiting = registration?.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      window.setTimeout(() => window.location.reload(), 1200);
      return;
    }
    window.location.reload();
  }

  if (!online) {
    return <div className="connectivity-banner offline" role="status"><strong>Hors connexion</strong><span>Les informations déjà chargées restent accessibles. Les nouvelles actions seront possibles au retour du réseau.</span></div>;
  }

  if (registration) {
    return <div className="connectivity-banner update" role="status"><strong>Nouvelle version disponible</strong><span>Actualise NCR Suite pour charger les derniers correctifs.</span><button type="button" onClick={() => void applyUpdate()} disabled={reloading}>{reloading ? 'Actualisation…' : 'Actualiser'}</button></div>;
  }

  return null;
}
