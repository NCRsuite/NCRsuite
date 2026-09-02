import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { runsAsInstalledPwa } from '../features/notifications/pushNotifications';
import './ClientPortalInstallGuide.css';

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

let deferredInstallPrompt: DeferredInstallPrompt | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as DeferredInstallPrompt;
    window.dispatchEvent(new CustomEvent('ncr:pwa-install-ready'));
  });
}

const CLIENT_PORTAL_PATHS = [
  '/espace-formation',
  '/espace-securite',
  '/espace-nettoyage',
  '/espace-client-coiffure',
];

const DISMISS_KEY = 'ncr-client-portal-install-guide-dismissed-until';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 900px)').matches
    || window.matchMedia('(pointer: coarse)').matches;
}

function isAppleMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function ClientPortalInstallGuide() {
  const { user } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(() => deferredInstallPrompt);
  const isPortal = useMemo(
    () => CLIENT_PORTAL_PATHS.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`)),
    [location.pathname]
  );
  const apple = isAppleMobile();

  useEffect(() => {
    const syncPrompt = () => setInstallPrompt(deferredInstallPrompt);
    window.addEventListener('ncr:pwa-install-ready', syncPrompt);
    return () => window.removeEventListener('ncr:pwa-install-ready', syncPrompt);
  }, []);

  useEffect(() => {
    if (!user || !isPortal || !isMobileDevice() || runsAsInstalledPwa()) {
      setVisible(false);
      return;
    }
    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedUntil > Date.now()) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, [user?.id, isPortal, location.pathname]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    setVisible(false);
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      deferredInstallPrompt = null;
      setInstallPrompt(null);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <aside className="ncr-client-install-guide" role="dialog" aria-label="Installer NCR Suite">
      <div className="ncr-client-install-guide__handle" aria-hidden="true" />
      <button className="ncr-client-install-guide__close" type="button" onClick={dismiss} aria-label="Fermer">×</button>
      <div className="ncr-client-install-guide__brand"><img src="/brand/ncr-suite-icon.png" alt="" /><span>APPLICATION NCR SUITE</span></div>
      <h2>Accède à ton espace en un geste</h2>
      <p>Ajoute NCR Suite à l’écran d’accueil de ton téléphone. Tu retrouveras ton espace comme une application, sans passer par le navigateur.</p>

      {apple ? (
        <ol className="ncr-client-install-guide__steps">
          <li><b>1</b><span>Touche le bouton <strong>Partager</strong> de Safari.</span></li>
          <li><b>2</b><span>Choisis <strong>Sur l’écran d’accueil</strong>.</span></li>
          <li><b>3</b><span>Appuie sur <strong>Ajouter</strong>.</span></li>
        </ol>
      ) : installPrompt ? (
        <button className="ncr-client-install-guide__install" type="button" onClick={() => void install()}>Installer NCR Suite</button>
      ) : (
        <ol className="ncr-client-install-guide__steps">
          <li><b>1</b><span>Ouvre le menu <strong>⋮</strong> de ton navigateur.</span></li>
          <li><b>2</b><span>Choisis <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</span></li>
        </ol>
      )}

      <button className="ncr-client-install-guide__later" type="button" onClick={dismiss}>Plus tard</button>
    </aside>
  );
}
