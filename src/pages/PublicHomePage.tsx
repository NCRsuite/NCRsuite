import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageMetadata } from '../components/PageMetadata';
import { publicHomeModuleUrl } from '../components/public-home/moduleUrl';

type PublicHomeComponent = React.ComponentType<{ navigate: (path: string) => void }>;
type PublicHomeRuntime = { PublicHome: PublicHomeComponent };
const bridgeKey = Symbol.for('ncr.public-home.react');

export function PublicHomePage() {
  const [Component, setComponent] = useState<PublicHomeComponent | null>(null);
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let cancelled = false;
    const bridge = { React, jsx };
    const bridgeHost = globalThis as unknown as Record<symbol, unknown>;
    bridgeHost[bridgeKey] = bridge;
    setState('loading');
    // Keep the historic SaaS bundle and PWA shell unchanged. Only this public page
    // requests the separately built, versioned marketing module.
    void import(/* @vite-ignore */ publicHomeModuleUrl).then((runtime: PublicHomeRuntime) => {
      if (cancelled) return;
      setComponent(() => runtime.PublicHome);
      setState('ready');
    }).catch(() => { if (!cancelled) setState('error'); }).finally(() => {
      if (bridgeHost[bridgeKey] === bridge) delete bridgeHost[bridgeKey];
    });
    return () => { cancelled = true; };
  }, [navigate]);
  return <>
    <PageMetadata title="NCR Suite — Une plateforme, cinq expériences métier" description="Formation, sécurité privée, nettoyage, restauration, coiffure et beauté : une plateforme de gestion commune, des outils adaptés à votre activité." path="/" image="/og/ncr-suite-og-v2221.webp" index />
    {state !== 'ready' && <main aria-busy={state === 'loading'}>
      <h1>NCR Suite — Une plateforme, cinq expériences métier</h1>
      <p>Formation, Sécurité privée, Nettoyage, Restauration, Coiffure &amp; Beauté.</p>
      <p>Un socle commun pour vos clients, équipes, plannings et documents.</p>
      <Link to="/connexion">Connexion</Link>{' · '}<Link to="/demande-acces?essai=7">Essai gratuit de 7 jours</Link>
      {state === 'error' && <p role="status">La présentation immersive n’a pas pu se charger. Les accès ci-dessus restent disponibles.</p>}
    </main>}
    <div id="ncr-public-home" className="ncr-public-home">{Component && <Component navigate={navigate} />}</div>
  </>;
}
